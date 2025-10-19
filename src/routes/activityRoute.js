const express = require("express");
const router = express.Router();
const Activity = require("../models/activityModel");
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { findAllGeneric, createGeneric, deletedSoftGeneric, updateGeneric } = require('../controller/useController');
const { createActivityController } = require('../controller/activityController')

router.get(
    "/list",
    verifyToken,
    authorizeAction("view"),
    findAllGeneric(Activity)
);

router.post(
    "/create",
    verifyToken,
    authorizeAction("create"),
    createActivityController
);

router.post(
    "/delete/:id",
    verifyToken,
    authorizeAction("delete"),
    deletedSoftGeneric(Activity)
);

router.put(
    "/update/:id",
    verifyToken,
    authorizeAction("update"),
    updateGeneric(Activity)
);

module.exports = router;
