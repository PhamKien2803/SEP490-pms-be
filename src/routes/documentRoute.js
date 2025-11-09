const express = require("express");
const router = express.Router();
const Document = require("../models/documentModel");
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { createGeneric, deletedSoftGeneric, findAllGeneric, updateGeneric } = require("../controller/useController");
const { confirmPaymentController, createController, getByIdController, getListController } = require("../controller/documentController");

router.get("/list",
    verifyToken,
    authorizeAction("view"),
    getListController
);

router.post("/create",
    verifyToken,
    authorizeAction("create"),
    createController
); 

router.put("/update/:id",
    verifyToken,
    authorizeAction("update"),
    updateGeneric(Document)
);

router.post("/delete/:id",
    verifyToken,
    authorizeAction("delete"),
    deletedSoftGeneric(Document)
);

router.get("/getById/:id",
    verifyToken,
    authorizeAction("view"),
    getByIdController
);

router.post(
    "/confirmPayment/:id",
    verifyToken,
    authorizeAction("approve"),
    confirmPaymentController

)

module.exports = router;
