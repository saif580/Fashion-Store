const express = require("express");
const productController = require("./product.controller");
const { requireAuth, requireRole } = require("../../middleware/auth");

const router = express.Router();

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: List products with category, variants, images, and attributes
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Products fetched successfully
 */
router.get("/", productController.listProducts);

/**
 * @swagger
 * /api/products/{productId}:
 *   get:
 *     summary: Get one product with variants, images, and attributes
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Product fetched successfully
 *       404:
 *         description: Product not found
 */
router.get("/:productId", productController.getProductById);

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a product with variants, images, and attributes
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Product created successfully
 */
router.post("/", requireAuth, requireRole("admin"), productController.createProduct);

/**
 * @swagger
 * /api/products/{productId}:
 *   put:
 *     summary: Update a product with variants, images, and attributes
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Product updated successfully
 */
router.put("/:productId", requireAuth, requireRole("admin"), productController.updateProduct);

module.exports = router;
