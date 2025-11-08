const express = require("express");
const router = express.Router();
const { verifyToken, authorizeAction } = require("../middlewares/auth.middleware");
const { findAllGeneric, createGeneric, deletedSoftGeneric, updateGeneric } = require('../controller/useController');
const { getDetailTuitionController, createTuitionPayment, handlePayOSWebhook, checkTuitionPaymentStatus, getHistoryFeeController } = require("../controller/tuitionController");

router.get(
    "/detail/:parentId",
    verifyToken,
    authorizeAction("view"),
    getDetailTuitionController
);

router.post(
    "/confirm",
    verifyToken,
    authorizeAction("approve"),
    createTuitionPayment
)

router.post(
    "/web-hook",
    handlePayOSWebhook
);

router.get(
    "/historyFees",
    verifyToken,
    authorizeAction("view"),
    getHistoryFeeController
)

router.get("/check-status/:orderCode", checkTuitionPaymentStatus)
module.exports = router;
