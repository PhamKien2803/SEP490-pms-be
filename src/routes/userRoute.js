const express = require("express");
const router = express.Router();
const User = require("../models/userModel");
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { findAllGeneric, createGeneric, deletedSoftGeneric, updateGeneric } = require('../controller/useController');
const { getListRoleController } = require("../controller/roleController");
const { getListUser, deleteUserById } = require("../controller/authController");
const { changePasswordTeacher, getInforTeacher, updateInforTeacher } = require("../controller/staffController");

router.get(
    "/list",
    verifyToken,
    authorizeAction("view"),
    getListUser
);

router.get(
    "/roleNames",
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

router.post(
    "/delete/:id",
    verifyToken,
    authorizeAction("delete"),
    deleteUserById
);

router.put(
    "/update/:id",
    verifyToken,
    authorizeAction("update"),
    updateGeneric(User)
);

router.get("/getInforTeacher/:staffId",
    verifyToken,
    authorizeAction("view"),
    getInforTeacher
);

router.put("/changePasswordTeacher/:staffId",
    verifyToken,
    authorizeAction("update"),
    changePasswordTeacher
);

router.put("/updateInforTeacher/:staffId",
    verifyToken,
    authorizeAction("update"),
    updateInforTeacher
);

module.exports = router;
