const { pool, query } = require("../../config/db");

const lowStockSelect = `
  pv.id AS variant_id,
  pv.product_id,
  pv.sku,
  pv.color,
  pv.size,
  pv.material,
  pv.inventory_quantity,
  pv.low_stock_threshold,
  pv.is_active AS variant_is_active,
  p.name AS product_name,
  p.slug AS product_slug,
  p.is_active AS product_is_active
`;

const expireStaleReservations = async () => {
  await query(
    `
      UPDATE inventory_reservations
      SET status = 'expired', released_at = NOW()
      WHERE status = 'active' AND expires_at <= NOW();
    `,
  );
};

const getReservedByOtherUsers = async (variantId, userId, client = null) => {
  const executor = client || { query };
  const { rows } = await executor.query(
    `
      SELECT COALESCE(SUM(quantity), 0)::int AS reserved_quantity
      FROM inventory_reservations
      WHERE variant_id = $1
        AND status = 'active'
        AND expires_at > NOW()
        AND user_id != $2;
    `,
    [variantId, userId],
  );

  return rows[0]?.reserved_quantity || 0;
};

const getCartItemsForReservation = async (userId, client) => {
  const { rows } = await client.query(
    `
      SELECT
        ci.id AS cart_item_id,
        ci.cart_id,
        ci.variant_id,
        ci.quantity,
        pv.sku,
        pv.inventory_quantity,
        pv.is_active AS variant_is_active,
        p.is_active AS product_is_active
      FROM carts c
      INNER JOIN cart_items ci ON ci.cart_id = c.id
      INNER JOIN product_variants pv ON pv.id = ci.variant_id
      INNER JOIN products p ON p.id = ci.product_id
      WHERE c.user_id = $1
      ORDER BY ci.id ASC
      FOR UPDATE OF ci, pv;
    `,
    [userId],
  );

  return rows;
};

const reserveCartForCheckout = async (userId, holdMinutes = 15) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await expireStaleReservations();

    const cartItems = await getCartItemsForReservation(userId, client);
    if (cartItems.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    for (const item of cartItems) {
      if (!item.product_is_active || !item.variant_is_active) {
        const error = new Error("One or more cart items are no longer available");
        error.status = 400;
        throw error;
      }

      const reservedByOthers = await getReservedByOtherUsers(item.variant_id, userId, client);
      const available = item.inventory_quantity - reservedByOthers;
      if (available < item.quantity) {
        const error = new Error(`Only ${Math.max(available, 0)} item(s) are available for SKU ${item.sku}`);
        error.status = 400;
        throw error;
      }
    }

    await client.query(
      `
        UPDATE inventory_reservations
        SET status = 'released', released_at = NOW()
        WHERE user_id = $1 AND status = 'active';
      `,
      [userId],
    );

    const expiresAt = new Date(Date.now() + holdMinutes * 60 * 1000);
    const reservations = [];

    for (const item of cartItems) {
      const { rows: [reservation] } = await client.query(
        `
          INSERT INTO inventory_reservations (
            user_id,
            variant_id,
            quantity,
            status,
            expires_at
          )
          VALUES ($1,$2,$3,'active',$4)
          RETURNING id, user_id, variant_id, quantity, status, expires_at, created_at;
        `,
        [userId, item.variant_id, item.quantity, expiresAt],
      );

      reservations.push(reservation);
    }

    await client.query("COMMIT");
    return {
      expires_at: expiresAt,
      reservations,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const listLowStockVariants = async (threshold = null) => {
  await expireStaleReservations();
  const { rows } = await query(
    `
      SELECT
        ${lowStockSelect},
        COALESCE(active_reservations.reserved_quantity, 0)::int AS reserved_quantity
      FROM product_variants pv
      INNER JOIN products p ON p.id = pv.product_id
      LEFT JOIN (
        SELECT
          variant_id,
          SUM(quantity)::int AS reserved_quantity
        FROM inventory_reservations
        WHERE status = 'active'
          AND expires_at > NOW()
        GROUP BY variant_id
      ) active_reservations ON active_reservations.variant_id = pv.id
      WHERE pv.is_active = TRUE
        AND p.is_active = TRUE
        AND pv.inventory_quantity <= COALESCE($1::int, pv.low_stock_threshold)
      ORDER BY pv.inventory_quantity ASC, p.name ASC, pv.id ASC;
    `,
    [threshold],
  );

  return rows.map((row) => ({
    variant_id: row.variant_id,
    product_id: row.product_id,
    product_name: row.product_name,
    product_slug: row.product_slug,
    sku: row.sku,
    color: row.color,
    size: row.size,
    material: row.material,
    inventory_quantity: row.inventory_quantity,
    reserved_quantity: row.reserved_quantity,
    available_quantity: row.inventory_quantity - row.reserved_quantity,
    low_stock_threshold: row.low_stock_threshold,
  }));
};

module.exports = {
  expireStaleReservations,
  reserveCartForCheckout,
  listLowStockVariants,
};
