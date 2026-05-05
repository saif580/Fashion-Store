const userRepository = require("./user.repository");
const { createHttpError } = require("../../utils/httpError");
const MAX_ADDRESSES_PER_USER = 10;

const phonePattern = /^[0-9+\-\s()]{7,20}$/;

const validateProfilePayload = ({ firstName, lastName, phone }) => {
  if (!firstName?.trim()) {
    throw createHttpError(400, "First name is required");
  }

  if (!lastName?.trim()) {
    throw createHttpError(400, "Last name is required");
  }

  if (!phone?.trim()) {
    throw createHttpError(400, "Phone number is required");
  }

  if (!phonePattern.test(phone.trim())) {
    throw createHttpError(400, "Phone number format is invalid");
  }
};

const normalizeAddressPayload = (payload) => {
  const address = {
    label: payload.label?.trim() || "home",
    fullName: payload.fullName?.trim(),
    phone: payload.phone?.trim(),
    addressLine1: payload.addressLine1?.trim(),
    addressLine2: payload.addressLine2?.trim() || null,
    city: payload.city?.trim(),
    state: payload.state?.trim(),
    postalCode: payload.postalCode?.trim(),
    country: payload.country?.trim(),
    isDefaultShipping: Boolean(payload.isDefaultShipping),
    isDefaultBilling: Boolean(payload.isDefaultBilling),
  };

  const requiredFields = [
    ["fullName", "Full name is required"],
    ["phone", "Phone number is required"],
    ["addressLine1", "Address line 1 is required"],
    ["city", "City is required"],
    ["state", "State is required"],
    ["postalCode", "Postal code is required"],
    ["country", "Country is required"],
  ];

  for (const [field, message] of requiredFields) {
    if (!address[field]) {
      throw createHttpError(400, message);
    }
  }

  if (!phonePattern.test(address.phone)) {
    throw createHttpError(400, "Phone number format is invalid");
  }

  return address;
};

const getProfile = async (userId) => {
  const user = await userRepository.findById(userId);

  if (!user) {
    throw createHttpError(404, "User not found");
  }

  return user;
};

const updateProfile = async (userId, payload) => {
  validateProfilePayload(payload);
  const user = await userRepository.updateProfile(userId, payload);

  if (!user) {
    throw createHttpError(404, "User not found");
  }

  return user;
};

const listAddresses = async (userId) => userRepository.listAddressesByUserId(userId);

const createAddress = async (userId, payload) => {
  const address = normalizeAddressPayload(payload);
  const currentAddressCount = await userRepository.countAddressesByUserId(userId);

  if (currentAddressCount >= MAX_ADDRESSES_PER_USER) {
    throw createHttpError(400, `You can only save up to ${MAX_ADDRESSES_PER_USER} addresses`);
  }

  if (address.isDefaultShipping) {
    await userRepository.clearDefaultShipping(userId);
  }

  if (address.isDefaultBilling) {
    await userRepository.clearDefaultBilling(userId);
  }

  return userRepository.createAddress(userId, address);
};

const updateAddress = async (userId, addressId, payload) => {
  const existingAddress = await userRepository.findAddressById(userId, addressId);

  if (!existingAddress) {
    throw createHttpError(404, "Address not found");
  }

  const address = normalizeAddressPayload(payload);

  if (address.isDefaultShipping) {
    await userRepository.clearDefaultShipping(userId);
  }

  if (address.isDefaultBilling) {
    await userRepository.clearDefaultBilling(userId);
  }

  return userRepository.updateAddress(userId, addressId, address);
};

const deleteAddress = async (userId, addressId) => {
  const deleted = await userRepository.deleteAddress(userId, addressId);

  if (!deleted) {
    throw createHttpError(404, "Address not found");
  }

  return { message: "Address deleted successfully" };
};

const ALLOWED_ROLES = ["customer", "admin"];

const adminListUsers = async ({ page, limit, search, role } = {}) => {
  const p = Math.max(1, parseInt(page) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit) || 20));

  if (role != null && !ALLOWED_ROLES.includes(role)) {
    throw createHttpError(400, `Role must be one of ${ALLOWED_ROLES.join(", ")}`);
  }

  return userRepository.listUsers({ page: p, limit: l, search: search ?? null, role: role ?? null });
};

const adminUpdateUserRole = async (adminId, targetUserId, role) => {
  if (!ALLOWED_ROLES.includes(role)) {
    throw createHttpError(400, `Role must be one of ${ALLOWED_ROLES.join(", ")}`);
  }

  if (adminId === targetUserId) {
    throw createHttpError(400, "You cannot change your own role");
  }

  const user = await userRepository.findById(targetUserId);
  if (!user) throw createHttpError(404, "User not found");

  return userRepository.updateUserRole(targetUserId, role);
};

const adminSetUserActive = async (adminId, targetUserId, isActive) => {
  if (typeof isActive !== "boolean") {
    throw createHttpError(400, "isActive must be a boolean");
  }

  if (adminId === targetUserId) {
    throw createHttpError(400, "You cannot deactivate your own account");
  }

  const user = await userRepository.findById(targetUserId);
  if (!user) throw createHttpError(404, "User not found");

  return userRepository.setUserActive(targetUserId, isActive);
};

module.exports = {
  getProfile,
  updateProfile,
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  adminListUsers,
  adminUpdateUserRole,
  adminSetUserActive,
};
