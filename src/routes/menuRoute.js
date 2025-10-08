const express = require("express");
const router = express.Router();
const User = require("../models/userModel");
const Menu = require("../models/menuModel");
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { deletedSoftGeneric } = require("../controller/useController");
const { getMenuByDateFromTo, createMenu, updateMenu, deleteMenuById } = require("../controller/menuController");

router.get("/get-by-date/",
    verifyToken,
    authorizeAction("view"),
    getMenuByDateFromTo
);

router.post("/create",
    verifyToken,
    authorizeAction("create"),
    createMenu
);

router.put("/update/:id",
    verifyToken,
    authorizeAction("update"),
    updateMenu
);

router.delete("/delete/:id",
    verifyToken,
    authorizeAction("delete"),
    deleteMenuById
);

module.exports = router;
