const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userRepository = require("../users/user.repository");
const authRepository = require("./auth.repository");
const { sendMail } = require("../../utils/email");
const { jwtSecret, jwtExpiresIn, jwtRefreshSecret, jwtRefreshExpiresIn, appBaseUrl } = require("../../config/env");
const { createHttpError } = require("../../utils/httpError");

const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  first_name: user.first_name,
  last_name: user.last_name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  is_email_verified: user.is_email_verified,
  is_marketing_opt_in: user.is_marketing_opt_in,
  created_at: user.created_at,
  updated_at: user.updated_at,
});

const signAccessToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    jwtSecret,
    { expiresIn: jwtExpiresIn },
  );

const signRefreshToken = (user) =>
  jwt.sign(
    { id: user.id },
    jwtRefreshSecret,
    { expiresIn: jwtRefreshExpiresIn },
  );

const register = async ({ firstName, lastName, email, phone, password, isMarketingOptIn }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await userRepository.findByEmail(normalizedEmail);

  if (existingUser) throw createHttpError(409, "Email is already registered");

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await userRepository.createUser({
    name: `${firstName.trim()} ${lastName.trim()}`,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: normalizedEmail,
    phone: phone.trim(),
    passwordHash,
    isMarketingOptIn: Boolean(isMarketingOptIn),
  });

  const verifyToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await authRepository.saveEmailVerificationToken(user.id, verifyToken, expiresAt);

  await sendMail({
    to: user.email,
    subject: "Verify your email – Fashion Store",
    html: `<p>Hi ${user.first_name},</p>
           <p>Click the link below to verify your email. It expires in 24 hours.</p>
           <a href="${appBaseUrl}/api/auth/verify-email?token=${verifyToken}">Verify Email</a>`,
  });

  return { user: sanitizeUser(user) };
};

const login = async ({ email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await userRepository.findByEmail(normalizedEmail);

  if (!user) throw createHttpError(401, "Invalid email or password");

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) throw createHttpError(401, "Invalid email or password");

  if (!user.is_email_verified) throw createHttpError(403, "Please verify your email before logging in");

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await authRepository.saveRefreshToken(user.id, refreshToken, refreshExpiresAt);

  return { user: sanitizeUser(user), accessToken, refreshToken };
};

const refresh = async (token) => {
  const stored = await authRepository.findRefreshToken(token);
  if (!stored) throw createHttpError(401, "Invalid or expired refresh token");

  let payload;
  try {
    payload = jwt.verify(token, jwtRefreshSecret);
  } catch {
    throw createHttpError(401, "Invalid or expired refresh token");
  }

  const user = await userRepository.findById(payload.id);
  if (!user) throw createHttpError(401, "User not found");

  const accessToken = signAccessToken(user);
  return { accessToken };
};

const logout = async (token) => {
  await authRepository.deleteRefreshToken(token);
};

const verifyEmail = async (token) => {
  const record = await authRepository.findEmailVerificationToken(token);
  if (!record) throw createHttpError(400, "Invalid or expired verification link");

  await userRepository.markEmailVerified(record.user_id);
  await authRepository.deleteEmailVerificationToken(token);
};

const forgotPassword = async (email) => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await userRepository.findByEmail(normalizedEmail);

  if (!user) return;

  const resetToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await authRepository.savePasswordResetToken(user.id, resetToken, expiresAt);

  await sendMail({
    to: user.email,
    subject: "Reset your password – Fashion Store",
    html: `<p>Hi ${user.first_name},</p>
           <p>Click the link below to reset your password. It expires in 1 hour.</p>
           <a href="${appBaseUrl}/reset-password?token=${resetToken}">Reset Password</a>
           <p>If you didn't request this, ignore this email.</p>`,
  });
};

const resetPassword = async (token, newPassword) => {
  const record = await authRepository.findPasswordResetToken(token);
  if (!record) throw createHttpError(400, "Invalid or expired reset link");

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await userRepository.updatePassword(record.user_id, passwordHash);
  await authRepository.markPasswordResetTokenUsed(token);
  await authRepository.deleteAllRefreshTokens(record.user_id);
};

module.exports = { register, login, refresh, logout, verifyEmail, forgotPassword, resetPassword };
