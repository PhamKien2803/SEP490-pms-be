const express = require("express");
const router = express.Router();
const { getStudentByParentController } = require("../controller/studentController");
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { getInforParent, changePasswordParent, updateParent } = require("../controller/parentController");

router.get("/getStudentByParent/:id",
    verifyToken,
    authorizeAction("view"),
    getStudentByParentController
);

router.get("/getInforParent/:parentId",
    verifyToken,
    authorizeAction("view"),
    getInforParent
);

router.put("/changePassParent/:parentId",
    verifyToken,
    authorizeAction("update"),
    changePasswordParent
);

router.put("/updateParent/:parentId",
    verifyToken,
    authorizeAction("update"),
    updateParent
);

module.exports = router;