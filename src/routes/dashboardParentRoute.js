const express = require("express");
const router = express.Router();
const { getStudentByParentController } = require("../controller/studentController");
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");

router.get("/getStudentByParent/:id",
    verifyToken,
    authorizeAction("view"),
    getStudentByParentController
);

module.exports = router;