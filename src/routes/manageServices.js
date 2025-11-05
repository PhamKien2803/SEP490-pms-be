const express = require("express");
const router = express.Router();
const Service = require("../models/serviceModel");
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { reportUniformService } = require("../controller/serviceController");


router.get("/reports",
    verifyToken,
    authorizeAction("view"),
    reportUniformService
);

module.exports = router;
