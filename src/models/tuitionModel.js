const mongoose = require("mongoose");

const TuitionModel = new mongoose.Schema(
    {
        tuitionName: { type: String, required: true, unique: true },
        totalAmount: { type: Number, required: true },
        month: { type: Number, required: true },
        schoolYear: { type: mongoose.Schema.Types.ObjectId, ref: "SchoolYear", required: true },
        studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
        createdBy: { type: String },
        updatedBy: { type: String },
        state: { type: String, enum: ['Đã thanh toán', 'Chưa thanh toán'], default: 'Chưa thanh toán' },
    },
    { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Tuition", TuitionModel);
