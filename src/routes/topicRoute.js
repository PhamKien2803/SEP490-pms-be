const express = require("express");
const router = express.Router();
const Topic = require('../models/topicModel');
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { createGeneric, deletedSoftGeneric, findAllGeneric, updateGeneric, getByIdGeneric } = require("../controller/useController");
const { getAvailableActivityController, getListController, getByIdController, createTopicController } = require('../controller/topicController')

router.get("/list",
    verifyToken,
    authorizeAction("view"),
    getListController
);

router.post("/create",
    verifyToken,
    authorizeAction("create"),
    createTopicController
);

router.put("/update/:id",
    verifyToken,
    authorizeAction("update"),
    updateGeneric(Topic)
);

router.post("/delete/:id",
    verifyToken,
    authorizeAction("delete"),
    deletedSoftGeneric(Topic)
);

router.get("/getById/:id",
    verifyToken,
    authorizeAction("view"),
    getByIdController
);

router.get("/getAvailable",
    verifyToken,
    authorizeAction("view"),
    getAvailableActivityController
);

module.exports = router;
