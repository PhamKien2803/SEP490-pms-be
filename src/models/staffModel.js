const mongoose = require("mongoose");
const StaffSchema = new mongoose.Schema(
    {
        staffCode: { type: String, required: true },
        fullName: { type: String, required: true },
        dob: { type: Date, required: true },
        email: { type: String, required: true },
        IDCard: { type: String, required: true },
        gender: { type: String, enum: ["male", "female", "other"], required: true },
        address: { type: String },
        active: { type: Boolean },

    },
    { timestamps: true, versionKey: false },
);

module.exports = mongoose.model("Staff", StaffSchema);
