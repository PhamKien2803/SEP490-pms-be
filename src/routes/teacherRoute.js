const express = require("express");
const { getClassAndStudentByTeacherController, getByIdStudentController } = require("../controller/staffController");
const { authorizeAction, verifyToken } = require("../middlewares/auth.middleware");
const { getFileById } = require("../controller/fileController");
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

router.get("/pdf/:id",
    verifyToken,
    authorizeAction("export"),
    getFileById
);

module.exports = router;