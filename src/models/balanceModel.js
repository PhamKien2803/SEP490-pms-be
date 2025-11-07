const mongoose = require("mongoose");

const BalanceModel = new mongoose.Schema(
    {
        orderCode: { type: Number, unique: true, sparse: true },
        tuitionName: { type: String, required: true, unique: true },
        totalAmount: { type: Number, required: true },
        month: { type: Number, required: true },
        receipt: { type: mongoose.Schema.Types.ObjectId, ref: "Receipt", required: true },
        services: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
        schoolYear: { type: mongoose.Schema.Types.ObjectId, ref: "SchoolYear", required: true },
        studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
        createdBy: { type: String },
        updatedBy: { type: String },
        state: { type: String, enum: ['Đã thanh toán', 'Chưa thanh toán', 'Đang xử lý', 'Thanh toán lỗi'], default: 'Chưa thanh toán' },
    },
    { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Balance", BalanceModel);
