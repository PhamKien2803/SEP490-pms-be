const express = require("express");
const router = express.Router();
const User = require("../models/userModel");
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { loginController, getCurrentUser } = require('../controller/authController')

router.post("/login", loginController);
router.get("/getCurrentUser", verifyToken, getCurrentUser);

module.exports = router;
