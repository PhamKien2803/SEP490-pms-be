const mongoose = require("mongoose");

const DocumentSchema = new mongoose.Schema(
    {
        documentCode: { type: String, required: true, unique: true },
        documentName: { type: String, required: true },
        documentDate: { type: Date },
        schoolYear: { type: mongoose.Schema.Types.ObjectId, ref: "SchoolYear" },
        receiver: { type: String, required: true },
        numberBank: { type: String },
        bank: { type: String },
        amount: { type: Number, required: true },
        reason: { type: String, required: true },
        method: {
            type: String,
            enum: ["Tiền mặt", "Chuyển khoản"],
            default: "Tiền mặt"
        },
        documentList: [
            {
                document: { type: String },
                amount: { type: Number }
            }
        ],
        createdBy: { type: String },
        status: {
            type: String,
            enum: ["Chưa thanh toán", "Đã thanh toán"],
            default: "Chưa thanh toán"
        },
        active: { type: Boolean, default: true }
    },
    { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Document", DocumentSchema);
