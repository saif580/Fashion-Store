const express = require("express");
const wishlistController = require("./wishlist.controller");
const { requireAuth } = require("../../middleware/auth");

const router = express.Router();

/**
 * @swagger
 * /api/wishlist:
 *   get:
 *     summary: Get the logged-in user's wishlist
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wishlist fetched successfully
 */
router.get("/", requireAuth, wishlistController.getWishlist);

/**
 * @swagger
 * /api/wishlist:
 *   post:
 *     summary: Add a product to the logged-in user's wishlist
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *             properties:
 *               productId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Product added to wishlist successfully
 *       409:
 *         description: Product is already in the wishlist
 */
router.post("/", requireAuth, wishlistController.addItem);

/**
 * @swagger
 * /api/wishlist/{id}:
 *   delete:
 *     summary: Remove an item from the logged-in user's wishlist
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Wishlist item ID
 *     responses:
 *       200:
 *         description: Wishlist item removed successfully
 *       404:
 *         description: Wishlist item not found
 */
router.delete("/:id", requireAuth, wishlistController.removeItem);

module.exports = router;
