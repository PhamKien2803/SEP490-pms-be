const express = require("express");
const { getClassAndStudentByTeacherController, getByIdStudentController } = require("../controller/staffController");
const { authorizeAction, verifyToken } = require("../middlewares/auth.middleware");
const router = express.Router();

router.get("/getClassByTeacher/:id",
    verifyToken,
    authorizeAction("view"),
    getClassAndStudentByTeacherController
)

router.get("/getByIdStudent/:id",
    verifyToken,
    authorizeAction("view"),
    getByIdStudentController
)

module.exports = router;