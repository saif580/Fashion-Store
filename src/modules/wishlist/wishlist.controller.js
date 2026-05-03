const wishlistService = require("./wishlist.service");
const { sendSuccess } = require("../../utils/response");

const getWishlist = async (req, res, next) => {
  try {
    const wishlist = await wishlistService.getWishlist(req.user.id);
    sendSuccess(res, wishlist);
  } catch (error) {
    next(error);
  }
};

const addItem = async (req, res, next) => {
  try {
    const wishlist = await wishlistService.addItem(req.user.id, req.body);
    sendSuccess(res, wishlist, 201);
  } catch (error) {
    next(error);
  }
};

const removeItem = async (req, res, next) => {
  try {
    const wishlist = await wishlistService.removeItem(req.user.id, req.params.id);
    sendSuccess(res, wishlist);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWishlist,
  addItem,
  removeItem,
};
