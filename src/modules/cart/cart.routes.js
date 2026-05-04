const express = require("express");
const cartController = require("./cart.controller");
const { requireAuth } = require("../../middleware/auth");

const router = express.Router();

/**
 * @swagger
 * /api/cart:
 *   get:
 *     summary: Get the logged-in user's active cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart fetched successfully
 */
router.get("/", requireAuth, cartController.getCart);

/**
 * @swagger
 * /api/cart/items:
 *   post:
 *     summary: Add a product variant to the logged-in user's cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Cart item added successfully
 */
router.post("/items", requireAuth, cartController.addItem);

/**
 * @swagger
 * /api/cart/items/{id}:
 *   put:
 *     summary: Update the quantity of a cart item
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart item updated successfully
 */
router.put("/items/:id", requireAuth, cartController.updateItemQuantity);

/**
 * @swagger
 * /api/cart/items/{id}:
 *   delete:
 *     summary: Remove a cart item from the cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart item removed successfully
 */
router.delete("/items/:id", requireAuth, cartController.removeItem);

/**
 * @swagger
 * /api/cart:
 *   delete:
 *     summary: Clear all items from the logged-in user's cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart cleared successfully
 */
router.delete("/", requireAuth, cartController.clearCart);

/**
 * @swagger
 * /api/cart/coupon:
 *   post:
 *     summary: Apply a coupon code to the logged-in user's cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 example: SAVE20
 *     responses:
 *       200:
 *         description: Coupon applied successfully
 */
router.post("/coupon", requireAuth, cartController.applyCoupon);

module.exports = router;
