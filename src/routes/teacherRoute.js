const express = require("express");
const { getClassAndStudentByTeacherController } = require("../controller/staffController");
const { authorizeAction, verifyToken } = require("../middlewares/auth.middleware");
const router = express.Router();

router.get("/getClassByTeacher/:id",
    verifyToken,
    authorizeAction("view"),
    getClassAndStudentByTeacherController
)

module.exports = router;