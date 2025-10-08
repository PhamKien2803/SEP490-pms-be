const express = require("express");
const router = express.Router();
const Enrollment = require("../models/enrollmentModel");
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { findAllGeneric, createGeneric, deletedSoftGeneric, updateGeneric } = require('../controller/useController');
const { registerEnrollController, approvedEnrollController, getByIdController, rejectEnrollController } = require("../controller/enrollmentController");
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
)


module.exports = router;

