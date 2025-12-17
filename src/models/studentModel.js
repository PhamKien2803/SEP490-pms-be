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
        nickname: { type: String },
        gender: { type: String, enum: ["Nam", "Nữ", "Khác"], required: true },
        address: { type: String, required: true },
        nation: { type: String, required: true },
        religion: { type: String, required: true },
        birthCertId: { type: mongoose.Schema.Types.ObjectId },
        healthCertId: { type: mongoose.Schema.Types.ObjectId, },
        graduated: { type: Boolean },
        graduatedAt: { type: Date },
        imageStudent: { type: String },
        active: { type: Boolean },
        createdBy: { type: String },
        updatedBy: { type: String },
    },
    { timestamps: true, versionKey: false },
);

module.exports = mongoose.model("Student", StudentSchema);
