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
 * /api/users/me:
 *   put:
 *     summary: Update the logged-in user's profile
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.put("/me", requireAuth, userController.updateProfile);

/**
 * @swagger
 * /api/users/addresses:
 *   get:
 *     summary: List the logged-in user's saved addresses
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of addresses
 */
router.get("/addresses", requireAuth, userController.listAddresses);

/**
 * @swagger
 * /api/users/addresses:
 *   post:
 *     summary: Add a new address for the logged-in user
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Address created successfully
 */
router.post("/addresses", requireAuth, userController.createAddress);

/**
 * @swagger
 * /api/users/addresses/{addressId}:
 *   put:
 *     summary: Update an existing address for the logged-in user
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Address updated successfully
 */
router.put("/addresses/:addressId", requireAuth, userController.updateAddress);

/**
 * @swagger
 * /api/users/addresses/{addressId}:
 *   delete:
 *     summary: Delete an address for the logged-in user
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Address deleted successfully
 */
router.delete("/addresses/:addressId", requireAuth, userController.deleteAddress);

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

/**
 * @swagger
 * /api/users/admin/users:
 *   get:
 *     summary: List all users (admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search by name or email
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [customer, admin]
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
 *         description: Users fetched successfully
 */
router.get("/admin/users", requireAuth, requireRole("admin"), userController.adminListUsers);

/**
 * @swagger
 * /api/users/admin/users/{userId}/role:
 *   patch:
 *     summary: Update a user's role (admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [customer, admin]
 *     responses:
 *       200:
 *         description: User role updated successfully
 *       400:
 *         description: Invalid role or cannot change own role
 *       404:
 *         description: User not found
 */
router.patch("/admin/users/:userId/role", requireAuth, requireRole("admin"), userController.adminUpdateUserRole);

/**
 * @swagger
 * /api/users/admin/users/{userId}/active:
 *   patch:
 *     summary: Activate or deactivate a user (admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User status updated successfully
 *       400:
 *         description: Cannot deactivate own account
 *       404:
 *         description: User not found
 */
router.patch("/admin/users/:userId/active", requireAuth, requireRole("admin"), userController.adminSetUserActive);

module.exports = router;
