const mongoose = require("mongoose");
const SchoolYear = require('./schoolYearModel');
const ClassSchema = new mongoose.Schema(
    {
        classCode: { type: String, required: true, unique: true },
        className: { type: String, required: true, unique: true },
        age: { type: String },
        students: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student", unique: true }],
        teachers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Staff", unique: true }],
        room: { type: mongoose.Schema.Types.ObjectId, ref: "Room", unique: true },
        schoolYear: { type: mongoose.Schema.Types.ObjectId, ref: "SchoolYear" },
        active: { type: Boolean },
    },
    { timestamps: true, versionKey: false },
);

ClassSchema.pre("save", async function (next) {
    if (!this.schoolYear) {
        const activeYear = await SchoolYear.findOne({ active: true, state: "Đang hoạt động" });
        if (activeYear) {
            this.schoolYear = activeYear._id;
        }
    }
    next();
});

module.exports = mongoose.model("Class", ClassSchema);
