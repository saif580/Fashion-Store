const { query } = require("../../config/db");

const saveRefreshToken = async (userId, token, expiresAt) => {
  await query(
    `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
    [userId, token, expiresAt],
  );
};

const findRefreshToken = async (token) => {
  const { rows } = await query(
    `SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()`,
    [token],
  );
  return rows[0] || null;
};

const deleteRefreshToken = async (token) => {
  await query(`DELETE FROM refresh_tokens WHERE token = $1`, [token]);
};

const deleteAllRefreshTokens = async (userId) => {
  await query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [userId]);
};

const saveEmailVerificationToken = async (userId, token, expiresAt) => {
  await query(
    `INSERT INTO email_verifications (user_id, token, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING`,
    [userId, token, expiresAt],
  );
};

const findEmailVerificationToken = async (token) => {
  const { rows } = await query(
    `SELECT * FROM email_verifications WHERE token = $1 AND expires_at > NOW()`,
    [token],
  );
  return rows[0] || null;
};

const deleteEmailVerificationToken = async (token) => {
  await query(`DELETE FROM email_verifications WHERE token = $1`, [token]);
};

const savePasswordResetToken = async (userId, token, expiresAt) => {
  await query(
    `DELETE FROM password_resets WHERE user_id = $1`,
    [userId],
  );
  await query(
    `INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)`,
    [userId, token, expiresAt],
  );
};

const findPasswordResetToken = async (token) => {
  const { rows } = await query(
    `SELECT * FROM password_resets WHERE token = $1 AND expires_at > NOW() AND used_at IS NULL`,
    [token],
  );
  return rows[0] || null;
};

const markPasswordResetTokenUsed = async (token) => {
  await query(
    `UPDATE password_resets SET used_at = NOW() WHERE token = $1`,
    [token],
  );
};

module.exports = {
  saveRefreshToken,
  findRefreshToken,
  deleteRefreshToken,
  deleteAllRefreshTokens,
  saveEmailVerificationToken,
  findEmailVerificationToken,
  deleteEmailVerificationToken,
  savePasswordResetToken,
  findPasswordResetToken,
  markPasswordResetTokenUsed,
};
