const userRepository = require("./user.repository");
const { createHttpError } = require("../../utils/httpError");

const getProfile = async (userId) => {
  const user = await userRepository.findById(userId);

  if (!user) {
    throw createHttpError(404, "User not found");
  }

  return user;
};

module.exports = { getProfile };
