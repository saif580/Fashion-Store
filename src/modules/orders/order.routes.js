const express = require("express");
const orderController = require("./order.controller");
const { requireAuth, requireRole } = require("../../middleware/auth");

const router = express.Router();

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Place an order from the logged-in user's cart
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Order placed successfully
 */
router.post("/", requireAuth, orderController.placeOrder);

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: List the logged-in user's orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Orders fetched successfully
 */
router.get("/", requireAuth, orderController.listOrders);

/**
 * @swagger
 * /api/orders/admin:
 *   get:
 *     summary: List all orders across all users (admin)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search by order number, customer name, or email
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, shipped, delivered, cancelled]
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Orders fetched successfully
 */
router.get("/admin", requireAuth, requireRole("admin"), orderController.adminListOrders);

/**
 * @swagger
 * /api/orders/admin/{id}:
 *   get:
 *     summary: Get any order by ID (admin)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Order fetched successfully
 *       404:
 *         description: Order not found
 */
router.get("/admin/:id", requireAuth, requireRole("admin"), orderController.adminGetOrderById);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get one order belonging to the logged-in user
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Order fetched successfully
 */
router.get("/:id", requireAuth, orderController.getOrderById);

/**
 * @swagger
 * /api/orders/{id}/status:
 *   patch:
 *     summary: Update an order's status
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Order status updated successfully
 */
router.patch("/:id/status", requireAuth, requireRole("admin"), orderController.updateOrderStatus);

module.exports = router;
