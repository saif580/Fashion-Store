const inventoryService = require("./inventory.service");
const { sendSuccess } = require("../../utils/response");

const reserveCheckoutStock = async (req, res, next) => {
  try {
    const reservation = await inventoryService.reserveCheckoutStock(req.user.id, req.body);
    sendSuccess(res, reservation, 201);
  } catch (error) {
    next(error);
  }
};

const listLowStockVariants = async (req, res, next) => {
  try {
    const variants = await inventoryService.listLowStockVariants(req.query.threshold);
    sendSuccess(res, variants);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  reserveCheckoutStock,
  listLowStockVariants,
};
