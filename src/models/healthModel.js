const { appEnv } = require("../config/env");

const getStatus = () => {
  return {
    message: "Backend is running",
    environment: appEnv,
  };
};

module.exports = {
  getStatus,
};
