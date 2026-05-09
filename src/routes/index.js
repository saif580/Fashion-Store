const express = require("express");
const healthRoutes = require("../modules/health/health.routes");
const categoryRoutes = require("../modules/categories/category.routes");
const productRoutes = require("../modules/products/product.routes");
const cartRoutes = require("../modules/cart/cart.routes");
const inventoryRoutes = require("../modules/inventory/inventory.routes");
const orderRoutes = require("../modules/orders/order.routes");
const userRoutes = require("../modules/users/user.routes");
const authRoutes = require("../modules/auth/auth.routes");
const wishlistRoutes = require("../modules/wishlist/wishlist.routes");
const paymentRoutes = require("../modules/payments/payment.routes");

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/categories", categoryRoutes);
router.use("/products", productRoutes);
router.use("/cart", cartRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/orders", orderRoutes);
router.use("/users", userRoutes);
router.use("/auth", authRoutes);
router.use("/wishlist", wishlistRoutes);
router.use("/payments", paymentRoutes);

module.exports = router;
