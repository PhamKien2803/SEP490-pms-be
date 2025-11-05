const mongoose = require("mongoose");

const RevenueModel = new mongoose.Schema(
    {
        revenueCode: { type: String, required: true, unique: true },
        revenueName: { type: String, required: true, unique: true },
        unit: { type: String, required: true },
        amount: { type: Number, required: true },
        createdBy: { type: String },
        updatedBy: { type: String },
        active: { type: Boolean, default: true },
    },
    { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Revenue", RevenueModel);
