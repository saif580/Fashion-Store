const categoryRepository = require("./category.repository");
const { createHttpError } = require("../../utils/httpError");
const { slugify } = require("../../utils/slug");

const normalizePayload = (payload) => {
  const name = payload.name?.trim();
  const slug = (payload.slug?.trim() || slugify(name || ""));

  if (!name) {
    throw createHttpError(400, "Category name is required");
  }

  if (!slug) {
    throw createHttpError(400, "Category slug is required");
  }

  return {
    name,
    slug,
    description: payload.description?.trim() || null,
    parentId: payload.parentId ? Number(payload.parentId) : null,
    imageUrl: payload.imageUrl?.trim() || null,
    isActive: payload.isActive !== false,
  };
};

const ensureParentExists = async (parentId) => {
  if (!parentId) return;
  const parent = await categoryRepository.findCategoryById(parentId);
  if (!parent) throw createHttpError(400, "Parent category not found");
};

const wouldCreateCycle = async (categoryId, newParentId) => {
  let currentId = newParentId;
  while (currentId !== null && currentId !== undefined) {
    if (currentId === categoryId) return true;
    const ancestor = await categoryRepository.findCategoryById(currentId);
    currentId = ancestor?.parent_id ?? null;
  }
  return false;
};

const listCategories = () => categoryRepository.listCategories();

const getCategoryById = async (categoryId) => {
  const category = await categoryRepository.findCategoryById(categoryId);

  if (!category) {
    throw createHttpError(404, "Category not found");
  }

  return category;
};

const createCategory = async (payload) => {
  const category = normalizePayload(payload);
  await ensureParentExists(category.parentId);

  const existing = await categoryRepository.findCategoryBySlug(category.slug);
  if (existing) {
    throw createHttpError(409, "Category slug already exists");
  }

  return categoryRepository.createCategory(category);
};

const updateCategory = async (categoryId, payload) => {
  const existingCategory = await categoryRepository.findCategoryById(categoryId);
  if (!existingCategory) {
    throw createHttpError(404, "Category not found");
  }

  const category = normalizePayload(payload);

  if (category.parentId !== null) {
    await ensureParentExists(category.parentId);
    if (await wouldCreateCycle(categoryId, category.parentId)) {
      throw createHttpError(400, "Setting this parent would create a circular category reference");
    }
  }

  const slugOwner = await categoryRepository.findCategoryBySlug(category.slug);
  if (slugOwner && slugOwner.id !== categoryId) {
    throw createHttpError(409, "Category slug already exists");
  }

  return categoryRepository.updateCategory(categoryId, category);
};

module.exports = {
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
};
