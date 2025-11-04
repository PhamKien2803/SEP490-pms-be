const Guardian = require("../models/guardianModel");
const { HTTP_STATUS } = require("../constants/useConstants");
const mongoose = require("mongoose");

exports.createGuardian = async (req, res) => {
  try {
    const {
      fullName,
      dob,
      phoneNumber,
      studentId,
      parentId,
      relationship,
      delegationPeriod,
      note,
      createdBy,
    } = req.body;

    if (!fullName || !dob || !phoneNumber || !studentId || !delegationPeriod) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: "Thiếu thông tin bắt buộc (fullName, dob, phoneNumber, studentId, delegationPeriod)",
      });
    }

    const fromDate = new Date(delegationPeriod.fromDate);
    const toDate = new Date(delegationPeriod.toDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeGuardiansCount = await Guardian.countDocuments({
      studentId,
      "delegationPeriod.toDate": { $gte: today },
    });

    if (activeGuardiansCount >= 3) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: "Mỗi học sinh chỉ được có tối đa 3 người đón hộ còn hiệu lực.",
      });
    }

    const duplicateGuardian = await Guardian.findOne({
      studentId,
      fullName: { $regex: new RegExp(`^${fullName}$`, "i") }, // không phân biệt hoa thường
      dob: new Date(dob),
      phoneNumber,
      $or: [
        {
          "delegationPeriod.fromDate": { $lte: toDate },
          "delegationPeriod.toDate": { $gte: fromDate },
        },
      ],
    });

    if (duplicateGuardian) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: "Người đón hộ trùng lặp (Họ tên, Ngày sinh, SĐT, và thời gian ủy quyền).",
      });
    }

    const isExpired = toDate < today;

    const guardian = new Guardian({
      fullName,
      dob,
      phoneNumber,
      studentId,
      parentId,
      relationship,
      delegationPeriod: { fromDate, toDate },
      note,
      createdBy,
      status: isExpired ? "Hết hạn" : "Còn hiệu lực",
    });

    await guardian.save();

    return res.status(HTTP_STATUS.CREATED).json({
      message: "Tạo người đón hộ thành công.",
      data: guardian,
    });
  } catch (error) {
    console.error("❌ Lỗi khi tạo người đón hộ:", error);
    return res.status(HTTP_STATUS.SERVER_ERROR).json({
      message: "Lỗi server",
      error: error.message,
    });
  }
};

exports.updateGuardian = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const guardian = await Guardian.findById(id);
    if (!guardian) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy người đón hộ" });
    }

    if (guardian.delegationPeriod.toDate < today) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: "Không thể chỉnh sửa người đón hộ đã hết hạn.",
      });
    }

    Object.assign(guardian, updateData);
    await guardian.save();

    return res.status(HTTP_STATUS.OK).json({
      message: "Cập nhật người đón hộ thành công",
      data: guardian,
    });
  } catch (error) {
    console.error("❌ Lỗi khi cập nhật người đón hộ:", error);
    return res.status(HTTP_STATUS.SERVER_ERROR).json({
      message: "Lỗi server",
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
        message: "Không tìm thấy người đón hộ",
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (guardian.delegationPeriod.toDate < today && guardian.active) {
      guardian.active = false;
      guardian.status = "Hết hạn";
      await guardian.save();
    }

    return res.status(HTTP_STATUS.OK).json({
      message: "Lấy thông tin người đón hộ thành công",
      data: guardian,
    });
  } catch (error) {
    console.error("❌ Lỗi khi lấy người đón hộ theo ID:", error);
    return res.status(HTTP_STATUS.SERVER_ERROR).json({
      message: "Lỗi server",
      error: error.message,
    });
  }
};

exports.getGuardiansByStudentId = async (req, res) => {
  try {
    const { id } = req.params;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    console.log("🚀 ~ today:", today)
    console.log(today.toISOString());
    await Guardian.updateMany(
      {
        "delegationPeriod.toDate": { $lt: today },
        active: true,
      },
      { $set: { active: false, status: "Hết hạn" } }
    );

    const guardians = await Guardian.find({
      studentId: id,
      active: true,
      "delegationPeriod.toDate": { $gte: today },
    })
      .populate("parentId", "fullName phoneNumber")
      .sort({ "delegationPeriod.fromDate": 1 });

    return res.status(HTTP_STATUS.OK).json({
      message: "Lấy danh sách người đón hộ hiệu lực thành công",
      count: guardians.length,
      data: guardians,
    });
  } catch (error) {
    console.error("❌ Lỗi khi lấy danh sách người đón hộ theo học sinh:", error);
    return res.status(HTTP_STATUS.SERVER_ERROR).json({
      message: "Lỗi server",
      error: error.message,
    });
  }
};

exports.getGuardiansByParentId = async (req, res) => {
  try {
    const { id } = req.params;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log("🚀 ~ today:", today)
    console.log(today.toISOString());
    const guardians = await Guardian.find({
      parentId: id,
      active: true,
      "delegationPeriod.toDate": { $gte: today },
    })
      .populate("studentId", "fullName classId")
      .sort({ "delegationPeriod.toDate": 1 });

    return res.status(HTTP_STATUS.OK).json({
      message: "Lấy danh sách người đón hộ hiệu lực thành công",
      count: guardians.length,
      data: guardians,
    });
  } catch (error) {
    console.error("❌ Lỗi khi lấy danh sách người đón hộ theo parentId:", error);
    return res.status(HTTP_STATUS.SERVER_ERROR).json({
      message: "Lỗi server",
      error: error.message,
    });
  }
};
