const express = require("express");
const router = express.Router();
const Role = require("../models/roleModel");
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { createGeneric, deletedSoftGeneric, findAllGeneric, updateGeneric } = require("../controller/useController");

router.get("/list", findAllGeneric(Role));
router.post("/create", createGeneric(Role));
router.put("/update/:id", updateGeneric(Role));
router.post("/delete/:id", deletedSoftGeneric(Role));

module.exports = router;
