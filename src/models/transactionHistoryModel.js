const mongoose = require("mongoose");

const TransactionHistoryModel = new mongoose.Schema(
    {
        type: { type: String, enum: ["Tiền thu", "Tiền chi"], required: true },
        amount: { type: Number, required: true },
        balanceBefore: { type: Number },
        balanceAfter: { type: Number },
        source: { type: String },
        transactionCode: { type: String, unique: true },
        note: { type: String },
        createdBy: { type: String },
    },
    { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("TransactionHistory", TransactionHistoryModel);
