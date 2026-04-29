const userService = require("./user.service");
const { sendSuccess } = require("../../utils/response");

const getProfile = async (req, res, next) => {
  try {
    const user = await userService.getProfile(req.user.id);
    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const user = await userService.updateProfile(req.user.id, req.body);
    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
};

const listAddresses = async (req, res, next) => {
  try {
    const addresses = await userService.listAddresses(req.user.id);
    sendSuccess(res, addresses);
  } catch (error) {
    next(error);
  }
};

const createAddress = async (req, res, next) => {
  try {
    const address = await userService.createAddress(req.user.id, req.body);
    sendSuccess(res, address, 201);
  } catch (error) {
    next(error);
  }
};

const updateAddress = async (req, res, next) => {
  try {
    const address = await userService.updateAddress(req.user.id, Number(req.params.addressId), req.body);
    sendSuccess(res, address);
  } catch (error) {
    next(error);
  }
};

const deleteAddress = async (req, res, next) => {
  try {
    const result = await userService.deleteAddress(req.user.id, Number(req.params.addressId));
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

const getAdminAccess = async (req, res, next) => {
  try {
    sendSuccess(res, {
      message: "Admin access granted",
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  getAdminAccess,
};
