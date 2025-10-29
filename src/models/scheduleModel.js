const mongoose = require("mongoose");

const ScheduleSchema = new mongoose.Schema({
    schoolYear: { type: mongoose.Schema.Types.ObjectId, ref: "SchoolYear", required: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    month: { type: Number, required: true },
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
    status: { type: String, enum: ["Dự thảo", "Xác nhận"], default: "Dự thảo" }
}, { timestamps: true });


module.exports = mongoose.model("Schedule", ScheduleSchema);
