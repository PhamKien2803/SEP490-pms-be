const mongoose = require("mongoose");
const ParentSchema = new mongoose.Schema(
    {
        parentCode: { type: String, required: true },
        fullName: { type: String },
        dob: { type: Date, required: true },
        // email: { type: String, required: true },
        IDCard: { type: String, required: true },
        gender: { type: String, enum: ["male", "female", "other"], required: true },
        students: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],
        address: { type: String },
        nation: { type: String },
        religion: { type: String },
        active: { type: Boolean },
    },
    { timestamps: true, versionKey: false },
);

module.exports = mongoose.model("Parent", ParentSchema);
