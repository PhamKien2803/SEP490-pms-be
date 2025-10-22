const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");
const connectDB = require("./configs/database");
const cookieParser = require("cookie-parser");
const { connectGridFS } = require("./configs/gridfs");
// Khai báo routes
const student = require("./routes/studentRoute");
const parent = require("./routes/parentRoute");
const auth = require("./routes/authRoute");
const functions = require("./routes/functionRoute");
const role = require("./routes/roleRoute");
const user = require("./routes/userRoute");
const staffs = require("./routes/staffRoute");
const enrollments = require("./routes/enrollmentRoute");
const menu = require("./routes/menuRoute");
const food = require("./routes/foodRoute.js");
const schoolYear = require("./routes/schoolYearRoute.js");
const classes = require("./routes/classRoute.js");
const room = require("./routes/roomRoute.js");
const activity = require("./routes/activityRoute.js");
const event = require("./routes/eventRoute.js");
const medical = require("./routes/medicalRoute.js");
const topic = require("./routes/topicRoute.js");
const schedule = require("./routes/scheduleRoute.js");

require("./helpers/emailWorkQueue.js");

// Khai báo dotenv
dotenv.config();

// Khai báo app
const app = express();

// Middleware
app.use(cors({ origin: "http://localhost:5173", credentials: true, }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(morgan("dev"));
app.use(cookieParser());

// Connect to MongoDB
connectDB();
connectGridFS();

// Sử dụng đường dẫn
app.use("/api/pms/students", student);
app.use("/api/pms/parents", parent);
app.use("/api/pms/auth", auth);
app.use("/api/pms/functions", functions);
app.use("/api/pms/roles", role);
app.use("/api/pms/accounts", user);
app.use("/api/pms/staffs", staffs);
app.use("/api/pms/enrollments", enrollments);
app.use("/api/pms/menus", menu);
app.use("/api/pms/schoolYears", schoolYear);
app.use("/api/pms/foods", food);
app.use("/api/pms/classes", classes)
app.use("/api/pms/rooms", room);
app.use("/api/pms/curriculums", activity);
app.use("/api/pms/events", event);
app.use("/api/pms/medicals", medical);
app.use("/api/pms/topics", topic);
app.use("/api/pms/schedules", schedule);


// route test
app.get("/", (req, res) => {
    res.send("👋 Welcome to the Blue Dolphin Management API");
});

// Start server
const PORT = process.env.PORT || 9999;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port 9999`);
});
