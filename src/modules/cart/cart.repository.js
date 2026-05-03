const { pool, query } = require("../../config/db");

const cartItemSelect = `
  ci.id AS cart_item_id,
  ci.cart_id,
  ci.product_id,
  ci.variant_id,
  ci.quantity,
  ci.created_at AS cart_item_created_at,
  ci.updated_at AS cart_item_updated_at,
  p.name AS product_name,
  p.slug AS product_slug,
  p.is_active AS product_is_active,
  p.base_price,
  pv.sku,
  pv.color,
  pv.size,
  pv.material,
  pv.price AS variant_price,
  pv.compare_at_price,
  pv.inventory_quantity,
  pv.is_active AS variant_is_active,
  img.image_url,
  img.alt_text
`;

const mapCartItem = (row) => {
  const unitPrice = Number(row.variant_price);

  return {
    id: row.cart_item_id,
    cart_id: row.cart_id,
    product_id: row.product_id,
    variant_id: row.variant_id,
    quantity: row.quantity,
    unit_price: unitPrice,
    line_total: unitPrice * row.quantity,
    product: {
      id: row.product_id,
      name: row.product_name,
      slug: row.product_slug,
      is_active: row.product_is_active,
      base_price: Number(row.base_price),
    },
    variant: {
      id: row.variant_id,
      sku: row.sku,
      color: row.color,
      size: row.size,
      material: row.material,
      price: unitPrice,
      compare_at_price: row.compare_at_price === null ? null : Number(row.compare_at_price),
      inventory_quantity: row.inventory_quantity,
      is_active: row.variant_is_active,
    },
    image: row.image_url
      ? {
          image_url: row.image_url,
          alt_text: row.alt_text,
        }
      : null,
    created_at: row.cart_item_created_at,
    updated_at: row.cart_item_updated_at,
  };
};

const mapCart = (cart, rows) => {
  const items = rows.map(mapCartItem);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);

  return {
    id: cart.id,
    user_id: cart.user_id,
    items,
    summary: {
      unique_items: items.length,
      item_count: itemCount,
      subtotal,
    },
    created_at: cart.created_at,
    updated_at: cart.updated_at,
  };
};

const findOrCreateCartByUserId = async (userId, client = null) => {
  const executor = client || { query };
  const { rows } = await executor.query(
    `
      INSERT INTO carts (user_id)
      VALUES ($1)
      ON CONFLICT (user_id) DO NOTHING
      RETURNING id, user_id, created_at, updated_at;
    `,
    [userId],
  );

  if (rows[0]) {
    return rows[0];
  }

  const existing = await executor.query(
    `
      SELECT id, user_id, created_at, updated_at
      FROM carts
      WHERE user_id = $1;
    `,
    [userId],
  );

  return existing.rows[0];
};

const getCartByUserId = async (userId) => {
  const cart = await findOrCreateCartByUserId(userId);
  const { rows } = await query(
    `
      SELECT
        ${cartItemSelect}
      FROM cart_items ci
      INNER JOIN products p ON p.id = ci.product_id
      INNER JOIN product_variants pv ON pv.id = ci.variant_id
      LEFT JOIN LATERAL (
        SELECT image_url, alt_text
        FROM product_images
        WHERE product_id = ci.product_id
          AND (variant_id = ci.variant_id OR variant_id IS NULL)
        ORDER BY
          CASE WHEN variant_id = ci.variant_id THEN 0 ELSE 1 END,
          sort_order ASC,
          id ASC
        LIMIT 1
      ) img ON TRUE
      WHERE ci.cart_id = $1
      ORDER BY ci.created_at DESC;
    `,
    [cart.id],
  );

  return mapCart(cart, rows);
};

const findVariantForCart = async (variantId) => {
  const { rows } = await query(
    `
      SELECT
        pv.id,
        pv.product_id,
        pv.sku,
        pv.price,
        pv.inventory_quantity,
        pv.is_active AS variant_is_active,
        p.name AS product_name,
        p.slug AS product_slug,
        p.is_active AS product_is_active
      FROM product_variants pv
      INNER JOIN products p ON p.id = pv.product_id
      WHERE pv.id = $1;
    `,
    [variantId],
  );

  return rows[0] || null;
};

const findCartItemById = async (userId, cartItemId) => {
  const { rows } = await query(
    `
      SELECT
        ci.id,
        ci.cart_id,
        ci.product_id,
        ci.variant_id,
        ci.quantity
      FROM cart_items ci
      INNER JOIN carts c ON c.id = ci.cart_id
      WHERE c.user_id = $1 AND ci.id = $2;
    `,
    [userId, cartItemId],
  );

  return rows[0] || null;
};

const addItemToCart = async (userId, variant, quantity) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const cart = await findOrCreateCartByUserId(userId, client);
    const { rows } = await client.query(
      `
        INSERT INTO cart_items (cart_id, product_id, variant_id, quantity)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (cart_id, variant_id) DO UPDATE
        SET quantity = cart_items.quantity + EXCLUDED.quantity
        RETURNING id, cart_id, product_id, variant_id, quantity;
      `,
      [cart.id, variant.product_id, variant.id, quantity],
    );

    await client.query("COMMIT");
    return rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const updateCartItemQuantity = async (userId, cartItemId, quantity) => {
  const { rows } = await query(
    `
      UPDATE cart_items ci
      SET quantity = $3
      FROM carts c
      WHERE ci.cart_id = c.id
        AND c.user_id = $1
        AND ci.id = $2
      RETURNING ci.id, ci.cart_id, ci.product_id, ci.variant_id, ci.quantity;
    `,
    [userId, cartItemId, quantity],
  );

  return rows[0] || null;
};

const deleteCartItem = async (userId, cartItemId) => {
  const { rows } = await query(
    `
      DELETE FROM cart_items ci
      USING carts c
      WHERE ci.cart_id = c.id
        AND c.user_id = $1
        AND ci.id = $2
      RETURNING ci.id;
    `,
    [userId, cartItemId],
  );

  return rows[0] || null;
};

const clearCart = async (userId) => {
  const { rows } = await query(
    `
      DELETE FROM cart_items ci
      USING carts c
      WHERE ci.cart_id = c.id
        AND c.user_id = $1
      RETURNING ci.id;
    `,
    [userId],
  );

  return rows.length;
};

module.exports = {
  getCartByUserId,
  findVariantForCart,
  findCartItemById,
  addItemToCart,
  updateCartItemQuantity,
  deleteCartItem,
  clearCart,
};
