// src/routes/auth.routes.js
const express = require("express");
const { login } = require("../controllers/auth.controller");
const { loginLimiter } = require("../middlewares/rateLimit");

const router = express.Router();

// Login admin (dengan rate limit untuk cegah brute-force)
router.post("/login", loginLimiter, login);

module.exports = router;
