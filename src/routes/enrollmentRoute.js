const express = require("express");
const router = express.Router();
const Enrollment = require("../models/enrollmentModel");
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { findAllGeneric, createGeneric, deletedSoftGeneric, updateGeneric } = require('../controller/useController');
const { registerEnrollController, approvedEnrollController, getByIdController, rejectEnrollController, approvedEnrollAllController, uploadImageController, paymentEnrollmentController } = require("../controller/enrollmentController");
const { uploadFile, getFileById } = require("../controller/fileController");
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage });

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

router.put("/update/:id",
    verifyToken,
    authorizeAction("update"),
    updateGeneric(Enrollment)
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
    approvedEnrollController
);

router.post("/rejectEnroll/:id",
    verifyToken,
    authorizeAction("reject"),
    rejectEnrollController
);

router.post("/approvedEnrollAll",
    verifyToken,
    authorizeAction("approve_all"),
    approvedEnrollAllController
)

router.post(
    "/uploadImage",
    upload.single('image'),
    uploadImageController
)

router.post(
    "/payment-enroll/:id",
    authorizeAction("approve"),
    paymentEnrollmentController
)

module.exports = router;

