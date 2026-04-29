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

const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return next(createHttpError(401, "Authentication is required"));
  }

  if (!allowedRoles.includes(req.user.role)) {
    return next(createHttpError(403, "You do not have permission to access this resource"));
  }

  next();
};

module.exports = { requireAuth, requireRole };
