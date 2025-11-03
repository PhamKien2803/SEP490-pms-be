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
          const age = today.getFullYear() - v.getFullYear();
          return age >= 16;
        },
        message: "Người đón hộ phải từ 16 tuổi trở lên",
      },
    },
    phoneNumber: {
      type: String,
      required: [true, "Số điện thoại là bắt buộc"],
      match: [/^(0|\+84)[0-9]{9}$/, "Số điện thoại không hợp lệ (phải theo định dạng Việt Nam)"],
    },
    relationship: {
      type: String,
      enum: ["Ông", "Bà", "Cô", "Dì", "Chú", "Bác", "Bạn bố mẹ", "Anh", "Chị", "Khác"],
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Parent",
    },
    delegationPeriod: {
      fromDate: {
        type: Date,
        required: [true, "Ngày bắt đầu ủy quyền là bắt buộc"],
      },
      toDate: {
        type: Date,
        validate: {
          validator: function (v) {
            if (!v) return true; // cho phép null (vô thời hạn)
            return v >= this.delegationPeriod.fromDate;
          },
          message: "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu",
        },
      },
    },
    note: {
      type: String,
      maxlength: [255, "Ghi chú không được vượt quá 255 ký tự"],
    },
    createdBy: { type: String },
    updatedBy: { type: String },
    status: { type: String },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false }
);

GuardianSchema.pre("save", function (next) {
  const today = new Date();
  const { fromDate, toDate } = this.delegationPeriod || {};

  if (fromDate && fromDate < today.setHours(0, 0, 0, 0)) {
    return next(new Error("Ngày bắt đầu phải từ hôm nay trở đi"));
  }

  if (fromDate && toDate) {
    const diffInDays = (toDate - fromDate) / (1000 * 60 * 60 * 24);
    if (diffInDays > 365) {
      return next(new Error("Thời gian ủy quyền không được vượt quá 1 năm"));
    }
  }

  next();
});

module.exports = mongoose.model("Guardian", GuardianSchema);
