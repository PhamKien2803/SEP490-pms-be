const express = require("express");
const router = express.Router();
const ShoolYear = require("../models/schoolYearModel");
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { createGeneric, deletedSoftGeneric, findAllGeneric, updateGeneric } = require("../controller/useController");
const { getByIdController, confirmSchoolYearController, createSchoolYearController, endSchoolYearController, 
    getStudentGraduatedController, getListEventController, publishServiceController, updateSchoolYearController } = require("../controller/schoolYearController");

router.get("/list",
    verifyToken,
    authorizeAction("view"),
    findAllGeneric(ShoolYear)
);

router.post("/create",
    verifyToken,
    authorizeAction("create"),
    createSchoolYearController
);

router.put("/update/:id",
    verifyToken,
    authorizeAction("update"),
    // updateGeneric(ShoolYear)
    updateSchoolYearController
);

router.post("/delete/:id",
    verifyToken,
    authorizeAction("delete"),
    deletedSoftGeneric(ShoolYear)
);

router.get("/getById/:id",
    verifyToken,
    authorizeAction("view"),
    getByIdController
);

router.post("/confirm/:id",
    verifyToken,
    authorizeAction("approve"),
    confirmSchoolYearController
);

router.post("/endSchoolYear/:id",
    verifyToken,
    authorizeAction("approve"),
    endSchoolYearController
)

router.get("/getStudentGraduated",
    verifyToken,
    authorizeAction("view"),
    getStudentGraduatedController
)

router.post("/publish/:id",
    verifyToken,
    authorizeAction("approve"),
    publishServiceController
);

module.exports = router;
