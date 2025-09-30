const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");
const connectDB = require("./configs/database");
const cookieParser = require("cookie-parser");
// Khai báo routes
const student = require("./routes/studentRoute");
const auth = require("./routes/authRoute");
const functions = require("./routes/functionRoute");
// Khai báo dotenv
dotenv.config();
// Khai báo app
const app = express();
// Middleware
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(morgan("dev"));
app.use(cookieParser());

// Connect to MongoDB
connectDB();

// Sử dụng đường dẫn
app.use("/api/students", student);
app.use("/api/auth", auth);
app.use("/api/functions", functions);

// route test
app.get("/", (req, res) => {
    res.send("👋 Welcome to the Blue Dolphin Management API");
});

// Start server
const PORT = process.env.PORT || 9999;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
