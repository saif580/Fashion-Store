const productService = require("./product.service");
const { sendSuccess } = require("../../utils/response");

const listProducts = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const onlyActive = req.query.all !== "true";
    const sizes = typeof req.query.sizes === "string"
      ? req.query.sizes.split(",").map((size) => size.trim().toLowerCase()).filter(Boolean)
      : [];
    const colors = typeof req.query.colors === "string"
      ? req.query.colors.split(",").map((color) => color.trim().toLowerCase()).filter(Boolean)
      : [];

    const result = await productService.listProducts({
      page,
      limit,
      onlyActive,
      search: typeof req.query.q === "string" ? req.query.q.trim() : null,
      categoryId: req.query.categoryId ? Number(req.query.categoryId) : null,
      categorySlug: typeof req.query.categorySlug === "string" ? req.query.categorySlug.trim() : null,
      minPrice: req.query.minPrice !== undefined ? Number(req.query.minPrice) : null,
      maxPrice: req.query.maxPrice !== undefined ? Number(req.query.maxPrice) : null,
      sizes,
      colors,
      sortBy: typeof req.query.sort === "string" ? req.query.sort.trim() : "newest",
    });
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const product = await productService.getProductById(Number(req.params.productId));
    sendSuccess(res, product);
  } catch (error) {
    next(error);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const product = await productService.createProduct(req.body);
    sendSuccess(res, product, 201);
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const product = await productService.updateProduct(Number(req.params.productId), req.body);
    sendSuccess(res, product);
  } catch (error) {
    next(error);
  }
};

const uploadProductImages = async (req, res, next) => {
  try {
    const uploads = await productService.uploadProductImages(req.files);
    sendSuccess(res, uploads, 201);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  uploadProductImages,
};
