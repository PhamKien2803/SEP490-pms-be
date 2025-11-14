const express = require("express");
const { getAllMedicalByStudent } = require("../controller/medicalController");
const router = express.Router();
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { getFileById } = require("../controller/fileController");

router.get("/getMedicalByStudent/:id",
    verifyToken,
    authorizeAction("view"),
    getAllMedicalByStudent
);

router.get("/pdf/:id",
    verifyToken,
    authorizeAction("export"),
    getFileById
);


module.exports = router;