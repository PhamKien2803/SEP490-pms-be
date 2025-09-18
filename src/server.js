const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");
// Khai báo dotenv
dotenv.config();
// Khai báo app
const app = express();
// Middleware
app.use(
    cors({
        origin: process.env.CLIENT_URL,
        credentials: true,
    })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(morgan("dev"));
app.use(cookieParser());

// Connect to MongoDB
connectDB();
// route test
app.get("/", (req, res) => {
    res.send("Welcome to the Kindergarten Management API");
});

// Start server
const PORT = process.env.PORT || 9999;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
