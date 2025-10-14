const express = require("express");
const router = express.Router();
const Class = require("../models/classModel");
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { findAllGeneric, createGeneric, deletedSoftGeneric, updateGeneric } = require('../controller/useController');
const { getAllClassController, getByIdClassController } = require("../controller/classController");

router.get("/list",
    verifyToken,
    authorizeAction("view"),
    getAllClassController
);

router.post("/create",
    verifyToken,
    authorizeAction("create"),
    createGeneric(Class)
);

router.put("/update/:id",
    verifyToken,
    authorizeAction("update"),
    updateGeneric(Class)
);

router.post("/delete/:id",
    verifyToken,
    authorizeAction("delete"),
    deletedSoftGeneric(Class)
);

router.get("/getById/:id",
    verifyToken,
    authorizeAction("view"),
    getByIdClassController
)


module.exports = router;
