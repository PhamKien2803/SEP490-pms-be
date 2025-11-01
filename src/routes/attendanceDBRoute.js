const express = require("express");
const { getAttendanceByStudentAndDate } = require("../controller/attendanceController");
const router = express.Router();
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");

router.get("/getAttByStuAndDate/",
    verifyToken,
    authorizeAction("view"),
    getAttendanceByStudentAndDate
);

module.exports = router;