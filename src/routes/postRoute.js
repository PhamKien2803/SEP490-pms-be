const express = require("express");
const router = express.Router();
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const Post = require("../models/postModel");
const { deletedSoftGeneric, findAllGeneric, updateGeneric, createGeneric } = require("../controller/useController");
const { getByIdPostController } = require("../controller/postFileController");

router.post("/create",
    verifyToken,
    authorizeAction("create"),
    createGeneric(Post)
);

router.put("/update/:id",
    verifyToken,
    authorizeAction("update"),
    updateGeneric(Post)
);

router.post(
    "/delete/:id",
    verifyToken,
    authorizeAction("delete"),
    deletedSoftGeneric(Post)
);

router.get("/list/",
    verifyToken,
    authorizeAction("view"),
    findAllGeneric(Post)
);

router.get("/getById/:id",
    verifyToken,
    authorizeAction("view"),
    getByIdPostController
);

module.exports = router;
