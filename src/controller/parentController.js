const Parent = require("../models/parentModel");
const User = require("../models/userModel");
const { HTTP_STATUS } = require("../constants/useConstants");
const bcrypt = require("bcryptjs");

exports.getInforParent = async (req, res) => {
  try {
    const { parentId } = req.params;

    if (!parentId) {
      return res.status(400).json({ message: "Parent không hợp lệ!" });
    }

    const parent = await Parent.findById(parentId)
      .populate("students");

    if (!parent) {
      return res.status(404).json({ message: "Không tìm thấy phụ huynh!" });
    }

    return res.status(200).json({
      success: true,
      data: parent,
    });
  } catch (error) {
    console.error("❌ Error getInforParent:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.changePasswordParent = async (req, res) => {
  try {
    const { parentId } = req.params;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "Mật khẩu mới hoặc mật khẩu cũ không hợp lệ!" });
    }

    const user = await User.findOne({ parent: parentId });

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng!" });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Mật khẩu cũ không hợp lệ" });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({ 
      success: true,
      message: "Đổi mật khẩu thành công!" 
    });

  } catch (error) {
    console.error("❌ Error changePasswordParent:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateParent = async (req, res) => {
  try {
    const { parentId } = req.params;

    if (!parentId) {
      return res.status(400).json({ message: "Parent không hợp lệ!" });
    }

    const updateData = req.body;

    const updatedParent = await Parent.findByIdAndUpdate(
      parentId,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    ).populate("students");

    if (!updatedParent) {
      return res.status(404).json({ message: "Không tìm thấy phụ huynh!" });
    }

    return res.status(200).json({
      success: true,
      data: updatedParent,
    });
  } catch (error) {
    console.error("❌ Error updateParent:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Dữ liệu không hợp lệ!",
    });
  }
};
