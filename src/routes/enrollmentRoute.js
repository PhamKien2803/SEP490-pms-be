const express = require("express");
const router = express.Router();
const Enrollment = require("../models/enrollmentModel");
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { findAllGeneric, createGeneric, deletedSoftGeneric, updateGeneric } = require('../controller/useController');
const { registerEnrollController } = require("../controller/enrollmentController");


router.get("/list",
    // verifyToken,
    // authorizeAction("view"),
    findAllGeneric(Enrollment)
);

router.post("/registerEnroll", registerEnrollController);

module.exports = router;

