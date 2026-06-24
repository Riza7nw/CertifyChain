// src/utils/asyncHandler.js
// Pembungkus untuk controller async agar error otomatis diteruskan ke
// error handler Express via next(err) — tidak perlu try/catch berulang.

module.exports = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
