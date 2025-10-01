const mongoose = require("mongoose");
const StaffSchema = new mongoose.Schema(
    {
        staffCode: { type: String, required: true },
        fullName: { type: String, required: true },
        dob: { type: Date, required: true },
        email: { type: String },
        IDCard: { type: String, required: true },
        gender: { type: String, enum: ["male", "female", "other"], required: true },
        address: { type: String },
        nation: { type: String },
        religion: { type: String },
        isTeacher: { type: Boolean, default: false },
        active: { type: Boolean },
    },
    { timestamps: true, versionKey: false },
);

module.exports = mongoose.model("Staff", StaffSchema);
