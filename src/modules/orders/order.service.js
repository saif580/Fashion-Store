const orderRepository = require("./order.repository");
const userRepository = require("../users/user.repository");
const { sendMail } = require("../../utils/email");
const { createHttpError } = require("../../utils/httpError");

const ORDER_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
const NEXT_STATUS_MAP = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

const buildOrderConfirmationHtml = ({ order, user }) => {
  const rows = order.items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 0;">${item.product_name} (${item.variant_color}/${item.variant_size})</td>
          <td style="padding:8px 0; text-align:center;">${item.quantity}</td>
          <td style="padding:8px 0; text-align:right;">Rs. ${item.line_total.toFixed(2)}</td>
        </tr>`,
    )
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#222;">
      <h2>Order confirmed</h2>
      <p>Hi ${user.first_name || user.name},</p>
      <p>Your order <strong>${order.order_number}</strong> has been placed successfully.</p>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left;padding:8px 0;border-bottom:1px solid #ddd;">Item</th>
            <th style="text-align:center;padding:8px 0;border-bottom:1px solid #ddd;">Qty</th>
            <th style="text-align:right;padding:8px 0;border-bottom:1px solid #ddd;">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:16px;"><strong>Subtotal:</strong> Rs. ${order.subtotal.toFixed(2)}</p>
      <p><strong>Shipping to:</strong><br/>${order.shipping_address.full_name}<br/>${order.shipping_address.address_line_1}${order.shipping_address.address_line_2 ? `<br/>${order.shipping_address.address_line_2}` : ""}<br/>${order.shipping_address.city}, ${order.shipping_address.state} ${order.shipping_address.postal_code}<br/>${order.shipping_address.country}</p>
    </div>
  `;
};

const normalizeStatus = (status) => {
  const normalized = status?.trim().toLowerCase();
  if (!ORDER_STATUSES.includes(normalized)) {
    throw createHttpError(400, `Status must be one of ${ORDER_STATUSES.join(", ")}`);
  }
  return normalized;
};

const getRequiredShippingAddress = async (userId, shippingAddressId) => {
  const addressId = Number(shippingAddressId);
  if (!Number.isInteger(addressId) || addressId <= 0) {
    throw createHttpError(400, "shippingAddressId must be a positive integer");
  }

  const address = await userRepository.findAddressById(userId, addressId);
  if (!address) {
    throw createHttpError(404, "Shipping address not found");
  }

  return address;
};

const placeOrder = async (userId, payload) => {
  const shippingAddress = await getRequiredShippingAddress(userId, payload.shippingAddressId);
  const orderId = await orderRepository.createOrderFromCart({
    userId,
    shippingAddress,
  });

  if (!orderId) {
    throw createHttpError(400, "Your cart is empty");
  }

  const order = await orderRepository.findOrderByIdForUser(userId, orderId);
  const user = await userRepository.findById(userId);

  if (user) {
    await sendMail({
      to: user.email,
      subject: `Order confirmation – ${order.order_number}`,
      html: buildOrderConfirmationHtml({ order, user }),
    });
  }

  return order;
};

const listOrders = async (userId) => orderRepository.listOrdersByUserId(userId);

const getOrderById = async (userId, orderId) => {
  const parsedId = Number(orderId);
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    throw createHttpError(400, "Order id must be a positive integer");
  }

  const order = await orderRepository.findOrderByIdForUser(userId, parsedId);
  if (!order) {
    throw createHttpError(404, "Order not found");
  }

  return order;
};

const updateStatus = async (orderId, status) => {
  const parsedId = Number(orderId);
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    throw createHttpError(400, "Order id must be a positive integer");
  }

  const nextStatus = normalizeStatus(status);
  const existing = await orderRepository.findOrderById(parsedId);
  if (!existing) {
    throw createHttpError(404, "Order not found");
  }

  if (existing.status === nextStatus) {
    return existing;
  }

  const allowedNextStatuses = NEXT_STATUS_MAP[existing.status] || [];
  if (!allowedNextStatuses.includes(nextStatus)) {
    throw createHttpError(400, `Cannot move order from ${existing.status} to ${nextStatus}`);
  }

  return orderRepository.updateOrderStatus(parsedId, nextStatus);
};

const adminListOrders = async ({ page, limit, status, userId, search } = {}) => {
  const p = Math.max(1, parseInt(page) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit) || 20));

  if (status != null && !ORDER_STATUSES.includes(status)) {
    throw createHttpError(400, `Status must be one of ${ORDER_STATUSES.join(", ")}`);
  }

  if (userId != null) {
    const uid = Number(userId);
    if (!Number.isInteger(uid) || uid <= 0) {
      throw createHttpError(400, "userId must be a positive integer");
    }
  }

  return orderRepository.listAllOrders({
    page: p,
    limit: l,
    status: status ?? null,
    userId: userId != null ? Number(userId) : null,
    search: search ?? null,
  });
};

const adminGetOrderById = async (orderId) => {
  const parsedId = Number(orderId);
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    throw createHttpError(400, "Order id must be a positive integer");
  }

  const order = await orderRepository.findOrderByIdAdmin(parsedId);
  if (!order) {
    throw createHttpError(404, "Order not found");
  }

  return order;
};

module.exports = {
  placeOrder,
  listOrders,
  getOrderById,
  updateStatus,
  adminListOrders,
  adminGetOrderById,
};
