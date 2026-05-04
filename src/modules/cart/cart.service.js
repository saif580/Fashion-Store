const cartRepository = require("./cart.repository");
const { createHttpError } = require("../../utils/httpError");

const normalizeQuantity = (value, fieldName = "quantity") => {
  const quantity = Number(value);

  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw createHttpError(400, `${fieldName} must be a positive integer`);
  }

  return quantity;
};

const normalizeCouponCode = (value) => {
  const code = String(value || "").trim();
  if (!code) {
    throw createHttpError(400, "Coupon code is required");
  }
  return code;
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

const calculateCouponDiscount = (subtotal, coupon) => {
  const amount = Number(subtotal);
  const couponValue = Number(coupon.value || 0);

  if (coupon.type === "percentage") {
    return Number((amount * (couponValue / 100)).toFixed(2));
  }

  if (coupon.type === "fixed") {
    return Math.min(amount, couponValue);
  }

  return 0;
};

const validateCoupon = (subtotal, coupon) => {
  if (!coupon) {
    throw createHttpError(404, "Coupon not found");
  }

  if (!coupon.is_active) {
    throw createHttpError(400, "Coupon is not active");
  }

  if (coupon.expires_at && new Date(coupon.expires_at) <= new Date()) {
    throw createHttpError(400, "Coupon has expired");
  }

  if (coupon.usage_limit !== null && coupon.uses_count >= coupon.usage_limit) {
    throw createHttpError(400, "Coupon has reached its usage limit");
  }

  if (Number(subtotal) < Number(coupon.min_purchase_amount || 0)) {
    throw createHttpError(400, `Cart subtotal must be at least Rs. ${coupon.min_purchase_amount} to use this coupon`);
  }
};

const buildCartResponse = async (cart) => {
  if (!cart || !cart.id) {
    return cart;
  }

  const coupon = await cartRepository.findCartCouponByCartId(cart.id);

  if (!coupon) {
    return {
      ...cart,
      coupon: null,
      summary: {
        ...cart.summary,
        discount_amount: 0,
        free_shipping: false,
        total: cart.summary.subtotal,
      },
    };
  }

  try {
    validateCoupon(cart.summary.subtotal, coupon);
  } catch (error) {
    await cartRepository.removeCouponFromCart(cart.id);
    return {
      ...cart,
      coupon: null,
      summary: {
        ...cart.summary,
        discount_amount: 0,
        free_shipping: false,
        total: cart.summary.subtotal,
      },
    };
  }

  const discount = calculateCouponDiscount(cart.summary.subtotal, coupon);
  const total = Math.max(0, cart.summary.subtotal - discount);

  return {
    ...cart,
    coupon: {
      code: coupon.code,
      type: coupon.type,
      value: Number(coupon.value),
      min_purchase_amount: Number(coupon.min_purchase_amount || 0),
      free_shipping: coupon.type === "free_shipping",
      applied_at: coupon.applied_at,
    },
    summary: {
      ...cart.summary,
      discount_amount: discount,
      free_shipping: coupon.type === "free_shipping",
      total,
    },
  };
};

const getCart = async (userId) => {
  const cart = await cartRepository.getCartByUserId(userId);
  return buildCartResponse(cart);
};

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
  const cart = await cartRepository.getCartByUserId(userId);
  return buildCartResponse(cart);
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
  const cart = await cartRepository.getCartByUserId(userId);
  return buildCartResponse(cart);
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

  const cart = await cartRepository.getCartByUserId(userId);
  return buildCartResponse(cart);
};

const clearCart = async (userId) => {
  const removedCount = await cartRepository.clearCart(userId);
  const cart = await cartRepository.getCartByUserId(userId);

  return {
    ...cart,
    coupon: null,
    summary: {
      ...cart.summary,
      discount_amount: 0,
      free_shipping: false,
      total: cart.summary.subtotal,
    },
    message: removedCount > 0 ? "Cart cleared successfully" : "Cart was already empty",
  };
};

const applyCoupon = async (userId, payload) => {
  const code = normalizeCouponCode(payload.code);
  const cart = await cartRepository.getCartByUserId(userId);
  const coupon = await cartRepository.findCouponByCode(code);

  validateCoupon(cart.summary.subtotal, coupon);

  await cartRepository.applyCouponToCart(cart.id, coupon.id);
  const updatedCart = await cartRepository.getCartByUserId(userId);
  return buildCartResponse(updatedCart);
};

module.exports = {
  getCart,
  addItem,
  updateItemQuantity,
  removeItem,
  clearCart,
  applyCoupon,
};
