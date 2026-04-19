const healthModel = require("../models/healthModel");

const getStatus = (req, res) => {
  res.json(healthModel.getStatus());
};

module.exports = {
  getStatus,
};
