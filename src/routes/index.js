const express = require("express");
const healthRoutes = require("../modules/health/health.routes");
const categoryRoutes = require("../modules/categories/category.routes");
const productRoutes = require("../modules/products/product.routes");
const orderRoutes = require("../modules/orders/order.routes");
const userRoutes = require("../modules/users/user.routes");
const authRoutes = require("../modules/auth/auth.routes");

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/categories", categoryRoutes);
router.use("/products", productRoutes);
router.use("/orders", orderRoutes);
router.use("/users", userRoutes);
router.use("/auth", authRoutes);

module.exports = router;
