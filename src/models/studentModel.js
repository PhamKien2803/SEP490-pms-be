const mongoose = require("mongoose");
const StudentSchema = new mongoose.Schema(
    {
        studentCode: { type: String, required: true, unique: true },
        fullName: { type: String, required: true },
        dob: { type: Date, required: true },
        idCard: {
            type: String,
            required: true,
            unique: true,
            validate: {
                validator: function (v) {
                    return /^\d{12}$/.test(v);
                },
                message: props => `Số căn cước công dân không hợp lệ.`
            }
        },
        gender: { type: String, enum: ["Male", "Female", "Other"], required: true },
        address: { type: String, required: true },
        relationship: { type: String, required: true },
        nation: { type: String, required: true },
        religion: { type: String, required: true },
        active: { type: Boolean },
        createdBy: { type: String },
        updatedBy: { type: String },
    },
    { timestamps: true, versionKey: false },
);

module.exports = mongoose.model("Student", StudentSchema);
