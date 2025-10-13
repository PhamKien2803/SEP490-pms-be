const mongoose = require("mongoose");

const SchoolYearSchema = new mongoose.Schema(
  {
    schoolyearCode: { type: String, required: true, unique: true },
    schoolYear: { type: String },
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

SchoolYearSchema.pre("save", function (next) {
  if (this.startDate && this.endDate) {
    const startYear = new Date(this.startDate).getFullYear();
    const endYear = new Date(this.endDate).getFullYear();

    if (endYear !== startYear + 1) {
      return next(
        new Error("Thời gian bắt đầu và thời gian kết thúc không hợp lệ")
      );
    }
    const currentYear = new Date().getFullYear();
    if (startYear < currentYear - 1) {
      return next(
        new Error("Thời gian bắt đầu không hợp lệ")
      );
    }

    if (!this.schoolYear) {
      this.schoolYear = `${startYear}-${endYear}`;
    }
  } else {
    return next(new Error("Cần có cả startDate và endDate."));
  }

  next();
});

module.exports = mongoose.model("SchoolYear", SchoolYearSchema);
