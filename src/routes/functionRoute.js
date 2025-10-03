const express = require("express");
const router = express.Router();
const Function = require('../models/functionModel');
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { findAllGeneric, createGeneric, deletedSoftGeneric, updateGeneric } = require('../controller/useController');


router.get("/list",
    verifyToken,
    authorizeAction("view"),
    findAllGeneric(Function)
);

router.post("/create",
    verifyToken,
    authorizeAction("create"),
    createGeneric(Function)
);

router.put("/update/:id",
    verifyToken,
    authorizeAction("update"),
    updateGeneric(Function)
);

router.post("/delete/:id",
    verifyToken,
    authorizeAction("delete"),
    deletedSoftGeneric(Function)
);

module.exports = router;

