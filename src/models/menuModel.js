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
  { _id: false } // ⛔ Không tạo _id cho mỗi food
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
  { _id: false } // ⛔ Không tạo _id cho mỗi meal
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
  { _id: false } // ⛔ Không tạo _id cho mỗi day
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

    notes: { type: String },
    createdBy: { type: String },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

// // --- Hook tính tổng dinh dưỡng tự động ---
// MenuSchema.pre("save", function (next) {
//   let weekCalo = 0, weekProtein = 0, weekLipid = 0, weekCarb = 0;

//   this.days.forEach(day => {
//     let dayCalo = 0, dayProtein = 0, dayLipid = 0, dayCarb = 0;

//     day.meals.forEach(meal => {
//       let mealCalo = 0, mealProtein = 0, mealLipid = 0, mealCarb = 0;

//       meal.foods.forEach(food => {
//         mealCalo += (food.calo * food.weight) / 100;
//         mealProtein += (food.protein * food.weight) / 100;
//         mealLipid += (food.lipid * food.weight) / 100;
//         mealCarb += (food.carb * food.weight) / 100;
//       });

//       meal.totalCalo = mealCalo;
//       meal.totalProtein = mealProtein;
//       meal.totalLipid = mealLipid;
//       meal.totalCarb = mealCarb;

//       dayCalo += mealCalo;
//       dayProtein += mealProtein;
//       dayLipid += mealLipid;
//       dayCarb += mealCarb;
//     });

//     day.totalCalo = dayCalo;
//     day.totalProtein = dayProtein;
//     day.totalLipid = dayLipid;
//     day.totalCarb = dayCarb;

//     weekCalo += dayCalo;
//     weekProtein += dayProtein;
//     weekLipid += dayLipid;
//     weekCarb += dayCarb;
//   });

//   this.totalCalo = weekCalo;
//   this.totalProtein = weekProtein;
//   this.totalLipid = weekLipid;
//   this.totalCarb = weekCarb;

//   next();
// });

module.exports = mongoose.model("Menu", MenuSchema);
