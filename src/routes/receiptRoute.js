const express = require("express");
const router = express.Router();
const Receipt = require("../models/receiptModel");
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { createGeneric, deletedSoftGeneric, findAllGeneric, updateGeneric, getByIdGeneric } = require("../controller/useController");
const { getListController, getRevenueController, getByIdController, confirmReceiptController } = require("../controller/receiptController")

router.get("/list",
    verifyToken,
    authorizeAction("view"),
    getListController
);

router.get("/getRevenue",
    verifyToken,
    authorizeAction("view"),
    getRevenueController
);

router.post("/create",
    verifyToken,
    authorizeAction("create"),
    createGeneric(Receipt)
);

router.put("/update/:id",
    verifyToken,
    authorizeAction("update"),
    updateGeneric(Receipt)
);

router.post("/delete/:id",
    verifyToken,
    authorizeAction("delete"),
    deletedSoftGeneric(Receipt)
);

router.get("/getById/:id",
    verifyToken,
    authorizeAction("view"),
    getByIdController
);

router.post("/confirm/:id",
    verifyToken,
    authorizeAction("approve"),
    confirmReceiptController
)

module.exports = router;
