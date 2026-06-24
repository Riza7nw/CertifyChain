// src/routes/v1.auth.routes.js
const express = require("express");
const c = require("../controllers/v1.auth.controller");
const { authenticateUser } = require("../middlewares/userAuth");
const { loginLimiter } = require("../middlewares/rateLimit");

const router = express.Router();

router.post("/register", loginLimiter, c.register);
router.post("/login", loginLimiter, c.login);
router.post("/refresh", c.refresh);
router.post("/logout", c.logout);
router.get("/me", authenticateUser, c.me);

// Email verification (Phase 7b)
router.post("/verify-email", c.verifyEmail); // publik (token = otorisasi)
router.post("/resend-verification", loginLimiter, authenticateUser, c.resendVerification);

module.exports = router;
