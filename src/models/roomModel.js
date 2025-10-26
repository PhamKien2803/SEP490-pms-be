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
      trim: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: [1, "Số lượng phải lớn hơn 0."],
    },
    quantityDefect: {
      type: Number,
      default: 0,
    },
    quantityMissing: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const roomSchema = new mongoose.Schema(
  {
    roomName: {
      type: String,
      required: [true, "Tên phòng là bắt buộc."],
      trim: true,
    },
    roomType: {
      type: String,
    },
    capacity: {
      type: Number,
      default: 0,
      min: 0,
    },
    facilities: [facilitySchema],

    state: {
      type: String,
      enum: ["Dự thảo", "Chờ giáo viên duyệt", "Chờ nhân sự xác nhận", "Chờ xử lý", "Hoàn thành"],
      default: "Dự thảo",
    },
    notes: {
      type: String,
      trim: true,
    },
    notesHRA: {
      type: String,
      trim: true,
    },
    active: { type: Boolean, default: true },

    createdBy: String,
    updatedBy: String,
  },
  {
    timestamps: true,
  }
);

const Room = mongoose.model("Room", roomSchema);
module.exports = Room;

