const { query } = require("../../config/db");

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

module.exports = {
  createUser,
  findByEmail,
  findById,
  markEmailVerified,
  updatePassword,
};
