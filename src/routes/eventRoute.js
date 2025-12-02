const express = require("express");
const router = express.Router();
const Event = require("../models/eventModel");
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { findAllGeneric, createGeneric, deletedSoftGeneric, updateGeneric, getByIdGeneric } = require('../controller/useController');
const { getListEventController, createEventController, updateEventController } = require("../controller/schoolYearController");

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
    createEventController
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
    updateEventController
);

router.get(
    "/getById/:id",
    verifyToken,
    authorizeAction("view"),
    getByIdGeneric(Event)
);

module.exports = router;