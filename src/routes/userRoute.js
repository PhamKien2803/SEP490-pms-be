const express = require("express");
const router = express.Router();
const User = require("../model/userModel");

router.get("/", async (req, res) => {
    try {
        const data = await User.find();
        console.log("🚀 ~ data:", data)
        return res.status(200).json(data);
    } catch (error) {
        console.log(error.message);
        return res.status(500).json(error);
    }
})
module.exports = router;
