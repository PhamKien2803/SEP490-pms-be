const express = require("express");
const { getMenuByAgeGroupAndDate } = require("../controller/menuController");
const router = express.Router();
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");

router.get("/getMenuByAgeAndDate/",
    verifyToken,
    authorizeAction("view"),
    getMenuByAgeGroupAndDate
);

module.exports = router;