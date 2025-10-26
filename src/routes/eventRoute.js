const express = require("express");
const router = express.Router();
const Event = require("../models/eventModel");
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { findAllGeneric, createGeneric, deletedSoftGeneric, updateGeneric, getByIdGeneric } = require('../controller/useController');
const { getListEventController } = require("../controller/schoolYearController");

router.get(
    "/list",
    verifyToken,
    authorizeAction("view"),
    getListEventController
);

router.post(
    "/create",
    verifyToken,
    authorizeAction("create"),
    createGeneric(Event)
);

router.post(
    "/delete/:id",
    verifyToken,
    authorizeAction("delete"),
    deletedSoftGeneric(Event)
);

router.put(
    "/update/:id",
    verifyToken,
    authorizeAction("update"),
    updateGeneric(Event)
);

router.get(
    "/getById/:id",
    verifyToken,
    authorizeAction("view"),
    getByIdGeneric(Event)
);

module.exports = router;