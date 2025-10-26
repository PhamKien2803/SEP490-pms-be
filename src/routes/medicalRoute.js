const express = require("express");
const router = express.Router();
const MedicalRecord = require("../models/medicalModel");
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { findAllGeneric, createGeneric, deletedSoftGeneric, updateGeneric } = require('../controller/useController');
const { getByIdMedicalController, getAllMedicalController, getAllMedicalByFilter } = require("../controller/medicalController");

router.get(
    "/list",
    verifyToken,
    authorizeAction("view"),
    getAllMedicalController
);

router.get(
    "/listByFilter",
    verifyToken,
    authorizeAction("view"),
    getAllMedicalByFilter
);

router.post(
    "/create",
    verifyToken,
    authorizeAction("create"),
    createGeneric(MedicalRecord)
);

router.post(
    "/delete/:id",
    verifyToken,
    authorizeAction("delete"),
    deletedSoftGeneric(MedicalRecord)
);

router.put(
    "/update/:id",
    verifyToken,
    authorizeAction("update"),
    updateGeneric(MedicalRecord)
);

router.get("/getById/:id",
    verifyToken,
    authorizeAction("view"),
    getByIdMedicalController
);



module.exports = router;
