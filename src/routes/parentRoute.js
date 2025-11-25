const express = require("express");
const router = express.Router();
const Parent = require("../models/parentModel");
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { findAllGeneric, createGeneric, deletedSoftGeneric, updateGeneric, getByIdGeneric } = require('../controller/useController');
const { getByIdParentController } = require("../controller/studentController");
const { getInforParent, changePasswordParent, updateParent } = require("../controller/parentController");

router.get(
    "/list",
    verifyToken,
    authorizeAction("view"),
    findAllGeneric(Parent)
);

router.get(
    "/getById/:id",
    verifyToken,
    authorizeAction("view"),
    getByIdParentController
);

router.post(
    "/create",
    verifyToken,
    authorizeAction("create"),
    createGeneric(Parent)
);

router.post(
    "/delete/:id",
    verifyToken,
    authorizeAction("delete"),
    deletedSoftGeneric(Parent)
);

router.put(
    "/update/:id",
    verifyToken,
    authorizeAction("update"),
    updateGeneric(Parent)
);

router.get("/getInforParent/:parentId",
    verifyToken,
    authorizeAction("view"),
    getInforParent
);

router.put("/changePassParent/:parentId",
    verifyToken,
    authorizeAction("update"),
    changePasswordParent
);

router.put("/updateParent/:parentId",
    verifyToken,
    authorizeAction("update"),
    updateParent
);

module.exports = router;
