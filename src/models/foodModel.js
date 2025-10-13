const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tên nguyên liệu là bắt buộc'],
    trim: true
  },
  gram: {
    type: Number,
    default: 0
  },
  unit: {
    type: String,
    required: [true, 'Đơn vị tính là bắt buộc'],
    trim: true,
  },
  calories: {
    type: Number,
    default: 0
  },
  protein: {
    type: Number,
    default: 0
  },
  lipid: {
    type: Number,
    default: 0
  },
  carb: {
    type: Number,
    default: 0
  },
}, { _id: false });

const foodSchema = new mongoose.Schema({
  foodName: {
    type: String,
    required: [true, 'Tên món ăn là bắt buộc'],
    trim: true,
    unique: true
  },
  ageGroup: {
    type: String,
    required: [true, 'Nhóm tuổi là bắt buộc'],
    trim: true,
    enum: ['Dưới 1 tuổi', '1-3 tuổi', '4-5 tuổi']
  },
  totalCalories: {
    type: Number,
    default: 0
  },
  ingredients: {
    type: [ingredientSchema],
    required: [true, 'Nguyên liệu là bắt buộc'],
    validate: {
      validator: function (v) {
        return v && v.length > 0;
      },
      message: 'Món ăn phải có ít nhất một nguyên liệu!'
    }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: { type: String },
  updatedBy: { type: String },
  active: { type: Boolean, default: true }

});

const Food = mongoose.model('Food', foodSchema);

module.exports = Food;