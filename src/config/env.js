const dotenv = require("dotenv");

const appEnv = process.env.APP_ENV || "dev";
dotenv.config({ path: `.env.${appEnv}` });

module.exports = {
  appEnv,
  port: process.env.PORT || 3000,
};
