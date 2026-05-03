const productRepository = require("./product.repository");
const categoryRepository = require("../categories/category.repository");
const { createHttpError } = require("../../utils/httpError");
const { slugify } = require("../../utils/slug");
const { cloudinary, deleteCloudinaryAsset } = require("../../config/cloudinary");

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

const normalizeImage = (image, index) => {
  const imageUrl = image.imageUrl?.trim();

  if (!imageUrl) {
    throw createHttpError(400, "Each product image must have an imageUrl");
  }

  return {
    imageUrl,
    publicId: image.publicId?.trim() || null,
    width: Number.isInteger(Number(image.width)) ? Number(image.width) : null,
    height: Number.isInteger(Number(image.height)) ? Number(image.height) : null,
    altText: image.altText?.trim() || null,
    sortOrder: Number.isInteger(Number(image.sortOrder)) ? Number(image.sortOrder) : index,
    variantSku: image.variantSku?.trim() || null,
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

  if (
    payload.popularityScore !== undefined
    && (!Number.isInteger(Number(payload.popularityScore)) || Number(payload.popularityScore) < 0)
  ) {
    throw createHttpError(400, "Popularity score must be a non-negative integer");
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
    ? payload.images.map(normalizeImage)
    : [];

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
    popularityScore: payload.popularityScore === undefined ? 0 : Number(payload.popularityScore),
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

const ensureVariantImageReferencesExist = (variants, images) => {
  const variantSkus = new Set(variants.map((variant) => variant.sku));

  for (const image of images) {
    if (image.variantSku && !variantSkus.has(image.variantSku)) {
      throw createHttpError(400, `Image variantSku "${image.variantSku}" does not exist in the product variants`);
    }
  }
};

const resolveCategoryIds = async ({ categoryId, categorySlug }) => {
  if (categoryId) {
    const category = await categoryRepository.findCategoryById(categoryId);
    if (!category) {
      throw createHttpError(400, "Category filter not found");
    }
    return categoryRepository.listCategoryTreeIds(categoryId);
  }

  if (categorySlug) {
    const category = await categoryRepository.findCategoryBySlug(categorySlug);
    if (!category) {
      throw createHttpError(400, "Category filter not found");
    }
    return categoryRepository.listCategoryTreeIds(category.id);
  }

  return [];
};

const listProducts = async ({
  page,
  limit,
  onlyActive,
  search,
  categoryId,
  categorySlug,
  minPrice,
  maxPrice,
  sizes,
  colors,
  sortBy,
} = {}) => {
  const allowedSorts = new Set(["newest", "price_asc", "price_desc", "popularity"]);
  const hasCategoryId = categoryId !== null && categoryId !== undefined;
  const hasMinPrice = minPrice !== null && minPrice !== undefined;
  const hasMaxPrice = maxPrice !== null && maxPrice !== undefined;

  if (hasCategoryId && (!Number.isInteger(Number(categoryId)) || Number(categoryId) <= 0)) {
    throw createHttpError(400, "Category filter must be a positive integer");
  }

  if (hasMinPrice && !Number.isFinite(Number(minPrice))) {
    throw createHttpError(400, "Minimum price must be a valid number");
  }

  if (hasMaxPrice && !Number.isFinite(Number(maxPrice))) {
    throw createHttpError(400, "Maximum price must be a valid number");
  }

  if (hasMinPrice && Number(minPrice) < 0) {
    throw createHttpError(400, "Minimum price cannot be negative");
  }

  if (hasMaxPrice && Number(maxPrice) < 0) {
    throw createHttpError(400, "Maximum price cannot be negative");
  }

  if (hasMinPrice && hasMaxPrice && Number(minPrice) > Number(maxPrice)) {
    throw createHttpError(400, "Minimum price cannot be greater than maximum price");
  }

  if (sortBy && !allowedSorts.has(sortBy)) {
    throw createHttpError(400, "Sort must be one of newest, price_asc, price_desc, or popularity");
  }

  const categoryIds = await resolveCategoryIds({ categoryId, categorySlug });

  return productRepository.listProducts({
    page,
    limit,
    onlyActive,
    search,
    categoryIds,
    minPrice: minPrice === null || minPrice === undefined ? null : Number(minPrice),
    maxPrice: maxPrice === null || maxPrice === undefined ? null : Number(maxPrice),
    sizes,
    colors,
    sortBy,
  });
};

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
  ensureVariantImageReferencesExist(product.variants, product.images);

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
  ensureVariantImageReferencesExist(product.variants, product.images);
  if (payload.popularityScore === undefined) {
    product.popularityScore = Number(existingProduct.popularity_score || 0);
  }

  const slugOwner = await productRepository.findProductBySlug(product.slug);
  if (slugOwner && slugOwner.id !== productId) {
    throw createHttpError(409, "Product slug already exists");
  }

  const updatedProduct = await productRepository.updateProduct(productId, product);

  const retainedPublicIds = new Set(product.images.map((image) => image.publicId).filter(Boolean));
  const removedPublicIds = existingProduct.images
    .map((image) => image.cloudinary_public_id)
    .filter((publicId) => publicId && !retainedPublicIds.has(publicId));

  await Promise.allSettled(removedPublicIds.map((publicId) => deleteCloudinaryAsset(publicId)));

  return updatedProduct;
};

const uploadProductImages = async (files) => {
  if (!Array.isArray(files) || files.length === 0) {
    throw createHttpError(400, "At least one image file is required");
  }

  const results = await Promise.all(
    files.map(async (file, index) => {
      const resource = await cloudinary.api.resource(file.filename);
      return {
        imageUrl: file.path,
        publicId: file.filename || null,
        width: resource.width ?? null,
        height: resource.height ?? null,
        format: resource.format ?? null,
        originalFilename: file.originalname,
        sortOrder: index,
      };
    })
  );

  return results;
};

module.exports = {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  uploadProductImages,
};
