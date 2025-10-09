const mongoose = require("mongoose");

const FoodItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    weight: { type: Number, required: true },
    calo: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    lipid: { type: Number, default: 0 },
    carb: { type: Number, default: 0 },
  },
  { _id: false } 
);

const MealSchema = new mongoose.Schema(
  {
    mealType: { type: String, enum: ["sáng", "trưa", "xế"], required: true },
    foods: [FoodItemSchema],
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
    weekStart: { type: Date, required: true }, // Thứ 2
    weekEnd: { type: Date, required: true },   // Chủ nhật
    weekNumber: { type: Number },
    ageGroup: { type: String, required: true },
    days: [DaySchema],

    // Tổng của cả tuần
    totalCalo: { type: Number, default: 0 },
    totalProtein: { type: Number, default: 0 },
    totalLipid: { type: Number, default: 0 },
    totalCarb: { type: Number, default: 0 },

    state: { type: String, enum: ["Chờ xử lý", "Đã lấy calo", "Đã duyệt", "Từ chối"], default: "Chờ xử lý" },

    notes: { type: String },
    createdBy: { type: String },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Menu", MenuSchema);
