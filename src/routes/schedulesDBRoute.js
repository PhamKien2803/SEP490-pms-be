const express = require("express");
const { getScheduleByClassAndMonth } = require("../controller/scheduleController");
const router = express.Router();
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");

router.get("/getSchedulesByClassAndMonth",
    verifyToken,
    authorizeAction("view"),
    getScheduleByClassAndMonth
);

module.exports = router;