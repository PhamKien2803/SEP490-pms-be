const express = require("express");
const router = express.Router();
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { getMenuByDateFromTo, createMenu, updateMenu, deleteMenuById, getMenuTotalCaloIsNo, genAICaculateMenuNutrition, getMenuById } = require("../controller/menuController");

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

router.delete("/delete/:id",
    verifyToken,
    authorizeAction("delete"),
    deleteMenuById
);

router.get("/menu-no-calo",
    verifyToken,
    authorizeAction("view"),
    getMenuTotalCaloIsNo
);


router.get("/caculate-calo",
    verifyToken,
    authorizeAction("view"),
    genAICaculateMenuNutrition
);
module.exports = router;
