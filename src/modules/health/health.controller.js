const healthService = require("./health.service");
const { sendSuccess } = require("../../utils/response");

const getStatus = (req, res) => {
  const data = healthService.getStatus();
  sendSuccess(res, data);
};

module.exports = { getStatus };
