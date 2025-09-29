const express = require("express");
const router = express.Router();
const Function = require('../models/functionModel');
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { findAllGeneric } = require('../controller/useController');

router.get("/list", findAllGeneric(Function));

module.exports = router;
