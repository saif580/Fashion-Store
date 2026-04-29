const express = require("express");
const categoryController = require("./category.controller");
const { requireAuth, requireRole } = require("../../middleware/auth");

const router = express.Router();

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: List categories
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Categories fetched successfully
 */
router.get("/", categoryController.listCategories);

/**
 * @swagger
 * /api/categories/{categoryId}:
 *   get:
 *     summary: Get one category
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Category fetched successfully
 *       404:
 *         description: Category not found
 */
router.get("/:categoryId", categoryController.getCategoryById);

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create a category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Category created successfully
 */
router.post("/", requireAuth, requireRole("admin"), categoryController.createCategory);

/**
 * @swagger
 * /api/categories/{categoryId}:
 *   put:
 *     summary: Update a category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Category updated successfully
 */
router.put("/:categoryId", requireAuth, requireRole("admin"), categoryController.updateCategory);

module.exports = router;
