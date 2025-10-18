const express = require("express");
const router = express.Router();
const Food = require("../models/foodModel");
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { findAllGeneric, createGeneric, deletedSoftGeneric, updateGeneric } = require('../controller/useController');
const { getFoodByQuery, genAICaculateFoodNutrition, genAICaculateFoodNutritionById } = require("../controller/foodController");

router.get("/list/",
    verifyToken,
    authorizeAction("view"),
    getFoodByQuery
);

router.post(
  "/create",
  verifyToken,
  authorizeAction("create"),
  createGeneric(Food)
);

router.post(
  "/delete/:id",
  verifyToken,
  authorizeAction("delete"),
  deletedSoftGeneric(Food)
);

router.get("/caculate-calo",
    verifyToken,
    authorizeAction("view"),
    genAICaculateFoodNutrition
);

router.get("/caculate-calo/:id",
    verifyToken,
    authorizeAction("view"),
    genAICaculateFoodNutritionById
);

router.put(
  "/update/:id",
  verifyToken,
  authorizeAction("update"),
  updateGeneric(Food)
);

module.exports = router;
