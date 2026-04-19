const { sendError } = require("../utils/response");

const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";
  sendError(res, message, status);
};

module.exports = errorHandler;
