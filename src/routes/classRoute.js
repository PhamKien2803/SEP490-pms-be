const express = require("express");
const router = express.Router();
const Class = require("../models/classModel");
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { findAllGeneric, createGeneric, deletedSoftGeneric, updateGeneric } = require('../controller/useController');
const { getAllClassController, getByIdClassController, getAvailableStudentController,
    getAvailableTeacherController, getAvailableRoomController, asyncClassController,
    getAvailableClassStudentController, getAvailableClassTeacherController,
    changeClassStudentController, changeClassTeacherController,
    getClassCountBySchoolYear,
    totalTeacher
} = require("../controller/classController");
const { getInforTeacher, changePasswordTeacher, updateInforTeacher } = require("../controller/staffController");

router.get("/list",
    verifyToken,
    authorizeAction("view"),
    getAllClassController
);

router.post("/create",
    verifyToken,
    authorizeAction("create"),
    createGeneric(Class)
);

router.put("/update/:id",
    verifyToken,
    authorizeAction("update"),
    updateGeneric(Class)
);

router.post("/delete/:id",
    verifyToken,
    authorizeAction("delete"),
    deletedSoftGeneric(Class)
);

router.get("/getById/:id",
    verifyToken,
    authorizeAction("view"),
    getByIdClassController
);

router.get("/available-student",
    verifyToken,
    authorizeAction("view"),
    getAvailableStudentController
);

router.get("/available-teacher",
    verifyToken,
    authorizeAction("view"),
    getAvailableTeacherController
);

router.get("/available-room",
    verifyToken,
    authorizeAction("view"),
    getAvailableRoomController
);

router.post("/async-class",
    // verifyToken,
    // authorizeAction("async"),
    asyncClassController
)

router.get("/available-classStudent",
    verifyToken,
    authorizeAction("view"),
    getAvailableClassStudentController
)

router.get("/available-classTeacher",
    verifyToken,
    authorizeAction("view"),
    getAvailableClassTeacherController
)

router.post("/studentChangeClass",
    verifyToken,
    authorizeAction("create"),
    changeClassStudentController
);

router.post("/teacherChangeClass",
    verifyToken,
    authorizeAction("create"),
    changeClassTeacherController
)

router.get("/classStatistics",
    verifyToken,
    authorizeAction("view"),
    getClassCountBySchoolYear
)

module.exports = router;
