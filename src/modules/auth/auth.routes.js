const express = require("express");
const authController = require("./auth.controller");
const { loginLimiter, registerLimiter } = require("../../middleware/rateLimiter");

const router = express.Router();

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new customer account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, phone, password, confirmPassword, acceptTerms]
 *             properties:
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               email: { type: string, format: email }
 *               phone: { type: string }
 *               password: { type: string, format: password }
 *               confirmPassword: { type: string, format: password }
 *               acceptTerms: { type: boolean }
 *               isMarketingOptIn: { type: boolean }
 *     responses:
 *       201: { description: User registered, email verification sent }
 *       400: { description: Validation failed }
 *       409: { description: Email already exists }
 */
router.post("/register", registerLimiter, authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Log in with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *     responses:
 *       200: { description: Login successful, returns accessToken and refreshToken }
 *       401: { description: Invalid credentials }
 *       403: { description: Email not verified }
 */
router.post("/login", loginLimiter, authController.login);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Get a new access token using a refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200: { description: New access token issued }
 *       401: { description: Invalid or expired refresh token }
 */
router.post("/refresh", authController.refresh);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout and invalidate the refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200: { description: Logged out successfully }
 */
router.post("/logout", authController.logout);

/**
 * @swagger
 * /api/auth/verify-email:
 *   get:
 *     summary: Verify email address via token link
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Email verified successfully }
 *       400: { description: Invalid or expired token }
 */
router.get("/verify-email", authController.verifyEmail);

/**
 * @swagger
 * /api/auth/resend-verification:
 *   post:
 *     summary: Re-send an email verification link
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200: { description: Verification email re-sent if applicable }
 */
router.post("/resend-verification", authController.resendVerificationEmail);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request a password reset email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200: { description: Reset link sent if email exists }
 */
router.post("/forgot-password", authController.forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password using token from email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password, confirmPassword]
 *             properties:
 *               token: { type: string }
 *               password: { type: string, format: password }
 *               confirmPassword: { type: string, format: password }
 *     responses:
 *       200: { description: Password reset successfully }
 *       400: { description: Invalid or expired token }
 */
router.post("/reset-password", authController.resetPassword);

module.exports = router;
