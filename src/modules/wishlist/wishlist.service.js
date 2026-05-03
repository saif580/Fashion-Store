const wishlistRepository = require("./wishlist.repository");
const { query } = require("../../config/db");
const { createHttpError } = require("../../utils/httpError");

const getWishlist = async (userId) => {
  const items = await wishlistRepository.getWishlistByUserId(userId);
  return { items, total: items.length };
};

const addItem = async (userId, payload) => {
  const productId = Number(payload.productId);
  if (!Number.isInteger(productId) || productId <= 0) {
    throw createHttpError(400, "productId must be a positive integer");
  }

  const { rows } = await query(
    `SELECT id, is_active FROM products WHERE id = $1;`,
    [productId],
  );
  const product = rows[0];

  if (!product) {
    throw createHttpError(404, "Product not found");
  }

  if (!product.is_active) {
    throw createHttpError(400, "This product is not available");
  }

  const existing = await wishlistRepository.findWishlistItem(userId, productId);
  if (existing) {
    throw createHttpError(409, "Product is already in your wishlist");
  }

  await wishlistRepository.addToWishlist(userId, productId);
  return wishlistRepository.getWishlistByUserId(userId).then((items) => ({ items, total: items.length }));
};

const removeItem = async (userId, wishlistItemId) => {
  const itemId = Number(wishlistItemId);
  if (!Number.isInteger(itemId) || itemId <= 0) {
    throw createHttpError(400, "Wishlist item id must be a positive integer");
  }

  const deleted = await wishlistRepository.removeFromWishlist(userId, itemId);
  if (!deleted) {
    throw createHttpError(404, "Wishlist item not found");
  }

  const items = await wishlistRepository.getWishlistByUserId(userId);
  return { items, total: items.length };
};

module.exports = {
  getWishlist,
  addItem,
  removeItem,
};
