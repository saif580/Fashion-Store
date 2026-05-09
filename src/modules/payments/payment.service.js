const crypto = require("crypto");
const razorpay = require("../../config/razorpay");
const { razorpayKeyId, razorpayKeySecret, razorpayWebhookSecret } = require("../../config/env");
const paymentRepository = require("./payment.repository");
const orderRepository = require("../orders/order.repository");
const userRepository = require("../users/user.repository");
const { sendMail } = require("../../utils/email");
const { createHttpError } = require("../../utils/httpError");

const buildPaymentSuccessHtml = ({ order, user, payment }) => {
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
      <h2>Payment successful</h2>
      <p>Hi ${user.first_name || user.name},</p>
      <p>We've received your payment and confirmed order <strong>${order.order_number}</strong>.</p>
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
      <p style="margin-top:16px;"><strong>Paid:</strong> Rs. ${(Number(payment.amount_paise) / 100).toFixed(2)}</p>
      <p><strong>Shipping to:</strong><br/>${order.shipping_address.full_name}<br/>${order.shipping_address.address_line_1}${order.shipping_address.address_line_2 ? `<br/>${order.shipping_address.address_line_2}` : ""}<br/>${order.shipping_address.city}, ${order.shipping_address.state} ${order.shipping_address.postal_code}<br/>${order.shipping_address.country}</p>
    </div>
  `;
};

const sendPaymentSuccessEmail = async (orderId, payment) => {
  const order = await orderRepository.findOrderById(orderId);
  if (!order) return;

  const user = await userRepository.findById(order.user_id);
  if (!user) return;

  try {
    await sendMail({
      to: user.email,
      subject: `Payment successful - ${order.order_number}`,
      html: buildPaymentSuccessHtml({ order, user, payment }),
    });
  } catch (error) {
    console.error("Failed to send payment success email", error);
  }
};

const createOrder = async (userId, orderId) => {
  const parsedId = Number(orderId);
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    throw createHttpError(400, "orderId must be a positive integer");
  }

  const order = await orderRepository.findOrderByIdForUser(userId, parsedId);
  if (!order) {
    throw createHttpError(404, "Order not found");
  }

  if (order.status !== "pending") {
    throw createHttpError(400, `Order is already ${order.status}`);
  }

  const existing = await paymentRepository.findPaymentByOrderId(parsedId);
  if (existing?.status === "paid") {
    throw createHttpError(400, "This order has already been paid");
  }

  const amountPaise = Math.round(order.total * 100);

  const rzpOrder = await razorpay.orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt: order.order_number,
  });

  await paymentRepository.createPaymentRecord(parsedId, rzpOrder.id, amountPaise);

  return {
    razorpay_order_id: rzpOrder.id,
    amount_paise: amountPaise,
    currency: "INR",
    key_id: razorpayKeyId,
    order_number: order.order_number,
  };
};

const verifyPayment = async (userId, { razorpayOrderId, razorpayPaymentId, razorpaySignature }) => {
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    throw createHttpError(400, "razorpayOrderId, razorpayPaymentId and razorpaySignature are required");
  }

  const payment = await paymentRepository.findPaymentByRazorpayOrderId(razorpayOrderId);
  if (!payment) {
    throw createHttpError(404, "Payment record not found");
  }

  if (payment.status === "paid") {
    throw createHttpError(400, "Payment already verified");
  }

  const order = await orderRepository.findOrderByIdForUser(userId, payment.order_id);
  if (!order) {
    throw createHttpError(403, "Order does not belong to you");
  }

  const expected = crypto
    .createHmac("sha256", razorpayKeySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  if (expected !== razorpaySignature) {
    throw createHttpError(400, "Payment signature is invalid");
  }

  const paidPayment = await paymentRepository.markPaymentPaid(razorpayOrderId, razorpayPaymentId, razorpaySignature, null);
  await orderRepository.updateOrderStatus(payment.order_id, "confirmed");
  await sendPaymentSuccessEmail(payment.order_id, paidPayment);

  return { message: "Payment verified successfully", order_id: payment.order_id };
};

const handleWebhook = async (rawBody, signature) => {
  if (!razorpayWebhookSecret) {
    throw createHttpError(500, "Webhook secret is not configured");
  }

  const expected = crypto
    .createHmac("sha256", razorpayWebhookSecret)
    .update(rawBody)
    .digest("hex");

  if (expected !== signature) {
    throw createHttpError(400, "Webhook signature is invalid");
  }

  const event = JSON.parse(rawBody);
  const entity = event?.payload?.payment?.entity;

  if (!entity) return { received: true };

  const razorpayOrderId = entity.order_id;

  if (event.event === "payment.captured") {
    const payment = await paymentRepository.findPaymentByRazorpayOrderId(razorpayOrderId);
    if (payment && payment.status !== "paid") {
      const paidPayment = await paymentRepository.markPaymentPaid(razorpayOrderId, entity.id, null, entity.method);
      await orderRepository.updateOrderStatus(payment.order_id, "confirmed");
      await sendPaymentSuccessEmail(payment.order_id, paidPayment);
    }
  }

  if (event.event === "payment.failed") {
    await paymentRepository.markPaymentFailed(razorpayOrderId);
  }

  return { received: true };
};

module.exports = { createOrder, verifyPayment, handleWebhook };
