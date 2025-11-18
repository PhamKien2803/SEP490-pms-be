const express = require("express");
const router = express.Router();
const User = require("../models/userModel");
const Student = require("../models/studentModel");
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { getByIdController, createStudentEnroll } = require("../controller/studentController");
const { uploadImageController } = require("../controller/enrollmentController")
const { createGeneric, deletedSoftGeneric, findAllGeneric, updateGeneric } = require("../controller/useController");
const { uploadFile, getFileById } = require("../controller/fileController");
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get("/list",
    verifyToken,
    authorizeAction("view"),
    findAllGeneric(Student)
);

router.post("/create",
    verifyToken,
    authorizeAction("create"),
    createStudentEnroll
);

router.put("/update/:id",
    verifyToken,
    authorizeAction("update"),
    updateGeneric(Student)
);

router.post("/delete/:id",
    verifyToken,
    authorizeAction("delete"),
    deletedSoftGeneric(Student)
);

router.get("/getById/:id",
    verifyToken,
    authorizeAction("view"),
    getByIdController
)

router.post(
    "/uploadImage",
    upload.single('image'),
    uploadImageController
)

module.exports = router;
