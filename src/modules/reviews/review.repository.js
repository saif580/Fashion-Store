const { query } = require("../../config/db");

const mapReview = (row) => ({
  id: row.id,
  product_id: row.product_id,
  user_id: row.user_id,
  reviewer_name: row.reviewer_name,
  rating: row.rating,
  title: row.title || null,
  body: row.body || null,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const listReviews = async (productId, { page = 1, limit = 20 } = {}) => {
  const offset = (page - 1) * limit;

  const [countResult, rowsResult] = await Promise.all([
    query(
      `SELECT COUNT(*) FROM product_reviews WHERE product_id = $1;`,
      [productId],
    ),
    query(
      `
        SELECT
          pr.id,
          pr.product_id,
          pr.user_id,
          u.name AS reviewer_name,
          pr.rating,
          pr.title,
          pr.body,
          pr.created_at,
          pr.updated_at
        FROM product_reviews pr
        INNER JOIN users u ON u.id = pr.user_id
        WHERE pr.product_id = $1
        ORDER BY pr.created_at DESC
        LIMIT $2 OFFSET $3;
      `,
      [productId, limit, offset],
    ),
  ]);

  return {
    reviews: rowsResult.rows.map(mapReview),
    total: Number(countResult.rows[0].count),
  };
};

const getReviewStats = async (productId) => {
  const { rows } = await query(
    `
      SELECT
        ROUND(AVG(rating)::numeric, 1) AS average_rating,
        COUNT(*) AS review_count
      FROM product_reviews
      WHERE product_id = $1;
    `,
    [productId],
  );

  const row = rows[0];
  return {
    average: row.average_rating !== null ? Number(row.average_rating) : null,
    count: Number(row.review_count),
  };
};

const getRatingStatsBatch = async (productIds) => {
  if (!productIds.length) return new Map();

  const { rows } = await query(
    `
      SELECT
        product_id,
        ROUND(AVG(rating)::numeric, 1) AS average_rating,
        COUNT(*) AS review_count
      FROM product_reviews
      WHERE product_id = ANY($1::int[])
      GROUP BY product_id;
    `,
    [productIds],
  );

  return new Map(
    rows.map((r) => [
      r.product_id,
      { average: Number(r.average_rating), count: Number(r.review_count) },
    ]),
  );
};

const findReviewByUserAndProduct = async (userId, productId) => {
  const { rows } = await query(
    `SELECT id FROM product_reviews WHERE user_id = $1 AND product_id = $2;`,
    [userId, productId],
  );
  return rows[0] || null;
};

const createReview = async (userId, productId, { rating, title, body }) => {
  const { rows } = await query(
    `
      INSERT INTO product_reviews (product_id, user_id, rating, title, body)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, product_id, user_id, rating, title, body, created_at, updated_at;
    `,
    [productId, userId, rating, title || null, body || null],
  );
  return rows[0];
};

module.exports = {
  listReviews,
  getReviewStats,
  getRatingStatsBatch,
  findReviewByUserAndProduct,
  createReview,
};
