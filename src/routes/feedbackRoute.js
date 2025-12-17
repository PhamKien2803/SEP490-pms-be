const express = require("express");
const router = express.Router();
const Feedback = require("../models/feedbackModel");
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { findAllGeneric, createGeneric, deletedSoftGeneric, updateGeneric } = require('../controller/useController');
const { createMultipleFeedbacks, getFeedbacksByClassAndDate, getByIdFeedbackController, getClassAndStudentByTeacherController } = require("../controller/feedbackController");
const { getInforTeacher, updateInforTeacher, changePasswordTeacher } = require("../controller/staffController");

router.get(
  "/list",
  verifyToken,
  authorizeAction("view"),
  findAllGeneric(Feedback)
);

router.post(
  "/create",
  verifyToken,
  authorizeAction("create"),
  createGeneric(Feedback)
);

router.post(
  "/delete/:id",
  verifyToken,
  authorizeAction("delete"),
  deletedSoftGeneric(Feedback)
);

router.put(
  "/update/:id",
  verifyToken,
  authorizeAction("update"),
  updateGeneric(Feedback)
);

router.post("/createFeedbacks/",
  verifyToken,
  authorizeAction("create"),
  createMultipleFeedbacks
);

router.get("/getByClassAndDate/",
  verifyToken,
  authorizeAction("view"),
  getFeedbacksByClassAndDate
);

router.get("/getByIdFeedback/:id",
  verifyToken,
  authorizeAction("view"),
  getByIdFeedbackController
);

router.get("/getClassByTeacher/:id",
  verifyToken,
  authorizeAction("view"),
  getClassAndStudentByTeacherController
);

router.get("/getInforTeacher/:staffId",
    verifyToken,
    authorizeAction("view"),
    getInforTeacher
);

router.put("/changePasswordTeacher/:staffId",
    verifyToken,
    authorizeAction("update"),
    changePasswordTeacher
);

router.put("/updateInforTeacher/:staffId",
    verifyToken,
    authorizeAction("update"),
    updateInforTeacher
);

module.exports = router;


