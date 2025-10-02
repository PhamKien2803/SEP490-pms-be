const express = require("express");
const router = express.Router();
const User = require("../models/userModel");
const Student = require("../models/studentModel");
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const studentController = require("../controller/studentController");
const { createGeneric, deletedSoftGeneric, findAllGeneric, updateGeneric } = require("../controller/useController");

router.get("/list", findAllGeneric(Student));
router.post("/create", createGeneric(Student));
router.put("/update/:id", updateGeneric(Student));
router.post("/delete/:id", deletedSoftGeneric(Student));

module.exports = router;
