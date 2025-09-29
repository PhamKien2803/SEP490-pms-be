const express = require("express");
const router = express.Router();
const Function = require('../models/functionModel');
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { findAllGeneric, createGeneric } = require('../controller/useController');

router.get("/list", findAllGeneric(Function));
router.post("/create", createGeneric(Function));

module.exports = router;
