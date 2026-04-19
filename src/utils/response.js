const sendSuccess = (res, data, status = 200) => {
  res.status(status).json({ success: true, data });
};

const sendError = (res, message, status = 500) => {
  res.status(status).json({ success: false, message });
};

module.exports = { sendSuccess, sendError };
