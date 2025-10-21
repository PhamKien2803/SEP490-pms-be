import mongoose from "mongoose";

const medicalSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    physicalDevelopment: {
      height: { type: Number, required: true },
      weight: { type: Number, required: true },
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
        required: true,
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

export default mongoose.model("MedicalRecord", medicalSchema);
