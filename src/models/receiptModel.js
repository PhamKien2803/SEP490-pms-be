const mongoose = require("mongoose");

const ReceiptModel = new mongoose.Schema(
    {
        receiptCode: { type: String, required: true, unique: true },
        receiptName: { type: String, required: true, unique: true },
        revenueList: [
            {
                revenue: { type: mongoose.Schema.Types.ObjectId, ref: "Revenue", required: true },
                amount: { type: Number, required: true }
            }
        ],
        schoolYear: { type: mongoose.Schema.Types.ObjectId, ref: "SchoolYear", required: true },
        month: { type: Number, required: true },
        totalAmount: { type: Number, required: true },
        createdBy: { type: String },
        updatedBy: { type: String },
        active: { type: Boolean, default: true },
        state: {
            type: String,
            enum: ["Chưa xác nhận", "Đã xác nhận"],
            default: "Chưa xác nhận",
        },
    },
    { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Receipt", ReceiptModel);
