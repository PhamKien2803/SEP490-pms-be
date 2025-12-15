const express = require("express");
const { getClassByStudentAndSchoolYear, getClassAvailable } = require("../controller/classController");
const router = express.Router();
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const ShoolYear = require("../models/schoolYearModel");
const { findAllGeneric } = require("../controller/useController");

router.get("/getClassByStuAndSY/",
    verifyToken,
    authorizeAction("view"),
    getClassByStudentAndSchoolYear
);

router.get("/shoolYear/list",
    verifyToken,
    authorizeAction("view"),
    // findAllGeneric(ShoolYear)
    getClassAvailable
);

module.exports = router;