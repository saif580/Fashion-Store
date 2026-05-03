const express = require("express");
const reviewController = require("./review.controller");
const { requireAuth } = require("../../middleware/auth");

const router = express.Router({ mergeParams: true });

/**
 * @swagger
 * /api/products/{productId}/reviews:
 *   get:
 *     summary: List reviews for a product
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
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
 *         description: Reviews fetched successfully
 *       404:
 *         description: Product not found
 */
router.get("/", reviewController.getReviews);

/**
 * @swagger
 * /api/products/{productId}/reviews:
 *   post:
 *     summary: Submit a review for a product
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               title:
 *                 type: string
 *               body:
 *                 type: string
 *     responses:
 *       201:
 *         description: Review submitted successfully
 *       409:
 *         description: You have already reviewed this product
 */
router.post("/", requireAuth, reviewController.submitReview);

module.exports = router;
