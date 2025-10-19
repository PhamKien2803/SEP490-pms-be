const mongoose = require("mongoose");
const SchoolYear = require("./schoolYearModel"); 

const EventSchema = new mongoose.Schema(
  {
    eventCode: { type: String, required: true, unique: true },
    eventName: { type: String, required: true },
    holidayStartDate: { type: Date, required: true },
    holidayEndDate: { type: Date, required: true },
    schoolYear: { type: mongoose.Schema.Types.ObjectId, ref: "SchoolYear" },
    note: { type: String },
    active: { type: Boolean, default: true },
    createdBy: { type: String },
    updatedBy: { type: String },
  },
  { timestamps: true, versionKey: false }
);

EventSchema.pre("save", async function (next) {
  if (!this.schoolYear) {
    try {
      const activeYear = await SchoolYear.findOne({ active: true, state: "Đang hoạt động" });
      if (activeYear) {
        this.schoolYear = activeYear._id;
      }
    } catch (err) {
      return next(err);
    }
  }
  next();
});

module.exports = mongoose.model("Event", EventSchema);
