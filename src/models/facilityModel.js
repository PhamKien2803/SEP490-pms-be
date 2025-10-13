const mongoose = require("mongoose");

const facilitySchema = new mongoose.Schema(
  {
    facilityName: {
      type: String,
      required: [true, "Tên cơ sở vật chất là bắt buộc."],
      trim: true,
    },
    facilityType: {
      type: String,
    },
    quantity: {
      type: Number,
      default: 1,
      min: [1, "Số lượng phải lớn hơn 0."],
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      // required: [true, "Phòng là bắt buộc."],
    },  
    condition: {
      type: String,
      enum: ["Mới", "Tốt", "Trung bình", "Hỏng", "Orther"],
      default: "good",
    },
    price: {
      type: Number,
      min: 0,
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: String,
    },
    updatedBy: {
      type: String,
    },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

const Facility = mongoose.model("Facility", facilitySchema);
module.exports = Facility;
