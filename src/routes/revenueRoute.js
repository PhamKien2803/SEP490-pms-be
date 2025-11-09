const express = require("express");
const router = express.Router();
const Revenue = require("../models/revenueModel");
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { createGeneric, deletedSoftGeneric, findAllGeneric, updateGeneric, getByIdGeneric } = require("../controller/useController");


router.get("/list",
    verifyToken,
    authorizeAction("view"),
    findAllGeneric(Revenue)
);

router.post("/create",
    verifyToken,
    authorizeAction("create"),
    createGeneric(Revenue)
);

router.put("/update/:id",
    verifyToken,
    authorizeAction("update"),
    updateGeneric(Revenue)
);
router.post("/delete/:id",
    verifyToken,
    authorizeAction("delete"),
    deletedSoftGeneric(Revenue)
);

router.get("/getById/:id",
    verifyToken,
    authorizeAction("view"),
    getByIdGeneric(Revenue)
);

module.exports = router;
