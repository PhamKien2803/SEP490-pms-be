const express = require("express");
const router = express.Router();

router.get("/payment/success", (req, res) => {
    res.send("Thanh toán thành công!");
});

router.get("/payment/cancel", (req, res) => {
    res.send("Thanh toán bị hủy.");
});

module.exports = router;
