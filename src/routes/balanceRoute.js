const express = require("express");
const router = express.Router();
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { findAllGeneric, createGeneric, deletedSoftGeneric, updateGeneric } = require('../controller/useController');
const { getBalanceDetailController } = require("../controller/tuitionController");
router.get(
    "/detail",
    verifyToken,
    authorizeAction("view"),
    getBalanceDetailController
);


module.exports = router;
