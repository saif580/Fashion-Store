const cartRepository = require("./cart.repository");
const { createHttpError } = require("../../utils/httpError");

const normalizeQuantity = (value, fieldName = "quantity") => {
  const quantity = Number(value);

  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw createHttpError(400, `${fieldName} must be a positive integer`);
  }

  return quantity;
};

const ensureVariantCanBeAdded = (variant, quantity) => {
  if (!variant) {
    throw createHttpError(404, "Product variant not found");
  }

  if (!variant.product_is_active || !variant.variant_is_active) {
    throw createHttpError(400, "This product variant is not available");
  }

  if (variant.inventory_quantity < quantity) {
    throw createHttpError(400, `Only ${variant.inventory_quantity} item(s) are available for this variant`);
  }
};

const getCart = async (userId) => cartRepository.getCartByUserId(userId);

const addItem = async (userId, payload) => {
  const variantId = Number(payload.variantId);
  if (!Number.isInteger(variantId) || variantId <= 0) {
    throw createHttpError(400, "variantId must be a positive integer");
  }

  const quantity = normalizeQuantity(payload.quantity);
  const variant = await cartRepository.findVariantForCart(variantId);
  ensureVariantCanBeAdded(variant, quantity);

  const currentCart = await cartRepository.getCartByUserId(userId);
  const existingItem = currentCart.items.find((item) => item.variant_id === variantId);
  const targetQuantity = existingItem ? existingItem.quantity + quantity : quantity;
  ensureVariantCanBeAdded(variant, targetQuantity);

  await cartRepository.addItemToCart(userId, variant, quantity);
  return cartRepository.getCartByUserId(userId);
};

const updateItemQuantity = async (userId, cartItemId, payload) => {
  const itemId = Number(cartItemId);
  if (!Number.isInteger(itemId) || itemId <= 0) {
    throw createHttpError(400, "Cart item id must be a positive integer");
  }

  const quantity = normalizeQuantity(payload.quantity);
  const existingItem = await cartRepository.findCartItemById(userId, itemId);

  if (!existingItem) {
    throw createHttpError(404, "Cart item not found");
  }

  const variant = await cartRepository.findVariantForCart(existingItem.variant_id);
  ensureVariantCanBeAdded(variant, quantity);

  await cartRepository.updateCartItemQuantity(userId, itemId, quantity);
  return cartRepository.getCartByUserId(userId);
};

const removeItem = async (userId, cartItemId) => {
  const itemId = Number(cartItemId);
  if (!Number.isInteger(itemId) || itemId <= 0) {
    throw createHttpError(400, "Cart item id must be a positive integer");
  }

  const deleted = await cartRepository.deleteCartItem(userId, itemId);
  if (!deleted) {
    throw createHttpError(404, "Cart item not found");
  }

  return cartRepository.getCartByUserId(userId);
};

const clearCart = async (userId) => {
  const removedCount = await cartRepository.clearCart(userId);
  const cart = await cartRepository.getCartByUserId(userId);

  return {
    ...cart,
    message: removedCount > 0 ? "Cart cleared successfully" : "Cart was already empty",
  };
};

module.exports = {
  getCart,
  addItem,
  updateItemQuantity,
  removeItem,
  clearCart,
};
