const express = require("express");
const router = express.Router();
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { getFeedbackByStudentAndDate } = require("../controller/feedbackController");

router.get("/getFbByStuAndDate",
    verifyToken,
    authorizeAction("view"),
    getFeedbackByStudentAndDate
);

module.exports = router;
