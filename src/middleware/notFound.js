const { sendError } = require("../utils/response");

const notFound = (req, res) => {
  sendError(res, `Route ${req.originalUrl} not found`, 404);
};

module.exports = notFound;
