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

module.exports = { getProfile, getAdminAccess };
