const express = require("express");
const router = express.Router();
const Feedback = require("../models/feedbackModel");
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { findAllGeneric, createGeneric, deletedSoftGeneric, updateGeneric } = require('../controller/useController');
const { createMultipleFeedbacks, getFeedbacksByClassAndDate, getByIdFeedbackController } = require("../controller/feedbackController");

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

module.exports = router;


