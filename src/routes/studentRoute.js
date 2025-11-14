const express = require("express");
const router = express.Router();
const User = require("../models/userModel");
const Student = require("../models/studentModel");
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { getByIdController } = require("../controller/studentController");
const { createGeneric, deletedSoftGeneric, findAllGeneric, updateGeneric } = require("../controller/useController");

router.get("/list",
    verifyToken,
    authorizeAction("view"),
    findAllGeneric(Student)
);

router.post("/create",
    verifyToken,
    authorizeAction("create"),
    createGeneric(Student)
);

router.put("/update/:id",
    verifyToken,
    authorizeAction("update"),
    updateGeneric(Student)
);

router.post("/delete/:id",
    verifyToken,
    authorizeAction("delete"),
    deletedSoftGeneric(Student)
);

router.get("/getById/:id",
    verifyToken,
    authorizeAction("view"),
    getByIdController
)

module.exports = router;
