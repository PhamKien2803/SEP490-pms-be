const mongoose = require("mongoose");
const LessonSchema = new mongoose.Schema({
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    schoolYearId: { type: mongoose.Schema.Types.ObjectId, ref: "SchoolYear", required: true },
    month: { type: Number, required: true },
    weekNumber: { type: Number, required: true },
    topicName: { type: String },
    scheduleDays: [
        {
            date: { type: Date, required: true },
            dayName: { type: String },
            activities: [
                {
                    activity: { type: mongoose.Schema.Types.ObjectId, ref: "Activity" },
                    startTime: { type: Number },
                    endTime: { type: Number },
                    isFix: { type: Boolean },
                    tittle: { type: String },
                    description: { type: String },
                }
            ],
            isHoliday: { type: Boolean, default: false },
            notes: { type: String }
        }
    ],
    status: { type: String, enum: ["Dự thảo", "Chờ duyệt", "Hoàn thành"], default: "Dự thảo" }
}, { timestamps: true });

module.exports = mongoose.model("Lesson", LessonSchema);
