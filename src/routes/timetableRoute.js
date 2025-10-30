const express = require("express");
const { authorizeAction, verifyToken } = require("../middlewares/auth.middleware");
const { getTimeTableByTeacherController } = require("../controller/lessonController");
const router = express.Router();

router.get(
    "/get-timetable-teacher",
    verifyToken,
    authorizeAction("view"),
    getTimeTableByTeacherController
);


module.exports = router;