const express = require("express");
const { getClassByStudentAndSchoolYear } = require("../controller/classController");
const router = express.Router();
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");

router.get("/getClassByStuAndSY/",
    verifyToken,
    authorizeAction("view"),
    getClassByStudentAndSchoolYear
);

module.exports = router;