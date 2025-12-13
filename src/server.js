const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");
const connectDB = require("./configs/database");
const cookieParser = require("cookie-parser");
const { connectGridFS } = require("./configs/gridfs");

// Load env
dotenv.config();

// Helpers – KHÔNG chạy khi test
if (process.env.NODE_ENV !== "test") {
    require("./helpers/botEnrollmentCheck.js");
    require("./helpers/emailWorkQueue.js");
}

// Routes
const student = require("./routes/studentRoute");
const parent = require("./routes/parentRoute");
const auth = require("./routes/authRoute");
const functions = require("./routes/functionRoute");
const role = require("./routes/roleRoute");
const user = require("./routes/userRoute");
const staffs = require("./routes/staffRoute");
const enrollments = require("./routes/enrollmentRoute");
const menu = require("./routes/menuRoute");
const food = require("./routes/foodRoute");
const schoolYear = require("./routes/schoolYearRoute");
const classes = require("./routes/classRoute");
const room = require("./routes/roomRoute");
const activity = require("./routes/activityRoute");
const event = require("./routes/eventRoute");
const medical = require("./routes/medicalRoute");
const topic = require("./routes/topicRoute");
const teacher = require("./routes/teacherRoute");
const schedule = require("./routes/scheduleRoute");
const attendance = require("./routes/attendanceRoute");
const feedback = require("./routes/feedbackRoute");
const dashboardParent = require("./routes/dashboardParentRoute");
const lesson = require("./routes/lessonRoute");
const revenues = require("./routes/revenueRoute");
const services = require("./routes/serviceRoute");
const tuitionManage = require("./routes/tuitionManageRoute");
const tuitions = require("./routes/tuitionRoute");
const manageServices = require("./routes/manageServices");
const receipts = require("./routes/receiptRoute");
const classDBRoute = require("./routes/classDBRoute");
const attendanceDBRoute = require("./routes/attendanceDBRoute");
const schedulesDBRoute = require("./routes/schedulesDBRoute");
const menuDashboardRoute = require("./routes/menuDashboardRoute");
const feedbackDBRoute = require("./routes/feedbackDBRoute");
const medicalDashboardRoute = require("./routes/medicalDashboardRoute");
const guardianRoute = require("./routes/guardianRoute");
const timetable = require("./routes/timetableRoute");
const payment = require("./routes/paymentRoute");
const balance = require("./routes/balanceRoute");
const postRoute = require("./routes/postRoute");
const document = require("./routes/documentRoute");
const postDBRoute = require("./routes/postDBRoute");
const parentInfoRoute = require("./routes/parentInfoRoute");

// Init app
const app = express();

// Middleware
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(morgan("dev"));
app.use(cookieParser());

// Connect DB – KHÔNG connect khi test
if (process.env.NODE_ENV !== "test") {
    connectDB();
    connectGridFS();
}

// Routes
app.use("/api/pms/students", student);
app.use("/api/pms/parents", parent);
app.use("/api/pms/auth", auth);
app.use("/api/pms/functions", functions);
app.use("/api/pms/roles", role);
app.use("/api/pms/accounts", user);
app.use("/api/pms/staffs", staffs);
app.use("/api/pms/teachers", teacher);
app.use("/api/pms/enrollments", enrollments);
app.use("/api/pms/menus", menu);
app.use("/api/pms/schoolYears", schoolYear);
app.use("/api/pms/foods", food);
app.use("/api/pms/classes", classes);
app.use("/api/pms/rooms", room);
app.use("/api/pms/curriculums", activity);
app.use("/api/pms/events", event);
app.use("/api/pms/medicals", medical);
app.use("/api/pms/topics", topic);
app.use("/api/pms/schedules", schedule);
app.use("/api/pms/attendances", attendance);
app.use("/api/pms/feedbacks", feedback);
app.use("/api/pms/revenues", revenues);
app.use("/api/pms/dashboard-parent", dashboardParent);
app.use("/api/pms/dashboard-menus", menuDashboardRoute);
app.use("/api/pms/dashboard-medicals", medicalDashboardRoute);
app.use("/api/pms/dashboard-schedules", schedulesDBRoute);
app.use("/api/pms/dashboard-feedbacks", feedbackDBRoute);
app.use("/api/pms/dashboard-attendances", attendanceDBRoute);
app.use("/api/pms/dashboard-posts", postDBRoute);
app.use("/api/pms/dashboard-class", classDBRoute);
app.use("/api/pms/services", services);
app.use("/api/pms/guardians", guardianRoute);
app.use("/api/pms/time-table", timetable);
app.use("/api/pms/lessons", lesson);
app.use("/api/pms/manage-services", manageServices);
app.use("/api/pms/receipts", receipts);
app.use("/api/pms/tuition-manage", tuitionManage);
app.use("/api/pms/tuitions", tuitions);
app.use("/api/pms/payments", payment);
app.use("/api/pms/balances", balance);
app.use("/api/pms/posts", postRoute);
app.use("/api/pms/documents", document);
app.use("/api/pms/parents-profile", parentInfoRoute);

// Health check
app.get("/", (req, res) => {
    res.send("👋 Welcome to the Blue Dolphin Management API");
});

// Start server – KHÔNG chạy khi test
if (process.env.NODE_ENV !== "test") {
    const PORT = process.env.PORT || 9999;
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
}

// Export app cho Supertest
module.exports = app;
