const mongoose = require("mongoose");

const postFileSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },

    fileUrl: {
      type: String,
      required: [true, "Đường dẫn ảnh/video là bắt buộc"],
    },

    fileType: {
      type: String,
      enum: ["image", "video"],
      required: [true, "Loại file là bắt buộc"],
    },

    fileSize: {
      type: Number,
    },

    cloudinaryPublicId: {
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

module.exports = mongoose.model("PostFile", postFileSchema);
