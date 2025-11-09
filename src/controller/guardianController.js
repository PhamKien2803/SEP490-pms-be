const Guardian = require("../models/guardianModel");
const { HTTP_STATUS } = require("../constants/useConstants");
const mongoose = require("mongoose");

// 🟢 Tạo người giám hộ mới
exports.createGuardian = async (req, res) => {
  try {
    const {
      fullName,
      dob,
      phoneNumber,
      studentId,
      parentId,
      relationship,
      relationshipDetail,
      pickUpDate,
      note,
      createdBy,
    } = req.body;

    if (!fullName || !dob || !phoneNumber || !studentId || !pickUpDate) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: "Thiếu thông tin bắt buộc (fullName, dob, phoneNumber, studentId, pickUpDate).",
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const pickUp = new Date(pickUpDate);
    pickUp.setHours(0, 0, 0, 0);

    if (pickUp < today) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: "Ngày đón hộ không được ở trong quá khứ.",
      });
    }

    const existingGuardian = await Guardian.findOne({
      studentId,
      pickUpDate: pickUp,
      active: true,
    });

    if (existingGuardian) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: "Đã có người giám hộ cho học sinh này trong ngày đó.",
      });
    }

    const guardian = new Guardian({
      fullName,
      dob,
      phoneNumber,
      studentId,
      parentId,
      relationship,
      relationshipDetail,
      pickUpDate: pickUp,
      note,
      createdBy,
      active: true,
    });

    await guardian.save();

    return res.status(HTTP_STATUS.CREATED).json({
      message: "Tạo người giám hộ thành công.",
      data: guardian,
    });
  } catch (error) {
    console.error("❌ Lỗi khi tạo người giám hộ:", error);
    return res.status(HTTP_STATUS.SERVER_ERROR).json({
      message: "Lỗi server.",
      error: error.message,
    });
  }
};

exports.updateGuardian = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const guardian = await Guardian.findById(id);
    if (!guardian) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: "Không tìm thấy người giám hộ.",
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newPickUpDate = updateData.pickUpDate
      ? new Date(updateData.pickUpDate)
      : new Date(guardian.pickUpDate);

    newPickUpDate.setHours(0, 0, 0, 0);

    if (newPickUpDate < today) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: "Không thể đặt ngày đón hộ trong quá khứ.",
      });
    }

    const duplicate = await Guardian.findOne({
      _id: { $ne: id },
      studentId: guardian.studentId,
      pickUpDate: newPickUpDate,
      active: true,
    });

    if (duplicate) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: "Đã có người giám hộ khác cho học sinh này trong ngày đó.",
      });
    }

    Object.assign(guardian, updateData);
    guardian.pickUpDate = newPickUpDate;
    await guardian.save();

    return res.status(HTTP_STATUS.OK).json({
      message: "Cập nhật người giám hộ thành công.",
      data: guardian,
    });
  } catch (error) {
    console.error("❌ Lỗi khi cập nhật người giám hộ:", error);
    return res.status(HTTP_STATUS.SERVER_ERROR).json({
      message: "Lỗi server.",
      error: error.message,
    });
  }
};

exports.getGuardianById = async (req, res) => {
  try {
    const { id } = req.params;
    const guardian = await Guardian.findById(id)
      .populate("studentId", "fullName className")
      .populate("parentId", "fullName phoneNumber");

    if (!guardian) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: "Không tìm thấy người giám hộ.",
      });
    }

    return res.status(HTTP_STATUS.OK).json({
      message: "Lấy thông tin người giám hộ thành công.",
      data: guardian,
    });
  } catch (error) {
    console.error("❌ Lỗi khi lấy người giám hộ theo ID:", error);
    return res.status(HTTP_STATUS.SERVER_ERROR).json({
      message: "Lỗi server.",
      error: error.message,
    });
  }
};

exports.getGuardiansByStudentId = async (req, res) => {
  try {
    const { id } = req.params;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const guardians = await Guardian.find({
      studentId: id,
      active: true,
    })
      .populate("parentId", "fullName phoneNumber")
      .sort({ pickUpDate: 1 });

    await Guardian.updateMany(
      { pickUpDate: { $lt: today }, active: true },
      { $set: { active: false } }
    );

    return res.status(HTTP_STATUS.OK).json({
      message: "Lấy danh sách người giám hộ còn hiệu lực thành công.",
      count: guardians.length,
      data: guardians,
    });
  } catch (error) {
    console.error("❌ Lỗi khi lấy danh sách người giám hộ:", error);
    return res.status(HTTP_STATUS.SERVER_ERROR).json({
      message: "Lỗi server.",
      error: error.message,
    });
  }
};

exports.getGuardiansByParentId = async (req, res) => {
  try {
    const { id } = req.params;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const guardians = await Guardian.find({
      parentId: id,
      active: true,
    })
      .populate("parentId", "fullName phoneNumber")
      .sort({ pickUpDate: 1 });

    await Guardian.updateMany(
      { pickUpDate: { $lt: today }, active: true },
      { $set: { active: false } }
    );

    return res.status(HTTP_STATUS.OK).json({
      message: "Lấy danh sách người giám hộ còn hiệu lực thành công.",
      count: guardians.length,
      data: guardians,
    });
  } catch (error) {
    console.error("❌ Lỗi khi lấy danh sách người giám hộ:", error);
    return res.status(HTTP_STATUS.SERVER_ERROR).json({
      message: "Lỗi server.",
      error: error.message,
    });
  }
};

exports.deleteGuardian = async (req, res) => {
  try {
    const { id } = req.params;
    const guardian = await Guardian.findById(id);

    if (!guardian) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: "Không tìm thấy người giám hộ.",
      });
    }

    guardian.active = false;
    await guardian.save();

    return res.status(HTTP_STATUS.OK).json({
      message: "Hủy kích hoạt người giám hộ thành công.",
    });
  } catch (error) {
    console.error("❌ Lỗi khi xóa người giám hộ:", error);
    return res.status(HTTP_STATUS.SERVER_ERROR).json({
      message: "Lỗi server.",
      error: error.message,
    });
  }
};
