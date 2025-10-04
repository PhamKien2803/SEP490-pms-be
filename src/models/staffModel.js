const mongoose = require("mongoose");

const StaffSchema = new mongoose.Schema(
  {
    staffCode: {
      type: String,
      required: [true, "Mã nhân viên là bắt buộc"],
      trim: true
    },

    fullName: {
      type: String,
      required: [true, "Họ tên là bắt buộc"],
      trim: true
    },

    dob: {
      type: Date,
      required: [true, "Ngày sinh là bắt buộc"],
      validate: {
        validator: function (value) {
          return value < new Date();
        },
        message: "Ngày sinh phải nhỏ hơn ngày hiện tại"
      }
    },

    email: {
      type: String,
      required: [true, "Email là bắt buộc"],
      trim: true,
      lowercase: true,
      unique: true,
      validate: {
        validator: function (v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: "Email không hợp lệ"
      }
    },

    IDCard: {
      type: String,
      required: [true, "Số CMND/CCCD là bắt buộc"],
      unique: true,
      validate: {
        validator: function (v) {
          return /^\d{12}$/.test(v);
        },
        message: "CMND/CCCD phải gồm đúng 12 chữ số"
      }
    },

    gender: {
      type: String,
      enum: {
        values: ["Nam", "Nữ", "Khác"],
        message: "Giới tính chỉ có thể là Nam, Nữ hoặc Khác"
      },
      required: [true, "Giới tính là bắt buộc"]
    },

    phoneNumber: {
      type: String,
      required: [true, "Số điện thoại là bắt buộc"],
      unique: true,
      validate: {
        validator: function (v) {
          return /^\d{10}$/.test(v);
        },
        message: "Số điện thoại phải gồm đúng 10 chữ số"
      }
    },

    address: { type: String, trim: true },
    nation: { type: String, trim: true },
    religion: { type: String, trim: true },
    isTeacher: { type: Boolean, default: false },
    createdBy: { type: String, trim: true },
    updatedBy: { type: String, trim: true },
    active: { type: Boolean },

  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Staff", StaffSchema);
