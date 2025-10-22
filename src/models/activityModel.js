const mongoose = require("mongoose");

const ActivitySchema = new mongoose.Schema(
    {
        activityCode: { type: String, required: true },
        activityName: { type: String, required: true },
        age: { type: String },
        type: { type: String, enum: ["Cố định", "Bình thường", "Sự kiện"], required: true },
        category: {
            type: String,
            enum: [
                "Phát triển thể chất",
                "Phát triển nhận thức",
                "Phát triển ngôn ngữ",
                "Phát triển tình cảm",
                "Phát triển thẩm mỹ",
                "Phát triển kỹ năng xã hội",
            ],
        },
        startTime: { type: Number, min: 0, max: 1439 },
        endTime: {
            type: Number,
            min: 435,
            max: 1050,
            validate: {
                validator: function (value) {
                    return this.startTime == null || value > this.startTime;
                },
                message: "Thời gian kết thúc phải lớn hơn thời gian bắt đầu"
            }
        },
        eventName: { type: String },
        active: { type: Boolean, default: true },
        createdBy: { type: String },
        updatedBy: { type: String }
    },
    { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Activity", ActivitySchema);
