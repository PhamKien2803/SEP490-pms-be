const mongoose = require("mongoose");

const ScheduleSchema = new mongoose.Schema({
    schoolYear: { type: mongoose.Schema.Types.ObjectId, ref: "SchoolYear", required: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    month: { type: Number, required: true },
    scheduleDays: [
        {
            date: { type: Date, required: true },
            activities: [
                {
                    activity: { type: mongoose.Schema.Types.ObjectId, ref: "Activity", required: true },
                    startTime: { type: Number },
                    endTime: { type: Number },
                }
            ],
            isHoliday: {type: Boolean, default: false},
            notes: { type: String }
        }
    ],
    status: { type: String, enum: ["Dự thảo", "Xác nhận"], default: "Dự thảo" }
}, { timestamps: true });


module.exports = mongoose.model("Schedule", ScheduleSchema);
