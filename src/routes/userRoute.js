const express = require("express");
const router = express.Router();
const User = require("../models/userModel");
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { findAllGeneric, createGeneric, deletedSoftGeneric, updateGeneric } = require('../controller/useController');
const { getListRoleController } = require("../controller/roleController");
const { getListUser } = require("../controller/authController");

router.get(
    "/list",
    verifyToken,
    authorizeAction("view"),
    getListUser
);

router.get(
    "/roleList",
    verifyToken,
    authorizeAction("view"),
    getListRoleController
);

router.post(
    "/create",
    verifyToken,
    authorizeAction("create"),
    createGeneric(User)
);

router.delete(
    "/delete/:id",
    verifyToken,
    authorizeAction("delete"),
    deletedSoftGeneric(User)
);

router.put(
    "/update/:id",
    verifyToken,
    authorizeAction("update"),
    updateGeneric(User)
);

module.exports = router;
