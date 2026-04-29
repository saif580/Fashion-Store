const productService = require("./product.service");
const { sendSuccess } = require("../../utils/response");

const listProducts = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const onlyActive = req.query.all !== "true";
    const result = await productService.listProducts({ page, limit, onlyActive });
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

module.exports = {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
};
