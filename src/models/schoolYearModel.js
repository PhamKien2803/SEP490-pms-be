const mongoose = require("mongoose");

const SchoolYearSchema = new mongoose.Schema(
  {
    schoolyearCode: { type: String, required: true, unique: true },
    schoolYear: { type: String, unique: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    numberTarget: { type: Number },
    state: {
      type: String,
      enum: ["Chưa hoạt động", "Đang hoạt động", "Hết thời hạn"],
      default: "Chưa hoạt động",
    },
    active: { type: Boolean, default: true },
    createdBy: { type: String },
    updatedBy: { type: String },
    confirmedBy: { type: String },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("SchoolYear", SchoolYearSchema);
