const express = require("express");
const { requireAuth } = require("../../middleware/auth");
const paymentController = require("./payment.controller");

const router = express.Router();

/**
 * @swagger
 * /api/payments/create-order:
 *   post:
 *     summary: Create a Razorpay order for a pending order
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId]
 *             properties:
 *               orderId:
 *                 type: integer
 *                 example: 12
 *     responses:
 *       201:
 *         description: Razorpay order created — pass razorpay_order_id to the checkout SDK
 */
router.post("/create-order", requireAuth, paymentController.createOrder);

/**
 * @swagger
 * /api/payments/verify:
 *   post:
 *     summary: Verify Razorpay payment signature and confirm the order
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [razorpayOrderId, razorpayPaymentId, razorpaySignature]
 *             properties:
 *               razorpayOrderId:
 *                 type: string
 *               razorpayPaymentId:
 *                 type: string
 *               razorpaySignature:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment verified and order confirmed
 */
router.post("/verify", requireAuth, paymentController.verifyPayment);

/**
 * @swagger
 * /api/payments/webhook:
 *   post:
 *     summary: Razorpay webhook endpoint (payment.captured / payment.failed)
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Webhook received
 */
router.post("/webhook", express.raw({ type: "*/*" }), paymentController.webhook);

module.exports = router;
