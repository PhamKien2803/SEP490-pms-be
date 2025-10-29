const mongoose = require("mongoose");
const LessonSchema = new mongoose.Schema({
    schedule: { type: mongoose.Schema.Types.ObjectId, ref: "Schedule", required: true },
    weekNumber: { type: Number, required: true },
    activities: [
        {
            activity: { type: mongoose.Schema.Types.ObjectId, ref: "Activity", required: true },
            
            startTime: { type: Number },
            endTime: { type: Number },
            lessonPlan: { type: String, required: true },
        }
    ],
    status: { type: String, enum: ["Dự thảo", "Chờ duyệt", "Hoàn thành"], default: "Dự thảo" }
}, { timestamps: true });

module.exports = mongoose.model("Lesson", LessonSchema);
