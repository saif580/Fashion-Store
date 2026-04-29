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

module.exports = {
  getProfile,
  updateProfile,
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
};
