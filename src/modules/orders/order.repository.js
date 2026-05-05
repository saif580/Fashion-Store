const crypto = require("crypto");
const { pool, query } = require("../../config/db");

const orderSelectColumns = `
  o.id,
  o.user_id,
  o.order_number,
  o.status,
  o.subtotal,
  o.discount_amount,
  o.total,
  o.coupon_code,
  o.coupon_type,
  o.coupon_value,
  o.free_shipping,
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
  discount_amount,
  total,
  coupon_code,
  coupon_type,
  coupon_value,
  free_shipping,
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
      discount_amount: Number(order.discount_amount || 0),
      total: Number(order.total || order.subtotal),
      coupon: order.coupon_code
        ? {
            code: order.coupon_code,
            type: order.coupon_type,
            value: Number(order.coupon_value || 0),
            free_shipping: order.free_shipping,
          }
        : null,
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

const getCartCouponForCheckout = async (userId, client) => {
  const { rows } = await client.query(
    `
      SELECT
        c.id AS coupon_id,
        c.code,
        c.type,
        c.value,
        c.min_purchase_amount,
        c.usage_limit,
        c.uses_count,
        c.expires_at,
        c.is_active,
        cc.applied_at,
        cc.cart_id
      FROM cart_coupons cc
      INNER JOIN coupons c ON c.id = cc.coupon_id
      INNER JOIN carts crt ON crt.id = cc.cart_id
      WHERE crt.user_id = $1
      LIMIT 1;
    `,
    [userId],
  );

  return rows[0] || null;
};

const generateOrderNumber = () => `ORD-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

const expireReservations = async (client) => {
  await client.query(
    `
      UPDATE inventory_reservations
      SET status = 'expired', released_at = NOW()
      WHERE status = 'active' AND expires_at <= NOW();
    `,
  );
};

const getActiveReservedQuantity = async (client, variantId, excludingUserId = null) => {
  const { rows } = await client.query(
    `
      SELECT COALESCE(SUM(quantity), 0)::int AS reserved_quantity
      FROM inventory_reservations
      WHERE variant_id = $1
        AND status = 'active'
        AND expires_at > NOW()
        AND ($2::int IS NULL OR user_id != $2);
    `,
    [variantId, excludingUserId],
  );

  return rows[0]?.reserved_quantity || 0;
};

const createOrderFromCart = async ({ userId, shippingAddress }) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await expireReservations(client);

    const cartItems = await getCartItemsForCheckout(userId, client);
    if (cartItems.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    for (const item of cartItems) {
      const reservedByOthers = await getActiveReservedQuantity(client, item.variant_id, userId);
      const availableForCheckout = item.inventory_quantity - reservedByOthers;

      if (!item.product_is_active || !item.variant_is_active) {
        const error = new Error("One or more cart items are no longer available");
        error.status = 400;
        throw error;
      }

      if (availableForCheckout < item.quantity) {
        const error = new Error(`Only ${Math.max(availableForCheckout, 0)} item(s) are available for SKU ${item.sku}`);
        error.status = 400;
        throw error;
      }
    }

    const subtotal = cartItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
    const coupon = await getCartCouponForCheckout(userId, client);

    let discountAmount = 0;
    let freeShipping = false;
    let couponCode = null;
    let couponType = null;
    let couponValue = null;

    if (coupon) {
      if (!coupon.is_active) {
        const error = new Error("Coupon is not active");
        error.status = 400;
        throw error;
      }

      if (coupon.expires_at && new Date(coupon.expires_at) <= new Date()) {
        const error = new Error("Coupon has expired");
        error.status = 400;
        throw error;
      }

      if (coupon.usage_limit !== null && coupon.uses_count >= coupon.usage_limit) {
        const error = new Error("Coupon has reached its usage limit");
        error.status = 400;
        throw error;
      }

      if (subtotal < Number(coupon.min_purchase_amount || 0)) {
        const error = new Error(`Cart subtotal must be at least Rs. ${coupon.min_purchase_amount} to use this coupon`);
        error.status = 400;
        throw error;
      }

      couponCode = coupon.code;
      couponType = coupon.type;
      couponValue = Number(coupon.value || 0);
      freeShipping = coupon.type === "free_shipping";

      if (coupon.type === "percentage") {
        discountAmount = Number((subtotal * (couponValue / 100)).toFixed(2));
      } else if (coupon.type === "fixed") {
        discountAmount = Math.min(subtotal, couponValue);
      }
    }

    const total = Math.max(0, subtotal - discountAmount);
    const orderNumber = generateOrderNumber();

    const { rows: [order] } = await client.query(
      `
        INSERT INTO orders (
          user_id,
          order_number,
          status,
          subtotal,
          discount_amount,
          total,
          coupon_code,
          coupon_type,
          coupon_value,
          free_shipping,
          shipping_full_name,
          shipping_phone,
          shipping_address_line_1,
          shipping_address_line_2,
          shipping_city,
          shipping_state,
          shipping_postal_code,
          shipping_country
        )
        VALUES ($1,$2,'pending',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
        RETURNING ${orderReturningColumns};
      `,
      [
        userId,
        orderNumber,
        subtotal,
        discountAmount,
        total,
        couponCode,
        couponType,
        couponValue,
        freeShipping,
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
      const quantityBefore = item.inventory_quantity;
      const quantityAfter = quantityBefore - item.quantity;

      const { rows: [reservation] } = await client.query(
        `
          INSERT INTO inventory_reservations (
            user_id,
            variant_id,
            order_id,
            quantity,
            status,
            expires_at
          )
          VALUES ($1,$2,$3,$4,'confirmed', NOW() + INTERVAL '15 minutes')
          RETURNING id;
        `,
        [userId, item.variant_id, order.id, item.quantity],
      );

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

      await client.query(
        `
          INSERT INTO inventory_transactions (
            variant_id,
            order_id,
            reservation_id,
            transaction_type,
            quantity_delta,
            quantity_before,
            quantity_after,
            notes
          )
          VALUES ($1,$2,$3,'order_placed',$4,$5,$6,$7);
        `,
        [
          item.variant_id,
          order.id,
          reservation.id,
          -item.quantity,
          quantityBefore,
          quantityAfter,
          `Order ${order.order_number} placed`,
        ],
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

    if (coupon) {
      await client.query(
        `
          UPDATE coupons
          SET uses_count = uses_count + 1
          WHERE id = $1;
        `,
        [coupon.coupon_id],
      );

      await client.query(
        `
          INSERT INTO order_coupons (
            order_id,
            coupon_id,
            code,
            type,
            value,
            discount_amount,
            free_shipping,
            applied_at
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8);
        `,
        [
          order.id,
          coupon.coupon_id,
          couponCode,
          couponType,
          couponValue,
          discountAmount,
          freeShipping,
          coupon.applied_at,
        ],
      );
    }

    await client.query(
      `
        DELETE FROM cart_coupons
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

const listAllOrders = async ({ page = 1, limit = 20, status = null, userId = null, search = null } = {}) => {
  const clauses = [];
  const params = [];
  const addParam = (v) => { params.push(v); return `$${params.length}`; };

  if (status) clauses.push(`o.status = ${addParam(status)}`);
  if (userId) clauses.push(`o.user_id = ${addParam(userId)}`);
  if (search) {
    const likeToken = addParam(`%${search}%`);
    clauses.push(`(o.order_number ILIKE ${likeToken} OR u.email ILIKE ${likeToken} OR u.name ILIKE ${likeToken})`);
  }

  const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const offset = (page - 1) * limit;
  const countParams = [...params];
  const listParams = [...params, limit, offset];

  const [countResult, rowsResult] = await Promise.all([
    query(
      `SELECT COUNT(*) FROM orders o JOIN users u ON u.id = o.user_id ${whereClause}`,
      countParams,
    ),
    query(
      `SELECT ${orderSelectColumns}, u.name AS user_name, u.email AS user_email
       FROM orders o
       JOIN users u ON u.id = o.user_id
       ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams,
    ),
  ]);

  const total = Number(countResult.rows[0].count);
  const rawRows = rowsResult.rows;
  const userInfoById = new Map(rawRows.map((r) => [r.id, { name: r.user_name, email: r.user_email }]));
  const orders = (await hydrateOrders(rawRows)).map((order) => ({
    ...order,
    user: userInfoById.get(order.id) ?? null,
  }));

  return {
    orders,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const findOrderByIdAdmin = async (orderId) => {
  const { rows } = await query(
    `SELECT ${orderSelectColumns}, u.name AS user_name, u.email AS user_email
     FROM orders o
     JOIN users u ON u.id = o.user_id
     WHERE o.id = $1`,
    [orderId],
  );
  if (!rows[0]) return null;
  const [order] = await hydrateOrders(rows);
  return { ...order, user: { name: rows[0].user_name, email: rows[0].user_email } };
};

module.exports = {
  createOrderFromCart,
  listOrdersByUserId,
  findOrderById,
  findOrderByIdForUser,
  updateOrderStatus,
  listAllOrders,
  findOrderByIdAdmin,
};
