const reviewService = require("./review.service");
const { sendSuccess } = require("../../utils/response");

const getReviews = async (req, res, next) => {
  try {
    const result = await reviewService.getReviews(req.params.productId, req.query);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

const submitReview = async (req, res, next) => {
  try {
    const result = await reviewService.submitReview(req.user.id, req.params.productId, req.body);
    sendSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getReviews,
  submitReview,
};
