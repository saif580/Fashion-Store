const crypto = require("crypto");
const { pool, query } = require("../../config/db");

const orderSelectColumns = `
  o.id,
  o.user_id,
  o.order_number,
  o.status,
  o.subtotal,
  o.shipping_full_name,
  o.shipping_phone,
  o.shipping_address_line_1,
  o.shipping_address_line_2,
  o.shipping_city,
  o.shipping_state,
  o.shipping_postal_code,
  o.shipping_country,
  o.placed_at,
  o.created_at,
  o.updated_at
`;

const orderReturningColumns = `
  id,
  user_id,
  order_number,
  status,
  subtotal,
  shipping_full_name,
  shipping_phone,
  shipping_address_line_1,
  shipping_address_line_2,
  shipping_city,
  shipping_state,
  shipping_postal_code,
  shipping_country,
  placed_at,
  created_at,
  updated_at
`;

const orderItemColumns = `
  oi.id,
  oi.order_id,
  oi.product_id,
  oi.variant_id,
  oi.product_name,
  oi.product_slug,
  oi.variant_sku,
  oi.variant_color,
  oi.variant_size,
  oi.variant_material,
  oi.quantity,
  oi.unit_price,
  oi.line_total,
  oi.created_at
`;

const mapOrderItems = (rows) =>
  rows.map((row) => ({
    id: row.id,
    order_id: row.order_id,
    product_id: row.product_id,
    variant_id: row.variant_id,
    product_name: row.product_name,
    product_slug: row.product_slug,
    variant_sku: row.variant_sku,
    variant_color: row.variant_color,
    variant_size: row.variant_size,
    variant_material: row.variant_material,
    quantity: row.quantity,
    unit_price: Number(row.unit_price),
    line_total: Number(row.line_total),
    created_at: row.created_at,
  }));

const hydrateOrders = async (orders) => {
  if (orders.length === 0) {
    return [];
  }

  const orderIds = orders.map((order) => order.id);
  const { rows } = await query(
    `
      SELECT ${orderItemColumns}
      FROM order_items oi
      WHERE oi.order_id = ANY($1::int[])
      ORDER BY oi.id ASC;
    `,
    [orderIds],
  );

  return orders.map((order) => {
    const items = mapOrderItems(rows.filter((row) => row.order_id === order.id));
    return {
      id: order.id,
      user_id: order.user_id,
      order_number: order.order_number,
      status: order.status,
      subtotal: Number(order.subtotal),
      shipping_address: {
        full_name: order.shipping_full_name,
        phone: order.shipping_phone,
        address_line_1: order.shipping_address_line_1,
        address_line_2: order.shipping_address_line_2,
        city: order.shipping_city,
        state: order.shipping_state,
        postal_code: order.shipping_postal_code,
        country: order.shipping_country,
      },
      items,
      placed_at: order.placed_at,
      created_at: order.created_at,
      updated_at: order.updated_at,
    };
  });
};

const getCartItemsForCheckout = async (userId, client) => {
  const { rows } = await client.query(
    `
      SELECT
        ci.id AS cart_item_id,
        ci.cart_id,
        ci.product_id,
        ci.variant_id,
        ci.quantity,
        p.name AS product_name,
        p.slug AS product_slug,
        p.is_active AS product_is_active,
        pv.sku,
        pv.color,
        pv.size,
        pv.material,
        pv.price,
        pv.inventory_quantity,
        pv.is_active AS variant_is_active
      FROM carts c
      INNER JOIN cart_items ci ON ci.cart_id = c.id
      INNER JOIN products p ON p.id = ci.product_id
      INNER JOIN product_variants pv ON pv.id = ci.variant_id
      WHERE c.user_id = $1
      ORDER BY ci.id ASC
      FOR UPDATE OF ci, pv;
    `,
    [userId],
  );

  return rows;
};

const generateOrderNumber = () => `ORD-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

const createOrderFromCart = async ({ userId, shippingAddress }) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const cartItems = await getCartItemsForCheckout(userId, client);
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

      if (item.inventory_quantity < item.quantity) {
        const error = new Error(`Only ${item.inventory_quantity} item(s) are available for SKU ${item.sku}`);
        error.status = 400;
        throw error;
      }
    }

    const subtotal = cartItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
    const orderNumber = generateOrderNumber();

    const { rows: [order] } = await client.query(
      `
        INSERT INTO orders (
          user_id,
          order_number,
          status,
          subtotal,
          shipping_full_name,
          shipping_phone,
          shipping_address_line_1,
          shipping_address_line_2,
          shipping_city,
          shipping_state,
          shipping_postal_code,
          shipping_country
        )
        VALUES ($1,$2,'pending',$3,$4,$5,$6,$7,$8,$9,$10,$11)
        RETURNING ${orderReturningColumns};
      `,
      [
        userId,
        orderNumber,
        subtotal,
        shippingAddress.full_name,
        shippingAddress.phone,
        shippingAddress.address_line_1,
        shippingAddress.address_line_2,
        shippingAddress.city,
        shippingAddress.state,
        shippingAddress.postal_code,
        shippingAddress.country,
      ],
    );

    for (const item of cartItems) {
      const unitPrice = Number(item.price);
      const lineTotal = unitPrice * item.quantity;

      await client.query(
        `
          INSERT INTO order_items (
            order_id,
            product_id,
            variant_id,
            product_name,
            product_slug,
            variant_sku,
            variant_color,
            variant_size,
            variant_material,
            quantity,
            unit_price,
            line_total
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12);
        `,
        [
          order.id,
          item.product_id,
          item.variant_id,
          item.product_name,
          item.product_slug,
          item.sku,
          item.color,
          item.size,
          item.material,
          item.quantity,
          unitPrice,
          lineTotal,
        ],
      );

      await client.query(
        `
          UPDATE product_variants
          SET inventory_quantity = inventory_quantity - $2
          WHERE id = $1;
        `,
        [item.variant_id, item.quantity],
      );
    }

    await client.query(
      `
        DELETE FROM cart_items
        WHERE cart_id IN (
          SELECT id FROM carts WHERE user_id = $1
        );
      `,
      [userId],
    );

    await client.query("COMMIT");
    return order.id;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const listOrdersByUserId = async (userId) => {
  const { rows } = await query(
    `
      SELECT ${orderSelectColumns}
      FROM orders o
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC;
    `,
    [userId],
  );

  return hydrateOrders(rows);
};

const findOrderById = async (orderId) => {
  const { rows } = await query(
    `
      SELECT ${orderSelectColumns}
      FROM orders o
      WHERE o.id = $1;
    `,
    [orderId],
  );

  if (!rows[0]) {
    return null;
  }

  const [order] = await hydrateOrders(rows);
  return order;
};

const findOrderByIdForUser = async (userId, orderId) => {
  const { rows } = await query(
    `
      SELECT ${orderSelectColumns}
      FROM orders o
      WHERE o.user_id = $1 AND o.id = $2;
    `,
    [userId, orderId],
  );

  if (!rows[0]) {
    return null;
  }

  const [order] = await hydrateOrders(rows);
  return order;
};

const updateOrderStatus = async (orderId, status) => {
  const { rows } = await query(
    `
      UPDATE orders
      SET status = $2
      WHERE id = $1
      RETURNING ${orderReturningColumns};
    `,
    [orderId, status],
  );

  if (!rows[0]) {
    return null;
  }

  const [order] = await hydrateOrders(rows);
  return order;
};

module.exports = {
  createOrderFromCart,
  listOrdersByUserId,
  findOrderById,
  findOrderByIdForUser,
  updateOrderStatus,
};
