const express = require("express");
const router = express.Router();
const Guardian = require("../models/guardianModel");
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { findAllGeneric,  deletedSoftGeneric } = require('../controller/useController');
const { updateGuardian, createGuardian, getGuardiansByParentId, getGuardiansByStudentId, getGuardianById } = require("../controller/guardianController");

router.get(
    "/list",
    verifyToken,
    authorizeAction("view"),
    findAllGeneric(Guardian)
);

router.get(
    "/listByStudent/:id",
    verifyToken,
    authorizeAction("view"),
    getGuardiansByStudentId
);

// router.get(
//     "/listByParent/:id",
//     verifyToken,
//     authorizeAction("view"),
//     getGuardiansByParentId
// );

router.get(
    "/getById/:id",
    verifyToken,
    authorizeAction("view"),
    getGuardianById
);

router.post("/create",
    verifyToken,
    authorizeAction("create"),
    createGuardian
);

router.post(
    "/delete/:id",
    verifyToken,
    authorizeAction("delete"),
    deletedSoftGeneric(Guardian)
);

router.put(
    "/update/:id",
    verifyToken,
    authorizeAction("update"),
    updateGuardian
);



module.exports = router;
