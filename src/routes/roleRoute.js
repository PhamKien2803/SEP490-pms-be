const express = require("express");
const router = express.Router();
const Role = require("../models/roleModel");
const Function = require('../models/functionModel');
const Module = require("../models/moduleModel");
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { createGeneric, deletedSoftGeneric, findAllGeneric, updateGeneric } = require("../controller/useController");
const { getListController, getDetailController, getListModuleController, getListFunctionController, deleteRole } = require("../controller/roleController");


router.get("/list",
    verifyToken,
    authorizeAction("view"),
    getListController
);

router.get("/getByID/:id",
    verifyToken,
    authorizeAction("view"),
    getDetailController
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
    deleteRole
);

router.get("/listFunction",
    verifyToken,
    authorizeAction("view"),
    getListFunctionController
)

router.get("/listModule",
    verifyToken,
    authorizeAction("view"),
    getListModuleController
)

module.exports = router;

