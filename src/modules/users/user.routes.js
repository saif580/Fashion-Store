const express = require("express");
const userController = require("./user.controller");
const { requireAuth, requireRole } = require("../../middleware/auth");

const router = express.Router();

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get the logged-in user's profile
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *       401:
 *         description: Missing or invalid token
 */
router.get("/me", requireAuth, userController.getProfile);

/**
 * @swagger
 * /api/users/admin/access:
 *   get:
 *     summary: Verify that the current user has admin access
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin access granted
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: User is authenticated but not an admin
 */
router.get("/admin/access", requireAuth, requireRole("admin"), userController.getAdminAccess);

module.exports = router;
