const express = require("express");
const router = express.Router();
const Lesson = require("../models/lessonModel");
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { findAllGeneric, createGeneric, deletedSoftGeneric, updateGeneric } = require('../controller/useController');
const { getScheduleByWeek, getLessonList } = require('../controller/lessonController');

router.get(
    "/get-schedule-week",
    verifyToken,
    authorizeAction("view"),
    getScheduleByWeek
);

router.get(
    "/get-list",
    verifyToken,
    authorizeAction("view"),
    getLessonList
)
module.exports = router;


