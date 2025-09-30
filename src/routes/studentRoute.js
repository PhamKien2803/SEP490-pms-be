const express = require("express");
const router = express.Router();
const User = require("../models/userModel");
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const studentController = require("../controller/studentController");

router.get(
    "/list",
    verifyToken,
    authorizeAction("view"),
    studentController.getListStudent
);
module.exports = router;
