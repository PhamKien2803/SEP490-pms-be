const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema(
  {
    eventCode: { type: String, required: true, unique: true },
    eventName: {type: String, required: true},
    holidayStartDate: {type: Date, required: true},
    holidayEndDate: {type: Date, required: true},
    schoolYear: { type: mongoose.Schema.Types.ObjectId, ref: "SchoolYear"},
    active: { type: Boolean, default: true },
    createdBy: { type: String },
    updatedBy: { type: String },
  },
  { timestamps: true, versionKey: false }
);


module.exports = mongoose.model("Event", EventSchema);
