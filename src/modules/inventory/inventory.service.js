const inventoryRepository = require("./inventory.repository");
const { createHttpError } = require("../../utils/httpError");

const reserveCheckoutStock = async (userId, payload = {}) => {
  const holdMinutes = payload.holdMinutes === undefined ? 15 : Number(payload.holdMinutes);
  if (!Number.isInteger(holdMinutes) || holdMinutes <= 0 || holdMinutes > 30) {
    throw createHttpError(400, "holdMinutes must be an integer between 1 and 30");
  }

  const reservation = await inventoryRepository.reserveCartForCheckout(userId, holdMinutes);
  if (!reservation) {
    throw createHttpError(400, "Your cart is empty");
  }

  return reservation;
};

const listLowStockVariants = async (threshold) => {
  if (threshold !== undefined && threshold !== null) {
    const parsed = Number(threshold);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw createHttpError(400, "threshold must be a non-negative integer");
    }
    return inventoryRepository.listLowStockVariants(parsed);
  }

  return inventoryRepository.listLowStockVariants(null);
};

module.exports = {
  reserveCheckoutStock,
  listLowStockVariants,
};
