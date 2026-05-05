const categoryService = require("./category.service");
const { sendSuccess } = require("../../utils/response");

const listCategories = async (req, res, next) => {
  try {
    const categories = await categoryService.listCategories();
    sendSuccess(res, categories);
  } catch (error) {
    next(error);
  }
};

const getCategoryById = async (req, res, next) => {
  try {
    const category = await categoryService.getCategoryById(Number(req.params.categoryId));
    sendSuccess(res, category);
  } catch (error) {
    next(error);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const category = await categoryService.createCategory(req.body);
    sendSuccess(res, category, 201);
  } catch (error) {
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const category = await categoryService.updateCategory(Number(req.params.categoryId), req.body);
    sendSuccess(res, category);
  } catch (error) {
    next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const result = await categoryService.deleteCategory(Number(req.params.categoryId));
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
