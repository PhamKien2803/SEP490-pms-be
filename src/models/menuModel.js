const mongoose = require("mongoose");

const MealSchema = new mongoose.Schema(
  {
    mealType: {
      type: String,
      enum: ["sáng", "trưa", "xế"],
      required: true,
    },

    foods: [
      {
        food: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Food",
          required: true,
        },
      },
    ],

    totalCalo: { type: Number, default: 0 },
    totalProtein: { type: Number, default: 0 },
    totalLipid: { type: Number, default: 0 },
    totalCarb: { type: Number, default: 0 },
  },
  { _id: false }
);

const DaySchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    meals: [MealSchema],

    totalCalo: { type: Number, default: 0 },
    totalProtein: { type: Number, default: 0 },
    totalLipid: { type: Number, default: 0 },
    totalCarb: { type: Number, default: 0 },
  },
  { _id: false }
);

const MenuSchema = new mongoose.Schema(
  {
    weekStart: {
      type: Date,
      required: [true, "Ngày bắt đầu tuần là bắt buộc"],
    },
    weekEnd: {
      type: Date,
      required: [true, "Ngày kết thúc tuần là bắt buộc"],
      validate: {
        validator: function (value) {
          if (!this.weekStart || !value) return true;
          const start = new Date(this.weekStart).getTime();
          const end = new Date(value).getTime();
          return end >= start;
        },
        message: "Ngày kết thúc tuần phải sau hoặc bằng ngày bắt đầu",
      },
    },
    weekNumber: { type: Number },
    ageGroup: {
      type: String,
      required: [true, "Nhóm tuổi là bắt buộc"],
      enum: ["Dưới 1 tuổi", "1-3 tuổi", "4-5 tuổi"],
    },

    days: [DaySchema],

    totalCalo: { type: Number, default: 0 },
    totalProtein: { type: Number, default: 0 },
    totalLipid: { type: Number, default: 0 },
    totalCarb: { type: Number, default: 0 },

    state: {
      type: String,
      enum: ["Chờ xử lý", "Đã duyệt", "Từ chối"],
      default: "Chờ xử lý",
    },

    active: { type: Boolean, default: true },
    notes: { type: String },
    createdBy: { type: String },
    updatedBy: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Menu", MenuSchema);
