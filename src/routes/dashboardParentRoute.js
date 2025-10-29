const express = require("express");
const router = express.Router();
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { getMenuByAgeGroupAndDate } = require("../controller/menuController");
const { getScheduleByClassAndMonth } = require("../controller/scheduleController");
const { getStudentByParentController } = require("../controller/studentController");
const { getClassByStudentAndSchoolYear } = require("../controller/classController");
const { getAttendanceByStudentAndDate } = require("../controller/attendanceController");
const { getAllMedicalByStudent } = require("../controller/medicalController");
const { getFeedbackByStudentAndDate } = require("../controller/feedbackController");

router.get("/getMenuByAgeAndDate/",
    verifyToken,
    authorizeAction("view"),
    getMenuByAgeGroupAndDate
);

router.get("/getSchedulesByClassAndMonth",
    verifyToken,
    authorizeAction("view"),
    getScheduleByClassAndMonth
);

router.get("/getStudentByParent/:id",
    verifyToken,
    authorizeAction("view"),
    getStudentByParentController
);

router.get("/getClassByStuAndSY/",
    verifyToken,
    authorizeAction("view"),
    getClassByStudentAndSchoolYear
);

router.get("/getAttByStuAndDate/",
    verifyToken,
    authorizeAction("view"),
    getAttendanceByStudentAndDate
);

router.get("/getMedicalByStudent/:id",
    verifyToken,
    authorizeAction("view"),
    getAllMedicalByStudent
);

router.get("/getFbByStuAndDate",
    verifyToken,
    authorizeAction("view"),
    getFeedbackByStudentAndDate
);

module.exports = router;


