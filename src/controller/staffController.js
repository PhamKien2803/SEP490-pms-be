
const { Model } = require("mongoose");
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const i18n = require("../middlewares/i18n.middelware");
const { IMAP_CONFIG, SMTP_CONFIG } = require('../constants/mailConstants');
const Staff = require("../models/staffModel");
const User = require("../models/userModel");
const Class = require("../models/classModel");
const Student = require("../models/studentModel");
const SchoolYear = require("../models/schoolYearModel");
const Role = require('../models/roleModel');
const { sequencePattern } = require('../helpers/useHelpers');
const { SEQUENCE_CODE } = require('../constants/useConstants');
const SMTP = require('../helpers/stmpHelper');
const IMAP = require('../helpers/iMapHelper');
const { getGFS } = require("../configs/gridfs");
const { HTTP_STATUS, RESPONSE_MESSAGE, USER_ROLES, VALIDATION_CONSTANTS } = require('../constants/useConstants');
const Guardian = require("../models/guardianModel");
const bcrypt = require("bcryptjs");

exports.createStaffController = async (req, res) => {
  const session = await Staff.startSession();
  session.startTransaction();

  try {
    const { email, createBy, address } = req.body;
    const modelName = Staff.modelName.toLowerCase();
    if (address) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Địa chỉ thường trú là bắt buộc" });
    }

    const sequence = await sequencePattern(Staff.modelName);
    const lastRecord = await Staff.find({
      [`${modelName}Code`]: { $regex: `^${sequence}` }
    })
      .sort({ [`${modelName}Code`]: -1 })
      .limit(1);

    let sequenceCode;
    if (lastRecord.length === 0) {
      sequenceCode = `${sequence}001`;
    } else {
      const lastCode = lastRecord[0][`${modelName}Code`];
      const lastNumber = parseInt(lastCode.slice(-3));
      const nextNumber = (lastNumber + 1).toString().padStart(3, "0");
      sequenceCode = `${sequence}${nextNumber}`;
    }

    const newData = {
      active: true,
      [`${modelName}Code`]: sequenceCode,
      ...req.body,
    };

    const uniqueFields = Object.keys(Staff.schema.paths).filter(
      (key) => Staff.schema.paths[key].options.unique
    );

    for (const field of uniqueFields) {
      if (!newData[field]) continue;

      const exists = await Staff.findOne({ [field]: newData[field] });
      if (exists) {
        await session.abortTransaction();
        session.endSession();

        const fieldLabel = i18n.t(`fields.${field}`);
        const message = i18n.t("messages.alreadyExists", { field: fieldLabel });

        return res.status(400).json({ message });
      }
    }

    const checkDataMail = await User.findOne({
      active: { $eq: true },
      email: email
    })
    if (checkDataMail) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Email không hợp lệ" });
    }
    const staffSaved = await Staff.create([newData], { session });


    let userSaved;
    if (staffSaved[0].isTeacher) {
      const dataRole = await Role.findOne({
        active: { $eq: true },
        roleName: "Giáo Viên"
      })
      if (!dataRole) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Vai trò giáo viên không tồn tại" });
      }
      userSaved = await User.create(
        [
          {
            email,
            password: "12345678",
            staff: staffSaved[0]._id,
            roleList: [dataRole._id],
            createBy,
            active: true,
          },
        ],
        { session }
      );
    } else {
      userSaved = await User.create(
        [
          {
            email,
            password: "12345678",
            staff: staffSaved[0]._id,
            createBy,
            active: true,
          },
        ],
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    res.status(HTTP_STATUS.CREATED).json(RESPONSE_MESSAGE.CREATED);

    setImmediate(async () => {
      const templatePath = path.join(__dirname, '..', 'templates', 'newAccountMail.ejs');

      const htmlConfirm = await ejs.renderFile(templatePath, {
        fullName: staffSaved[0].fullName,
        username: userSaved[0].email,
        password: "12345678"
      });

      const mail = new SMTP(SMTP_CONFIG);
      mail.send(
        email,
        '',
        `THÔNG TIN TÀI KHOẢN SỬ DỤNG HỆ THỐNG`,
        htmlConfirm,
        '',
        () => {
          console.log(`Mail gửi thành công đến email : ${email}`);
        }
      );

    });
  } catch (error) {

    if (error.name === "ValidationError") {
      const firstErrorKey = Object.keys(error.errors)[0];
      const message = error.errors[firstErrorKey].message;

      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message });
    }

    if (error.code === 11000) {
      const duplicatedField = Object.keys(error.keyValue)[0];
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: `${duplicatedField} đã tồn tại trong hệ thống`
      });
    }

    await session.abortTransaction();
    session.endSession();

    console.error("Error createStaffController:", error);
    return res.status(HTTP_STATUS.SERVER_ERROR).json({ message: "Lỗi server", error });
  }
};

exports.getDetailStaffController = async (req, res) => {
  try {
    const data = await Staff.findById(req.params.id);
    if (!data) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Nhân viên không tồn tại" });
    }
    return res.status(HTTP_STATUS.OK).json(data);
  } catch (error) {
    console.log("Error getDetailStaffController", error);
    return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
  }
}

exports.deleteStaff = async (req, res) => {
  try {
    const dataStaff = await Staff.findById(req.params.id);
    if (!dataStaff) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Nhân viên không tồn tại" });
    }

    dataStaff.active = false;
    await dataStaff.save();

    await User.updateMany(
      { staff: dataStaff._id },
      { $set: { active: false } }
    );

    return res.status(HTTP_STATUS.OK).json(RESPONSE_MESSAGE.DELETED);
  } catch (error) {
    console.error("Error deleteStaffController", error);
    return res.status(HTTP_STATUS.SERVER_ERROR).json({ message: "Lỗi server", error });
  }
};

exports.getClassAndStudentByTeacherController = async (req, res) => {
  try {
    const teacherId = req.params.id;
    const schoolYearId = req.query.schoolYearId;

    const teacher = await Staff.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: "Nhân viên không tồn tại." });
    }
    if (!teacher.isTeacher) {
      return res.status(400).json({ message: "Nhân viên này không phải giáo viên." });
    }

    const activeSchoolYear = await SchoolYear.findOne({
      _id: schoolYearId,
      active: true,
    });

    if (!activeSchoolYear) {
      return res.status(404).json({ message: "Không có năm học nào đang hoạt động." });
    }

    const classes = await Class.find({
      teachers: teacherId,
      schoolYear: activeSchoolYear._id,
      active: true,
    })
      .populate({
        path: "students",
        select: "studentCode fullName gender dob address parent healthCertId birthCertId imageStudent",
      })

      .populate("room", "roomName facilities")
      .populate("schoolYear", "schoolYear state")
      .lean();

    if (!classes.length) {
      return res.status(200).json({
        message: `Giáo viên này chưa được phân công lớp trong năm học ${activeSchoolYear.schoolYear}.`,
        classes: [],
      });
    }

    const gfs = getGFS();
    if (!gfs) {
      return res.status(500).json({ message: "GridFS chưa kết nối." });
    }

    const now = new Date();
    const localMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfDay = new Date(localMidnight.getTime() + 24 * 60 * 60 * 1000);
    // const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);
    console.log(localMidnight, startOfDay);

    const studentIds = classes.flatMap(c => c.students?.map(s => s._id) || []);

    const guardians = await Guardian.find({
      studentId: { $in: studentIds },
      pickUpDate: { $gte: localMidnight, $lte: startOfDay },
      active: true,
    })
      .populate("parentId", "fullName phoneNumber")
      .lean();
    console.log(guardians);
    const guardianMap = guardians.reduce((acc, g) => {
      acc[g.studentId.toString()] = g;
      return acc;
    }, {});
    console.log(guardianMap);

    await Promise.all(
      classes.map(async classItem => {
        if (!classItem.students?.length) return;

        await Promise.all(
          classItem.students.map(async student => {
            const [healthFiles, birthFiles] = await Promise.all([
              student.healthCertId ? gfs.find({ _id: student.healthCertId }).toArray() : [],
              student.birthCertId ? gfs.find({ _id: student.birthCertId }).toArray() : [],
            ]);

            student.healthCertFile = healthFiles[0] || null;
            student.birthCertFile = birthFiles[0] || null;
            student.guardianToday = guardianMap[student._id.toString()] || null;
          })
        );
      })
    );

    return res.status(200).json({
      teacher: {
        _id: teacher._id,
        fullName: teacher.fullName,
        email: teacher.email,
      },
      schoolYear: {
        _id: activeSchoolYear._id,
        schoolYear: activeSchoolYear.schoolYear,
        startDate: activeSchoolYear.startDate,
        endDate: activeSchoolYear.endDate,
      },
      classes,
    });
  } catch (error) {
    console.error("Error getClassAndStudentByTeacherController:", error);
    return res.status(500).json({
      message: "Lỗi khi lấy danh sách lớp và học sinh.",
      error: error.message,
    });
  }
};


exports.getByIdStudentController = async (req, res) => {
  try {
    const studentId = req.params.id;
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: "Học sinh không tồn tại.",
      });
    }

    const gfs = getGFS();
    if (!gfs) {
      return res.status(HTTP_STATUS.SERVER_ERROR).json({
        message: "GridFS chưa kết nối.",
      });
    }

    const idsToFetch = [];
    if (student.healthCertId) idsToFetch.push(student.healthCertId);
    if (student.birthCertId) idsToFetch.push(student.birthCertId);

    let fileMap = new Map();
    if (idsToFetch.length > 0) {
      const files = await gfs.find({ _id: { $in: idsToFetch } }).toArray();
      fileMap = new Map(files.map((f) => [f._id.toString(), f]));
    }
    const studentData = student.toObject();
    studentData.healthCertFile = student.healthCertId
      ? fileMap.get(student.healthCertId.toString()) || null
      : null;
    studentData.birthCertFile = student.birthCertId
      ? fileMap.get(student.birthCertId.toString()) || null
      : null;

    studentData.imageStudent = student.imageStudent || null;

    return res.status(HTTP_STATUS.OK).json(studentData);
  } catch (error) {
    console.error("Error getByIdStudent:", error);
    return res.status(HTTP_STATUS.SERVER_ERROR).json({
      message: "Lỗi khi lấy thông tin học sinh.",
      error: error.message,
    });
  }
};

exports.getInforTeacher = async (req, res) => {
  try {
    const { staffId } = req.params;

    if (!staffId) {
      return res.status(400).json({ message: "Missing staffId" });
    }

    const staff = await Staff.findById(staffId);

    if (!staff) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    return res.status(200).json({
      success: true,
      data: staff,
    });
  } catch (error) {
    console.error("getInforTeacher Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.changePasswordTeacher = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        message: "Mật khẩu mới hoặc mật khẩu cũ không hợp lệ!",
      });
    }

    const user = await User.findOne({ staff: staffId });

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng!" });
    }

    // Kiểm tra mật khẩu cũ
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Mật khẩu cũ không hợp lệ!" });
    }

    // Cập nhật mật khẩu mới
    user.password = newPassword;
    await user.save(); // sẽ tự hash thanks to pre("save")

    return res.status(200).json({
      success: true,
      message: "Đổi mật khẩu thành công!",
    });
  } catch (error) {
    console.error("changePasswordTeacher Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateInforTeacher = async (req, res) => {
  try {
    const { staffId } = req.params;

    if (!staffId) {
      return res.status(400).json({ message: "Missing staffId" });
    }

    const updateData = req.body;

    const updatedStaff = await Staff.findByIdAndUpdate(
      staffId,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedStaff) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Teacher information updated successfully",
      data: updatedStaff,
    });
  } catch (error) {
    console.error("updateInforTeacher Error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Invalid data",
    });
  }
};