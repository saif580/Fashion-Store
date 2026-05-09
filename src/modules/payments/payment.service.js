const crypto = require("crypto");
const razorpay = require("../../config/razorpay");
const { razorpayKeyId, razorpayKeySecret, razorpayWebhookSecret } = require("../../config/env");
const paymentRepository = require("./payment.repository");
const orderRepository = require("../orders/order.repository");
const { createHttpError } = require("../../utils/httpError");

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

  await paymentRepository.markPaymentPaid(razorpayOrderId, razorpayPaymentId, razorpaySignature, null);
  await orderRepository.updateOrderStatus(payment.order_id, "confirmed");

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
      await paymentRepository.markPaymentPaid(razorpayOrderId, entity.id, null, entity.method);
      await orderRepository.updateOrderStatus(payment.order_id, "confirmed");
    }
  }

  if (event.event === "payment.failed") {
    await paymentRepository.markPaymentFailed(razorpayOrderId);
  }

  return { received: true };
};

module.exports = { createOrder, verifyPayment, handleWebhook };
