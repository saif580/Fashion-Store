const reviewRepository = require("./review.repository");
const { query } = require("../../config/db");
const { createHttpError } = require("../../utils/httpError");

const ensureProductExists = async (productId) => {
  const { rows } = await query(
    `SELECT id FROM products WHERE id = $1 AND is_active = true;`,
    [productId],
  );
  if (!rows[0]) {
    throw createHttpError(404, "Product not found");
  }
};

const getReviews = async (productId, queryParams = {}) => {
  const id = Number(productId);
  if (!Number.isInteger(id) || id <= 0) {
    throw createHttpError(400, "productId must be a positive integer");
  }

  await ensureProductExists(id);

  const page = Math.max(1, Number(queryParams.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(queryParams.limit) || 20));

  const [{ reviews, total }, stats] = await Promise.all([
    reviewRepository.listReviews(id, { page, limit }),
    reviewRepository.getReviewStats(id),
  ]);

  return {
    reviews,
    rating: stats,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const submitReview = async (userId, productId, payload) => {
  const id = Number(productId);
  if (!Number.isInteger(id) || id <= 0) {
    throw createHttpError(400, "productId must be a positive integer");
  }

  await ensureProductExists(id);

  const rating = Number(payload.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw createHttpError(400, "rating must be an integer between 1 and 5");
  }

  const title = payload.title?.trim() || null;
  const body = payload.body?.trim() || null;

  const existing = await reviewRepository.findReviewByUserAndProduct(userId, id);
  if (existing) {
    throw createHttpError(409, "You have already reviewed this product");
  }

  const review = await reviewRepository.createReview(userId, id, { rating, title, body });
  const stats = await reviewRepository.getReviewStats(id);

  return { review, rating: stats };
};

module.exports = {
  getReviews,
  submitReview,
};
