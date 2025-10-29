const express = require("express");
const router = express.Router();
const Lesson = require("../models/lessonModel");
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { findAllGeneric, createGeneric, deletedSoftGeneric, updateGeneric } = require('../controller/useController');
const { getScheduleByWeek, getLessonList, createLessonController, confirmRequestLessonController,
    rejectRequestLessonController, sendRequestLessonController, updateLessonController } = require('../controller/lessonController');

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
);

router.post(
    "/create",
    verifyToken,
    authorizeAction("create"),
    createLessonController
);

router.put(
    "/update/:id",
    verifyToken,
    authorizeAction("update"),
    updateLessonController
);

router.post(
    "/approve-request/:id",
    verifyToken,
    authorizeAction("approve"),
    confirmRequestLessonController
);

router.post(
    "/reject-request/:id",
    verifyToken,
    authorizeAction("reject"),
    rejectRequestLessonController
);

router.post(
    "/send-request/:id",
    verifyToken,
    authorizeAction("update"),
    sendRequestLessonController
);



module.exports = router;


