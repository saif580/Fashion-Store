const express = require("express");
const inventoryController = require("./inventory.controller");
const { requireAuth, requireRole } = require("../../middleware/auth");

const router = express.Router();

/**
 * @swagger
 * /api/inventory/reservations/checkout:
 *   post:
 *     summary: Reserve the logged-in user's cart inventory for checkout
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Inventory reserved successfully
 */
router.post("/reservations/checkout", requireAuth, inventoryController.reserveCheckoutStock);

/**
 * @swagger
 * /api/inventory/low-stock:
 *   get:
 *     summary: List low-stock product variants for admin monitoring
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Low-stock variants fetched successfully
 */
router.get("/low-stock", requireAuth, requireRole("admin"), inventoryController.listLowStockVariants);

module.exports = router;
