const express = require("express");
const router = express.Router();
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { createScheduleController, getByIdController, getByParamsController, previewScheduleController } = require("../controller/scheduleController")
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



module.exports = router;
