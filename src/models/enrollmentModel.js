const mongoose = require("mongoose");
const EnrollmentSchema = new mongoose.Schema(
  {
    //student
    enrollmentCode: { type: String, required: true, unique: true },
    studentName: { type: String, required: true },
    studentDob: { type: Date, required: true },
    studentGender: { type: String, enum: ["Nam", "Nữ", "Khác"], required: true },
    studentIdCard: { type: String, required: true, unique: true },
    studentNation: { type: String, required: true },
    studentReligion: { type: String, required: true },
    address: { type: String, required: true },
    birthCert: { type: String },
    heathCert: { type: String },

    //dad
    fatherName: { type: String, required: true },
    fatherGender: { type: String, enum: ["Nam", "Nữ", "Khác"] },
    fatherPhoneNumber: { type: String, required: true, unique: true },
    fatherEmail: { type: String, required: true, unique: true },
    fatherIdCard: { type: String, required: true, unique: true },
    fatherJob: { type: String },

    //mom
    motherName: { type: String, required: true },
    motherGender: { type: String, enum: ["Nam", "Nữ", "Khác"] },
    motherPhoneNumber: { type: String, required: true, unique: true },
    motherEmail: { type: String, required: true, unique: true },
    motherIdCard: { type: String, required: true, unique: true },
    motherJob: { type: String },
    note: { type: String },
    state: {
      type: String,
      enum: ["Chờ BGH phê duyệt", "Chờ xử lý", "Hoàn thành", "Chờ bổ sung"],
      default: "Chờ xử lý"
    },
    active: { type: String },
    approvedBy: { type: String },

  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Enrollment", EnrollmentSchema);
