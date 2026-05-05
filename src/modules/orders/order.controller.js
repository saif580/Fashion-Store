const orderService = require("./order.service");
const { sendSuccess } = require("../../utils/response");

const placeOrder = async (req, res, next) => {
  try {
    const order = await orderService.placeOrder(req.user.id, req.body);
    sendSuccess(res, order, 201);
  } catch (error) {
    next(error);
  }
};

const listOrders = async (req, res, next) => {
  try {
    const orders = await orderService.listOrders(req.user.id);
    sendSuccess(res, orders);
  } catch (error) {
    next(error);
  }
};

const getOrderById = async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(req.user.id, req.params.id);
    sendSuccess(res, order);
  } catch (error) {
    next(error);
  }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const order = await orderService.updateStatus(req.params.id, req.body.status);
    sendSuccess(res, order);
  } catch (error) {
    next(error);
  }
};

const adminListOrders = async (req, res, next) => {
  try {
    const result = await orderService.adminListOrders({
      page: req.query.page,
      limit: req.query.limit,
      status: typeof req.query.status === "string" ? req.query.status.trim() : null,
      userId: req.query.userId ?? null,
      search: typeof req.query.q === "string" ? req.query.q.trim() : null,
    });
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

const adminGetOrderById = async (req, res, next) => {
  try {
    const order = await orderService.adminGetOrderById(req.params.id);
    sendSuccess(res, order);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  placeOrder,
  listOrders,
  getOrderById,
  updateOrderStatus,
  adminListOrders,
  adminGetOrderById,
};
