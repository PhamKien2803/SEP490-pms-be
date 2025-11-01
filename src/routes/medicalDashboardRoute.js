const express = require("express");
const { getAllMedicalByStudent } = require("../controller/medicalController");
const router = express.Router();
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");

router.get("/getMedicalByStudent/:id",
    verifyToken,
    authorizeAction("view"),
    getAllMedicalByStudent
);

module.exports = router;