const express = require("express");
const router = express.Router();
const Function = require('../models/functionModel');
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { findAllGeneric, createGeneric, deletedSoftGeneric, updateGeneric } = require('../controller/useController');

router.get("/list", findAllGeneric(Function));
router.post("/create", createGeneric(Function));
router.put("/update/:id", updateGeneric(Function));
router.post("/delete/:id", deletedSoftGeneric(Function));

module.exports = router;
