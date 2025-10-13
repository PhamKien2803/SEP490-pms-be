const express = require("express");
const router = express.Router();
const Class = require("../models/classModel");
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { findAllGeneric, createGeneric, deletedSoftGeneric, updateGeneric } = require('../controller/useController');
const { } = require("../controller/classController");

router.get("/list/",
    verifyToken,
    authorizeAction("view"),
    findAllGeneric(Class)
);

module.exports = router;
