const express = require("express");
const router = express.Router();
const Enrollment = require("../models/enrollmentModel");
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { findAllGeneric, createGeneric, deletedSoftGeneric, updateGeneric } = require('../controller/useController');
const { registerEnrollController, aprrovedEnrollController, getByIdController } = require("../controller/enrollmentController");
const { uploadFile, getFileById } = require("../controller/fileController");


router.get("/list",
    verifyToken,
    authorizeAction("view"),
    findAllGeneric(Enrollment)
);

router.get("/getById/:id",
    verifyToken,
    authorizeAction("view"),
    getByIdController
)

router.post("/registerEnroll", registerEnrollController);

router.post("/uploadPDF",
    verifyToken,
    authorizeAction("import"),
    uploadFile
);

router.get("/pdf/:id",
    verifyToken,
    authorizeAction("export"),
    getFileById
);

router.post("/aprrovedEnroll",
    verifyToken,
    authorizeAction("approve"),
    aprrovedEnrollController
);


module.exports = router;

