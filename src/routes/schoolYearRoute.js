const express = require("express");
const router = express.Router();
const ShoolYear = require("../models/schoolYearModel");
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { createGeneric, deletedSoftGeneric, findAllGeneric, updateGeneric } = require("../controller/useController");
const { getByIdController, confirmSchoolYearController } = require("../controller/schoolYearController");

router.get("/list",
    verifyToken,
    authorizeAction("view"),
    findAllGeneric(ShoolYear)
);

router.post("/create",
    verifyToken,
    authorizeAction("create"),
    createGeneric(ShoolYear)
);

router.put("/update",
    verifyToken,
    authorizeAction("update"),
    updateGeneric(ShoolYear)
);

router.post("/delete",
    verifyToken,
    authorizeAction("delete"),
    deletedSoftGeneric(ShoolYear)
);

router.get("/getById/:id",
    verifyToken,
    authorizeAction("view"),
    getByIdController
)

router.post("/confirm/:id",
    verifyToken,
    authorizeAction("approve"),
    confirmSchoolYearController
)

module.exports = router;
