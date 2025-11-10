const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },

    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },

    title: {
      type: String,
      required: [true, "Tiêu đề là bắt buộc"],
    },

    content: {
      type: String,
    },

    createdBy: { type: String },
    updatedBy: { type: String },
    active: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Post", postSchema);
