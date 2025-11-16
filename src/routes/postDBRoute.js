const express = require("express");
const {  getAllPostFileByStudent } = require("../controller/postFileController");
const { authorizeAction, verifyToken } = require("../middlewares/auth.middleware");
require("dotenv").config();
const fs = require("fs");

const router = express.Router();

router.get("/getPostFileByStudent/:id",
    verifyToken,
    authorizeAction("view"),
    getAllPostFileByStudent
);

module.exports = router;