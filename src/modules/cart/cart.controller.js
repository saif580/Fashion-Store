const cartService = require("./cart.service");
const { sendSuccess } = require("../../utils/response");

const getCart = async (req, res, next) => {
  try {
    const cart = await cartService.getCart(req.user.id);
    sendSuccess(res, cart);
  } catch (error) {
    next(error);
  }
};

const addItem = async (req, res, next) => {
  try {
    const cart = await cartService.addItem(req.user.id, req.body);
    sendSuccess(res, cart, 201);
  } catch (error) {
    next(error);
  }
};

const updateItemQuantity = async (req, res, next) => {
  try {
    const cart = await cartService.updateItemQuantity(req.user.id, req.params.id, req.body);
    sendSuccess(res, cart);
  } catch (error) {
    next(error);
  }
};

const removeItem = async (req, res, next) => {
  try {
    const cart = await cartService.removeItem(req.user.id, req.params.id);
    sendSuccess(res, cart);
  } catch (error) {
    next(error);
  }
};

const clearCart = async (req, res, next) => {
  try {
    const cart = await cartService.clearCart(req.user.id);
    sendSuccess(res, cart);
  } catch (error) {
    next(error);
  }
};

const applyCoupon = async (req, res, next) => {
  try {
    const cart = await cartService.applyCoupon(req.user.id, req.body);
    sendSuccess(res, cart);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCart,
  addItem,
  updateItemQuantity,
  removeItem,
  clearCart,
  applyCoupon,
};
