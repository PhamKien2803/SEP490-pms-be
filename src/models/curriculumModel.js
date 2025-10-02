const mongoose = require("mongoose");
const CurriculumSchema = new mongoose.Schema(
    {
        curriculumCode: { type: String },
        curriculumName: { type: String },
        age: { type: Number },
        activityNumber: { type: Number },
        active: { type: Boolean },
        startTime: { type: Date, required: true },
        endTime: {
            type: Date,
            required: true,
            validate: {
                validator: function (value) {
                    return !this.startTime || value > this.startTime;
                },
                message: "endTime must be greater than startTime"
            }
        },
    },
    { timestamps: true, versionKey: false },
);

module.exports = mongoose.model("Curriculum", CurriculumSchema);
