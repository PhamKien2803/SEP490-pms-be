const mongoose = require("mongoose");
const ClassSchema = new mongoose.Schema(
    {
        classCode: { type: String, required: true, unique: true },
        className: { type: String, required: true },
        age: { type: String },
        students: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],
        teachers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Staff" }],
        room: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
        schoolYear: { type: mongoose.Schema.Types.ObjectId, ref: "SchoolYear" },
        active: { type: Boolean },
    },
    { timestamps: true, versionKey: false },
);

module.exports = mongoose.model("Class", ClassSchema);
