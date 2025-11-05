const mongoose = require("mongoose");

const ServiceModel = new mongoose.Schema(
    {
        serviceCode: { type: String, required: true, unique: true },
        schoolYearId: { type: mongoose.Schema.Types.ObjectId, ref: "SchoolYear", required: true },
        student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
        revenue: { type: mongoose.Schema.Types.ObjectId, ref: "Revenue", required: true },
        imageUniform: { type: String, required: true },
        qty: { type: Number, required: true },
        totalAmount: { type: Number, required: true },
        createdBy: { type: String },
        updatedBy: { type: String },
        active: { type: Boolean, default: true },
    },
    { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Service", ServiceModel);
