const paymentService = require("./payment.service");
const { sendSuccess } = require("../../utils/response");

const createOrder = async (req, res, next) => {
  try {
    const data = await paymentService.createOrder(req.user.id, req.body.orderId);
    sendSuccess(res, data, 201);
  } catch (error) {
    next(error);
  }
};

const verifyPayment = async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const data = await paymentService.verifyPayment(req.user.id, {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};

const webhook = async (req, res, next) => {
  try {
    const signature = req.headers["x-razorpay-signature"] || "";
    const rawBody = (req.rawBody || req.body).toString("utf8");
    const data = await paymentService.handleWebhook(rawBody, signature);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};

module.exports = { createOrder, verifyPayment, webhook };
