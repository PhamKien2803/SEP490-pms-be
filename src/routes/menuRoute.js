const express = require("express");
const router = express.Router();
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { getMenuByDateFromTo, createMenu, updateMenu, getMenuById,
    approveMenuById, rejectMenuById,
    getMenuByQuery,
    getMenuByAgeGroupAndWeekNumber,
    deleteMenuController, pendingById
} = require("../controller/menuController");
const Menu = require("../models/menuModel");
const { deletedSoftGeneric } = require("../controller/useController");

router.get("/get-by-date/",
    verifyToken,
    authorizeAction("view"),
    getMenuByDateFromTo
);

router.get("/get-by-id/:id",
    verifyToken,
    authorizeAction("view"),
    getMenuById
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

// router.delete("/delete/:id",
//     verifyToken,
//     authorizeAction("delete"),
//     deleteMenuById
// );

router.post(
    "/delete/:id",
    verifyToken,
    authorizeAction("delete"),
    deleteMenuController
);

router.put("/approve-menu/:id",
    verifyToken,
    authorizeAction("update"),
    approveMenuById
);

router.post("/reject-menu/:id",
    verifyToken,
    authorizeAction("reject"),
    rejectMenuById
);

router.get("/list/",
    verifyToken,
    authorizeAction("view"),
    getMenuByQuery
);

router.post("/pending-menu/:id",
    verifyToken,
    authorizeAction("approve"),
    pendingById
);

module.exports = router;
