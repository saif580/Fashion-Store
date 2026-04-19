const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config/env");
const { createHttpError } = require("../utils/httpError");

const requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      return next(createHttpError(401, "Authorization token is required"));
    }

    req.user = jwt.verify(token, jwtSecret);
    next();
  } catch (error) {
    next(createHttpError(401, "Invalid or expired token"));
  }
};

module.exports = { requireAuth };
