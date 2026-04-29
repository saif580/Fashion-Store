const authService = require("./auth.service");
const { sendSuccess } = require("../../utils/response");
const { createHttpError } = require("../../utils/httpError");

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[0-9+\-\s()]{7,20}$/;

const validateAuthPayload = (payload, isRegister) => {
  const { firstName, lastName, email, phone, password, confirmPassword, acceptTerms } = payload;

  if (isRegister && !firstName?.trim()) throw createHttpError(400, "First name is required");
  if (isRegister && !lastName?.trim()) throw createHttpError(400, "Last name is required");
  if (!email?.trim()) throw createHttpError(400, "Email is required");
  if (!emailPattern.test(email.trim().toLowerCase())) throw createHttpError(400, "Email format is invalid");
  if (isRegister && !phone?.trim()) throw createHttpError(400, "Phone number is required");
  if (isRegister && !phonePattern.test(phone.trim())) throw createHttpError(400, "Phone number format is invalid");
  if (!password || password.length < 8) throw createHttpError(400, "Password must be at least 8 characters long");
  if (!/\d/.test(password)) throw createHttpError(400, "Password must contain at least one number");
  if (isRegister && password !== confirmPassword) throw createHttpError(400, "Password and confirm password must match");
  if (isRegister && acceptTerms !== true) throw createHttpError(400, "Terms must be accepted");
};

const register = async (req, res, next) => {
  try {
    validateAuthPayload(req.body, true);
    const result = await authService.register(req.body);
    sendSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    validateAuthPayload(req.body, false);
    const result = await authService.login(req.body);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw createHttpError(400, "Refresh token is required");
    const result = await authService.refresh(refreshToken);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw createHttpError(400, "Refresh token is required");
    await authService.logout(refreshToken);
    sendSuccess(res, { message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) throw createHttpError(400, "Verification token is required");
    await authService.verifyEmail(token);
    sendSuccess(res, { message: "Email verified successfully" });
  } catch (error) {
    next(error);
  }
};

const resendVerificationEmail = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email?.trim()) throw createHttpError(400, "Email is required");
    if (!emailPattern.test(email.trim().toLowerCase())) throw createHttpError(400, "Email format is invalid");
    await authService.resendVerificationEmail(email);
    sendSuccess(res, { message: "If the account exists and is unverified, a new verification email has been sent" });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email?.trim()) throw createHttpError(400, "Email is required");
    await authService.forgotPassword(email);
    sendSuccess(res, { message: "If that email exists, a reset link has been sent" });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, password, confirmPassword } = req.body;
    if (!token) throw createHttpError(400, "Reset token is required");
    if (!password || password.length < 8) throw createHttpError(400, "Password must be at least 8 characters long");
    if (!/\d/.test(password)) throw createHttpError(400, "Password must contain at least one number");
    if (password !== confirmPassword) throw createHttpError(400, "Passwords do not match");
    await authService.resetPassword(token, password);
    sendSuccess(res, { message: "Password reset successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
};
