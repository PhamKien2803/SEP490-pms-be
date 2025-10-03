const express = require("express");
const router = express.Router();
const Staff = require("../models/staffModel");
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { createGeneric, deletedSoftGeneric, findAllGeneric, updateGeneric } = require("../controller/useController");
const { createStaffController, deleteStaff, getDetailStaffController } = require("../controller/staffController");

router.get("/list",
    verifyToken,
    authorizeAction("view"),
    findAllGeneric(Staff)
);

router.get("/getById/:id",
    verifyToken,
    authorizeAction("view"),
    getDetailStaffController
)

router.post("/create",
    verifyToken,
    authorizeAction("create"),
    createStaffController
);

router.put("/update/:id",
    verifyToken,
    authorizeAction("update"),
    updateGeneric(Staff)
);

router.post("/delete/:id",
    verifyToken,
    authorizeAction("delete"),
    deleteStaff
);

module.exports = router;
