const { query } = require("../../config/db");

const createPaymentRecord = async (orderId, razorpayOrderId, amountPaise) => {
  const { rows } = await query(
    `
      INSERT INTO order_payments (order_id, razorpay_order_id, amount_paise)
      VALUES ($1, $2, $3)
      ON CONFLICT (razorpay_order_id) DO UPDATE
        SET updated_at = NOW()
      RETURNING *;
    `,
    [orderId, razorpayOrderId, amountPaise],
  );
  return rows[0];
};

const findPaymentByOrderId = async (orderId) => {
  const { rows } = await query(
    `SELECT * FROM order_payments WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1;`,
    [orderId],
  );
  return rows[0] || null;
};

const findPaymentByRazorpayOrderId = async (razorpayOrderId) => {
  const { rows } = await query(
    `SELECT * FROM order_payments WHERE razorpay_order_id = $1 LIMIT 1;`,
    [razorpayOrderId],
  );
  return rows[0] || null;
};

const markPaymentPaid = async (razorpayOrderId, razorpayPaymentId, razorpaySignature, method) => {
  const { rows } = await query(
    `
      UPDATE order_payments
      SET
        razorpay_payment_id = $2,
        razorpay_signature   = $3,
        method               = $4,
        status               = 'paid'
      WHERE razorpay_order_id = $1
      RETURNING *;
    `,
    [razorpayOrderId, razorpayPaymentId, razorpaySignature, method || null],
  );
  return rows[0] || null;
};

const markPaymentFailed = async (razorpayOrderId) => {
  const { rows } = await query(
    `
      UPDATE order_payments
      SET status = 'failed'
      WHERE razorpay_order_id = $1
      RETURNING *;
    `,
    [razorpayOrderId],
  );
  return rows[0] || null;
};

module.exports = {
  createPaymentRecord,
  findPaymentByOrderId,
  findPaymentByRazorpayOrderId,
  markPaymentPaid,
  markPaymentFailed,
};
