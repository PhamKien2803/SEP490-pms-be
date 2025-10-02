const express = require("express");
const router = express.Router();
const Role = require("../models/roleModel");
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { createGeneric, deletedSoftGeneric, findAllGeneric, updateGeneric } = require("../controller/useController");

router.get("/list",
    verifyToken,
    authorizeAction("view"),
    findAllGeneric(Role)
);

router.post("/create",
    verifyToken,
    authorizeAction("create"),
    createGeneric(Role)
);

router.put("/update/:id",
    verifyToken,
    authorizeAction("update"),
    updateGeneric(Role)
);

router.post("/delete/:id",
    verifyToken,
    authorizeAction("delete"),
    deletedSoftGeneric(Role)
);

module.exports = router;

