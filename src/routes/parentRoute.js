const express = require("express");
const router = express.Router();
const Parent = require("../models/parentModel");
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { findAllGeneric, createGeneric, deletedSoftGeneric, updateGeneric } = require('../controller/useController');

router.get(
    "/list",
    verifyToken,
    authorizeAction("view"),
    findAllGeneric(Parent)
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

module.exports = router;
