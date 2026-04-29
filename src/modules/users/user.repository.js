const { query } = require("../../config/db");
const addressSelectColumns = `
  id,
  user_id,
  label,
  full_name,
  phone,
  address_line_1,
  address_line_2,
  city,
  state,
  postal_code,
  country,
  is_default_shipping,
  is_default_billing,
  created_at,
  updated_at
`;

const createUser = async ({
  name,
  firstName,
  lastName,
  email,
  phone,
  passwordHash,
  isMarketingOptIn = false,
  role = "customer",
}) => {
  const sql = `
    INSERT INTO users (
      name,
      first_name,
      last_name,
      email,
      phone,
      password_hash,
      role,
      is_marketing_opt_in
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING
      id,
      name,
      first_name,
      last_name,
      email,
      phone,
      role,
      is_email_verified,
      is_marketing_opt_in,
      created_at,
      updated_at;
  `;

  const { rows } = await query(sql, [
    name,
    firstName,
    lastName,
    email,
    phone,
    passwordHash,
    role,
    isMarketingOptIn,
  ]);
  return rows[0];
};

const findByEmail = async (email) => {
  const { rows } = await query(
    `
      SELECT
        id,
        name,
        first_name,
        last_name,
        email,
        phone,
        role,
        is_email_verified,
        is_marketing_opt_in,
        password_hash,
        created_at,
        updated_at
      FROM users
      WHERE email = $1;
    `,
    [email],
  );

  return rows[0] || null;
};

const findById = async (id) => {
  const { rows } = await query(
    `
      SELECT
        id,
        name,
        first_name,
        last_name,
        email,
        phone,
        role,
        is_email_verified,
        is_marketing_opt_in,
        created_at,
        updated_at
      FROM users
      WHERE id = $1;
    `,
    [id],
  );

  return rows[0] || null;
};

const markEmailVerified = async (userId) => {
  await query(`UPDATE users SET is_email_verified = TRUE WHERE id = $1`, [userId]);
};

const updatePassword = async (userId, passwordHash) => {
  await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [passwordHash, userId]);
};

const updateProfile = async (userId, { firstName, lastName, phone, isMarketingOptIn }) => {
  const name = `${firstName.trim()} ${lastName.trim()}`;
  const { rows } = await query(
    `
      UPDATE users
      SET
        name = $2,
        first_name = $3,
        last_name = $4,
        phone = $5,
        is_marketing_opt_in = $6
      WHERE id = $1
      RETURNING
        id,
        name,
        first_name,
        last_name,
        email,
        phone,
        role,
        is_email_verified,
        is_marketing_opt_in,
        created_at,
        updated_at;
    `,
    [userId, name, firstName.trim(), lastName.trim(), phone.trim(), Boolean(isMarketingOptIn)],
  );

  return rows[0] || null;
};

const listAddressesByUserId = async (userId) => {
  const { rows } = await query(
    `
      SELECT
        ${addressSelectColumns}
      FROM user_addresses
      WHERE user_id = $1
      ORDER BY created_at DESC;
    `,
    [userId],
  );

  return rows;
};

const findAddressById = async (userId, addressId) => {
  const { rows } = await query(
    `
      SELECT
        ${addressSelectColumns}
      FROM user_addresses
      WHERE user_id = $1 AND id = $2;
    `,
    [userId, addressId],
  );

  return rows[0] || null;
};

const clearDefaultShipping = async (userId) => {
  await query(
    `UPDATE user_addresses SET is_default_shipping = FALSE WHERE user_id = $1`,
    [userId],
  );
};

const clearDefaultBilling = async (userId) => {
  await query(
    `UPDATE user_addresses SET is_default_billing = FALSE WHERE user_id = $1`,
    [userId],
  );
};

const createAddress = async (userId, address) => {
  const { rows } = await query(
    `
      INSERT INTO user_addresses (
        user_id,
        label,
        full_name,
        phone,
        address_line_1,
        address_line_2,
        city,
        state,
        postal_code,
        country,
        is_default_shipping,
        is_default_billing
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING
        ${addressSelectColumns};
    `,
    [
      userId,
      address.label,
      address.fullName,
      address.phone,
      address.addressLine1,
      address.addressLine2,
      address.city,
      address.state,
      address.postalCode,
      address.country,
      address.isDefaultShipping,
      address.isDefaultBilling,
    ],
  );

  return rows[0];
};

const updateAddress = async (userId, addressId, address) => {
  const { rows } = await query(
    `
      UPDATE user_addresses
      SET
        label = $3,
        full_name = $4,
        phone = $5,
        address_line_1 = $6,
        address_line_2 = $7,
        city = $8,
        state = $9,
        postal_code = $10,
        country = $11,
        is_default_shipping = $12,
        is_default_billing = $13
      WHERE user_id = $1 AND id = $2
      RETURNING
        ${addressSelectColumns};
    `,
    [
      userId,
      addressId,
      address.label,
      address.fullName,
      address.phone,
      address.addressLine1,
      address.addressLine2,
      address.city,
      address.state,
      address.postalCode,
      address.country,
      address.isDefaultShipping,
      address.isDefaultBilling,
    ],
  );

  return rows[0] || null;
};

const deleteAddress = async (userId, addressId) => {
  const { rows } = await query(
    `
      DELETE FROM user_addresses
      WHERE user_id = $1 AND id = $2
      RETURNING
        ${addressSelectColumns};
    `,
    [userId, addressId],
  );

  return rows[0] || null;
};

const countAddressesByUserId = async (userId) => {
  const { rows } = await query(
    `
      SELECT COUNT(*)::int AS count
      FROM user_addresses
      WHERE user_id = $1;
    `,
    [userId],
  );

  return rows[0]?.count || 0;
};

module.exports = {
  createUser,
  findByEmail,
  findById,
  markEmailVerified,
  updatePassword,
  updateProfile,
  listAddressesByUserId,
  findAddressById,
  clearDefaultShipping,
  clearDefaultBilling,
  createAddress,
  updateAddress,
  deleteAddress,
  countAddressesByUserId,
};
