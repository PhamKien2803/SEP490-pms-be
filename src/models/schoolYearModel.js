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
    enrollmentStartDate: { type: Date, required: true },
    enrollmentEndDate: { type: Date, required: true },
    serviceStartTime: { type: Date },
    serviceEndTime: { type: Date },
    active: { type: Boolean, default: true },
    isPublished: { type: Boolean, default: false },
    createdBy: { type: String },
    updatedBy: { type: String },
    confirmedBy: { type: String },
  },
  { timestamps: true, versionKey: false }
);

// SchoolYearSchema.pre("validate", function (next) {
//   const startDate = new Date(this.startDate);
//   const endDate = new Date(this.endDate);
//   const enrollmentStart = new Date(this.enrollmentStartDate);
//   const enrollmentEnd = new Date(this.enrollmentEndDate);

//   if (enrollmentStart < startDate || enrollmentEnd > endDate) {
//     return next(
//       new Error(
//         "Thời gian tuyển sinh phải nằm trong khoảng thời gian của năm học"
//       )
//     );
//   }

//   next();
// });

module.exports = mongoose.model("SchoolYear", SchoolYearSchema);
