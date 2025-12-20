const express = require("express");
const router = express.Router();
const Attendance = require("../models/attendanceModel");
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { findAllGeneric, createGeneric, deletedSoftGeneric, updateGeneric } = require('../controller/useController');
const { getByIdController, getAttendanceByClassAndDate, getAttendanceByClassAndSchoolYear, getAttendanceByStudentAndSchoolYear, getAllAttendance, updateAttendanceController, createAttendance } = require("../controller/attendanceController");

router.get("/list",
  verifyToken,
  authorizeAction("view"),
  getAllAttendance
);

router.post("/create",
  verifyToken,
  authorizeAction("create"),
  createAttendance
);

router.put("/update/:id",
  verifyToken,
  authorizeAction("update"),
  updateAttendanceController
);

router.post("/delete/:id",
  verifyToken,
  authorizeAction("delete"),
  deletedSoftGeneric(Attendance)
);

router.get("/getById/:id",
  verifyToken,
  authorizeAction("view"),
  getByIdController
)

router.get("/getByClassAndDate/:classId/:date",
  verifyToken,
  authorizeAction("view"),
  getAttendanceByClassAndDate
);

router.get("/getByClassAndSchoolYear/:classId/:schoolYearId",
  verifyToken,
  authorizeAction("view"),
  getAttendanceByClassAndSchoolYear
);

router.get("/getByStudentAndSchoolYear/:studentId/:schoolYearId",
  verifyToken,
  authorizeAction("view"),
  getAttendanceByStudentAndSchoolYear
);

module.exports = router;
