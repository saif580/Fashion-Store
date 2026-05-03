const express = require("express");
const productController = require("./product.controller");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { uploadProductImage } = require("../../config/cloudinary");

const router = express.Router();

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: List products with category, variants, images, and attributes
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Full-text search against name, description, SKU, variant fields, and attributes
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *         description: Filter by a category and all of its descendants
 *       - in: query
 *         name: categorySlug
 *         schema:
 *           type: string
 *         description: Filter by a category slug and all of its descendants
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: sizes
 *         schema:
 *           type: string
 *           example: M,L,XL
 *       - in: query
 *         name: colors
 *         schema:
 *           type: string
 *           example: black,navy
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [newest, price_asc, price_desc, popularity]
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
 *         description: Products fetched successfully
 */
router.get("/", productController.listProducts);

/**
 * @swagger
 * /api/products/images/upload:
 *   post:
 *     summary: Upload product images to Cloudinary
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - images
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Product images uploaded successfully
 */
router.post(
  "/images/upload",
  requireAuth,
  requireRole("admin"),
  uploadProductImage.array("images", 10),
  productController.uploadProductImages,
);

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
