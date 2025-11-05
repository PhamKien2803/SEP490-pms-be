const express = require("express");
const router = express.Router();
const Service = require("../models/serviceModel");
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { createGeneric, deletedSoftGeneric, findAllGeneric, updateGeneric, getByIdGeneric } = require("../controller/useController");
const { getPreviewServiceController, getByStudentId } = require("../controller/serviceController");


router.get("/preview",
    verifyToken,
    authorizeAction("view"),
    getPreviewServiceController
);

router.post("/create",
    verifyToken,
    authorizeAction("create"),
    createGeneric(Service)
);

router.put("/update/:id",
    verifyToken,
    authorizeAction("update"),
    updateGeneric(Service)
);

router.get("/getById/",
    verifyToken,
    authorizeAction("view"),
    getByStudentId
);

module.exports = router;
