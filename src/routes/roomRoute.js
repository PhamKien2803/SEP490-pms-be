const express = require("express");
const router = express.Router();
const Room = require("../models/roomModel");
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { findAllGeneric, createGeneric, deletedSoftGeneric, updateGeneric } = require('../controller/useController');

router.get(
    "/list",
    verifyToken,
    authorizeAction("view"),
    findAllGeneric(Room)
);

router.post(
    "/create",
    verifyToken,
    authorizeAction("create"),
    createGeneric(Room)
);

router.post(
    "/delete/:id",
    verifyToken,
    authorizeAction("delete"),
    deletedSoftGeneric(Room)
);

router.put(
    "/update/:id",
    verifyToken,
    authorizeAction("update"),
    updateGeneric(Room)
);

module.exports = router;
