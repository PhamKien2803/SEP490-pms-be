const express = require("express");
const router = express.Router();
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const Schedule = require('../models/scheduleModel');
const { createScheduleController, getByIdController, getByParamsController,
    previewScheduleController, getListActivityFixController, getListAvailableController, confirmScheduleController } = require("../controller/scheduleController")
const { createGeneric, deletedSoftGeneric, findAllGeneric, updateGeneric, getByIdGeneric } = require("../controller/useController");

// router.post("/create",
//     verifyToken,
//     authorizeAction("create"),
//     createScheduleController
// );

router.get("/getById/:id",
    verifyToken,
    authorizeAction("view"),
    getByIdController
)

router.get("/getByParams",
    verifyToken,
    authorizeAction("view"),
    getByParamsController
);

router.get("/previewSchedules",
    verifyToken,
    authorizeAction("view"),
    previewScheduleController
);

router.get("/getFixActivity",
    verifyToken,
    authorizeAction("view"),
    getListActivityFixController
);

router.get("/getListAvailable",
    verifyToken,
    authorizeAction("view"),
    getListAvailableController
);

router.post("/createSchedule",
    verifyToken,
    authorizeAction("create"),
    createScheduleController
);

router.put("/updateSchedule",
    verifyToken,
    authorizeAction("update"),
    updateGeneric(Schedule)
);

router.put("/confirm",
    verifyToken,
    authorizeAction("update"),
    confirmScheduleController
)

module.exports = router;
