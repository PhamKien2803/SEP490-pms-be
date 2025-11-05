const mongoose = require("mongoose");

const GuardianSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      trim: true,
      minlength: [3, "Họ tên phải có ít nhất 3 ký tự"],
      maxlength: [100, "Họ tên không được vượt quá 100 ký tự"],
      match: [/^[A-Za-zÀ-ỹ\s]+$/, "Họ tên chỉ được chứa chữ cái và dấu tiếng Việt"],
      required: [true, "Họ tên người đón hộ là bắt buộc"],
    },
    dob: {
      type: Date,
      required: [true, "Ngày sinh là bắt buộc"],
      validate: {
        validator: function (v) {
          const today = new Date();
          const age =
            today.getFullYear() -
            v.getFullYear() -
            (today < new Date(today.getFullYear(), v.getMonth(), v.getDate()) ? 1 : 0);
          return age >= 16;
        },
        message: "Người đón hộ phải từ 16 tuổi trở lên",
      },
    },
    phoneNumber: {
      type: String,
      required: [true, "Số điện thoại là bắt buộc"],
      match: [
        /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/,
        "Số điện thoại không hợp lệ (phải theo định dạng Việt Nam)",
      ],
    },
    relationship: {
      type: String,
      enum: ["Ông", "Bà", "Cô", "Dì", "Chú", "Bác", "Bạn bố mẹ", "Anh", "Chị", "Khác"],
      required: [true, "Mối quan hệ là bắt buộc"],
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Phải có học sinh liên kết"],
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Parent",
    },
    pickUpDate: {
      type: Date,
      required: [true, "Ngày đón hộ là bắt buộc"],
    },
    note: {
      type: String,
      maxlength: [255, "Ghi chú không được vượt quá 255 ký tự"],
    },
    createdBy: { type: String },
    updatedBy: { type: String },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Guardian", GuardianSchema);
