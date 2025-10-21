const mongoose = require("mongoose");

const medicalSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    physicalDevelopment: {
      height: { type: Number },
      weight: { type: Number },
      bodyMassIndex: { type: Number },
      evaluation: { type: String },
    },

    comprehensiveExamination: {
      mentalDevelopment: { type: String },
      motorDevelopment: { type: String },
      diseasesDetected: [{ type: String }],
      abnormalSigns: [{ type: String }],
      diseaseRisk: [{ type: String }],
      notes: { type: String },
    }, 

    conclusion: {
      healthStatus: {
        type: String,
      },
      advice: { type: String },
    },

    createdBy: { type: String },
    updatedBy: { type: String },
    active: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Medical", medicalSchema);
