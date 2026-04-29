const productRepository = require("./product.repository");
const categoryRepository = require("../categories/category.repository");
const { createHttpError } = require("../../utils/httpError");
const { slugify } = require("../../utils/slug");

const normalizeVariant = (variant) => {
  if (!variant.sku?.trim()) {
    throw createHttpError(400, "Each variant must have an SKU");
  }

  if (!variant.color?.trim()) {
    throw createHttpError(400, "Each variant must have a color");
  }

  if (!variant.size?.trim()) {
    throw createHttpError(400, "Each variant must have a size");
  }

  if (variant.price === undefined || Number(variant.price) <= 0) {
    throw createHttpError(400, "Each variant must have a valid price");
  }

  return {
    sku: variant.sku.trim(),
    color: variant.color.trim(),
    size: variant.size.trim(),
    material: variant.material?.trim() || null,
    price: Number(variant.price),
    compareAtPrice: variant.compareAtPrice === undefined || variant.compareAtPrice === null ? null : Number(variant.compareAtPrice),
    inventoryQuantity: Number.isInteger(Number(variant.inventoryQuantity)) ? Number(variant.inventoryQuantity) : 0,
    isActive: variant.isActive !== false,
  };
};

const normalizePayload = (payload) => {
  const name = payload.name?.trim();
  const slug = (payload.slug?.trim() || slugify(name || ""));

  if (!name) {
    throw createHttpError(400, "Product name is required");
  }

  if (!slug) {
    throw createHttpError(400, "Product slug is required");
  }

  if (!payload.categoryId) {
    throw createHttpError(400, "Category is required");
  }

  if (payload.basePrice === undefined || Number(payload.basePrice) <= 0) {
    throw createHttpError(400, "Base price must be a positive number");
  }

  if (!Array.isArray(payload.variants) || payload.variants.length === 0) {
    throw createHttpError(400, "At least one product variant is required");
  }

  const variants = payload.variants.map(normalizeVariant);
  const duplicateSku = new Set();
  for (const variant of variants) {
    if (duplicateSku.has(variant.sku)) {
      throw createHttpError(400, "Variant SKUs must be unique within the product");
    }
    duplicateSku.add(variant.sku);
  }

  const images = Array.isArray(payload.images)
    ? payload.images.map((image, index) => ({
        imageUrl: image.imageUrl?.trim(),
        altText: image.altText?.trim() || null,
        sortOrder: Number.isInteger(Number(image.sortOrder)) ? Number(image.sortOrder) : index,
      }))
    : [];

  if (images.some((image) => !image.imageUrl)) {
    throw createHttpError(400, "Each product image must have an imageUrl");
  }

  const attributes = Array.isArray(payload.attributes)
    ? payload.attributes.map((attribute) => ({
        name: attribute.name?.trim(),
        value: attribute.value?.trim(),
      }))
    : [];

  if (attributes.some((attribute) => !attribute.name || !attribute.value)) {
    throw createHttpError(400, "Each product attribute must have a name and value");
  }

  return {
    categoryId: Number(payload.categoryId),
    name,
    slug,
    description: payload.description?.trim() || null,
    basePrice: Number(payload.basePrice),
    isActive: payload.isActive !== false,
    variants,
    images,
    attributes,
  };
};

const ensureCategoryExists = async (categoryId) => {
  const category = await categoryRepository.findCategoryById(categoryId);
  if (!category) {
    throw createHttpError(400, "Category not found");
  }
};

const listProducts = ({ page, limit, onlyActive } = {}) =>
  productRepository.listProducts({ page, limit, onlyActive });

const getProductById = async (productId) => {
  const product = await productRepository.findProductById(productId);

  if (!product) {
    throw createHttpError(404, "Product not found");
  }

  return product;
};

const createProduct = async (payload) => {
  const product = normalizePayload(payload);
  await ensureCategoryExists(product.categoryId);

  const existing = await productRepository.findProductBySlug(product.slug);
  if (existing) {
    throw createHttpError(409, "Product slug already exists");
  }

  return productRepository.createProduct(product);
};

const updateProduct = async (productId, payload) => {
  const existingProduct = await productRepository.findProductById(productId);
  if (!existingProduct) {
    throw createHttpError(404, "Product not found");
  }

  const product = normalizePayload(payload);
  await ensureCategoryExists(product.categoryId);

  const slugOwner = await productRepository.findProductBySlug(product.slug);
  if (slugOwner && slugOwner.id !== productId) {
    throw createHttpError(409, "Product slug already exists");
  }

  return productRepository.updateProduct(productId, product);
};

module.exports = {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
};
