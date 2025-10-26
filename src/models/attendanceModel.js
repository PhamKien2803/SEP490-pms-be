const mongoose = require("mongoose");

const studentAttendanceSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    status: {
      type: String,
      enum: ["Có mặt", "Vắng mặt có phép", "Đi muộn", "Vắng mặt không phép"],
      default: "Có mặt",
    },
    note: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: [true, "Lớp học là bắt buộc."],
    },

    schoolYear: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SchoolYear",
      required: [true, "Năm học là bắt buộc."],
    },

    date: {
      type: Date,
      required: [true, "Ngày điểm danh là bắt buộc."],
    },

    students: [studentAttendanceSchema], // dùng schema con đã định nghĩa ở trên

    takenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
    },

    takenAt: {
      type: Date,
      default: Date.now,
    },

    generalNote: {
      type: String,
      trim: true,
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

attendanceSchema.index({ class: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);

