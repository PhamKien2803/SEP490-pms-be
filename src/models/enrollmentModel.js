const mongoose = require("mongoose");
const EnrollmentSchema = new mongoose.Schema(
  {
    //student
    enrollmentCode: { type: String, required: true, unique: true },
    studentName: { type: String, required: true },
    studentDob: { type: Date, required: true },
    studentGender: { type: String, enum: ["Nam", "Nữ", "Khác"], required: true },
    studentIdCard: {
      type: String,
      required: true,
      unique: true,
      match: [/^\d{12}$/, "Số CCCD/Học sinh phải gồm đúng 12 chữ số"]
    },
    studentNation: { type: String, required: true },
    studentReligion: { type: String, required: true },
    address: { type: String, required: true },
    birthCertId: { type: mongoose.Schema.Types.ObjectId },
    healthCertId: { type: mongoose.Schema.Types.ObjectId, },

    //dad
    fatherName: { type: String, required: true },
    fatherGender: { type: String, enum: ["Nam", "Nữ", "Khác"] },
    fatherPhoneNumber: {
      type: String,
      required: true,
      unique: true,
      match: [/^\d{10}$/, "Số điện thoại của cha phải gồm đúng 10 chữ số"]
    },
    fatherEmail: {
      type: String,
      required: true,
      unique: true,
      match: [/^\S+@\S+\.\S+$/, "Email của cha không hợp lệ"]
    },
    fatherIdCard: {
      type: String,
      required: true,
      unique: true,
      match: [/^\d{12}$/, "Số CCCD của cha phải gồm đúng 12 chữ số"]
    },
    fatherJob: { type: String },

    //mom
    motherName: { type: String, required: true },
    motherGender: { type: String, enum: ["Nam", "Nữ", "Khác"] },
    motherPhoneNumber: {
      type: String,
      required: true,
      unique: true,
      match: [/^\d{10}$/, "Số điện thoại của mẹ phải gồm đúng 10 chữ số"]
    },
    motherEmail: {
      type: String,
      required: true,
      unique: true,
      match: [/^\S+@\S+\.\S+$/, "Email của mẹ không hợp lệ"]
    },
    motherIdCard: {
      type: String,
      required: true,
      unique: true,
      match: [/^\d{12}$/, "Số CCCD của mẹ phải gồm đúng 12 chữ số"]
    },
    motherJob: { type: String },
    reason: { type: String },
    state: {
      type: String,
      enum: ["Chờ BGH phê duyệt", "Chờ xử lý", "Hoàn thành", "Chưa đủ điều kiện nhập học", "Xử lý lỗi", "Chờ xử lý tự động"],
      default: "Chờ xử lý"
    },
    active: { type: String },
    approvedBy: { type: String },

  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Enrollment", EnrollmentSchema);
