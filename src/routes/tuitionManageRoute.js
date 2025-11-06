const express = require("express");
const router = express.Router();
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { findAllGeneric, createGeneric, deletedSoftGeneric, updateGeneric } = require('../controller/useController');
const { getListRoleController } = require("../controller/roleController");
const { getListUser } = require("../controller/authController");
const { getListController } = require("../controller/tuitionController");

router.get(
    "/list",
    verifyToken,
    authorizeAction("view"),
    getListController
);

module.exports = router;
