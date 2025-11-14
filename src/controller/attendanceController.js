const Attendance = require('../models/attendanceModel');
const Class = require("../models/classModel");
const Student = require("../models/studentModel");
const Parent = require("../models/parentModel");
const Staff = require("../models/staffModel");
const SMTP = require("../helpers/stmpHelper");
const { SMTP_CONFIG } = require("../constants/mailConstants");
const path = require("path");
const ejs = require("ejs");
const { HTTP_STATUS, RESPONSE_MESSAGE } = require("../constants/useConstants");
const mongoose = require("mongoose");

exports.getAttendanceByClassAndDate = async (req, res) => {
  try {
    const { classId, date } = req.params;
    const attendanceRecord1 = await Attendance.findOne({ class: classId, date: new Date(date) })
    console.log("🚀 ~ attendanceRecord1:", attendanceRecord1)
    const attendanceRecord = await Attendance.findOne({ class: classId, date: new Date(date) })
      .populate({
        path: "class",
        select: "classCode className"
      })
      .populate({
        path: "schoolYear",
        select: "schoolyearCode schoolYear"
      })
      .populate({
        path: "students.guardian",
        select: "fullName dob phoneNumber relationship pickUpDate"
      })
      .populate({
        path: "takenBy",
        select: "fullName staffCode email"
      })
      .populate({
        path: "students.student",
        select: "studentCode fullName gender classGroup dob address"
      })
      .select("class schoolYear date students takenBy generalNote takenAt");

    return res.status(HTTP_STATUS.OK).json(attendanceRecord);
  } catch (error) {
    console.error("Error in getAttendanceByClassAndDate:", error);
    return res.status(HTTP_STATUS.SERVER_ERROR).json({
      message: "Server error occurred while fetching attendance record.",
      error
    });
  }
};

exports.getAttendanceByClassAndSchoolYear = async (req, res) => {
  try {
    const { classId, schoolYearId } = req.params;

    if (!classId || !schoolYearId) {
      return res.status(400).json({ message: "Thiếu classId hoặc schoolYearId." });
    }

    const attendanceRecords = await Attendance.find({
      class: classId,
      schoolYear: schoolYearId,
    })
      .populate({
        path: "class",
        select: "classCode className",
      })
      .populate({
        path: "schoolYear",
        select: "schoolyearCode schoolYear",
      })
      .populate({
        path: "takenBy",
        select: "fullName staffCode email",
      })
      .populate({
        path: "students.guardian",
        select: "fullName dob phoneNumber relationship pickUpDate"
      })
      .populate({
        path: "students.student",
        select: "studentCode fullName gender classGroup dob address",
      })
      .select("class schoolYear date students takenBy generalNote takenAt")
      .lean();

    if (!attendanceRecords?.length) {
      return res.status(200).json([]);
    }

    return res.status(HTTP_STATUS.OK).json(attendanceRecords);
  } catch (error) {
    console.error("❌ Error in getAttendanceByClassAndSchoolYear:", error);
    return res.status(HTTP_STATUS.SERVER_ERROR).json({
      message: "Lỗi server xảy ra khi lấy bản ghi điểm danh.",
      error: error.message,
    });
  }
};


exports.getAttendanceBySchoolYearAndTeacher = async (req, res) => {
  try {
    const { teacherId, schoolYearId } = req.params;
    const attendanceRecords = await Attendance.find
      ({ class: classId, schoolYear: schoolYearId })
      .populate({
        path: "class",
        select: "classCode className"
      })
      .populate({
        path: "schoolYear",
        select: "schoolyearCode schoolYear"
      })
      .populate({
        path: "takenBy",
        select: "fullName staffCode email"
      })
      .populate({
        path: "students.student",
        select: "studentCode fullName gender classGroup dob address"
      })
      .select("class schoolYear date students takenBy generalNote takenAt");


    if (attendanceRecords.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: "Không tìm thấy bản ghi điểm danh nào cho lớp và năm học đã chỉ định."
      });
    }
    return res.status(HTTP_STATUS.OK).json(attendanceRecords);
  } catch (error) {
    console.error("Error in getAttendanceByClassAndSchoolYear:", error);
    return res.status(HTTP_STATUS.SERVER_ERROR).json({
      message: "Lỗi server xảy ra khi lấy bản ghi điểm danh.",
      error
    });
  }
};

exports.getAllAttendance = async (req, res) => {
  try {
    const attendanceRecords = await Attendance.find()
      .populate({
        path: "class",
        select: "classCode className"
      })
      .populate({
        path: "schoolYear",
        select: "schoolyearCode schoolYear"
      })
      .populate({
        path: "takenBy",
        select: "fullName staffCode email"
      })
      .populate({
        path: "students.student",
        select: "studentCode fullName gender classGroup dob address"
      })
      .select("class schoolYear date students takenBy generalNote takenAt");

    if (attendanceRecords.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: "Không tìm thấy bản ghi điểm danh nào."
      });
    }

    return res.status(HTTP_STATUS.OK).json(attendanceRecords);
  } catch (error) {
    console.error("Error in getAllAttendance:", error);
    return res.status(HTTP_STATUS.SERVER_ERROR).json({
      message: "Lỗi server xảy ra khi lấy bản ghi điểm danh.",
      error
    });
  }
};

exports.getAttendanceByStudentAndSchoolYear = async (req, res) => {
  try {
    const { studentId, schoolYearId } = req.params;
    const attendanceRecords = await Attendance.find({
      "students.student": studentId,
      schoolYear: schoolYearId
    });
    if (attendanceRecords.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: "Không tìm thấy bản ghi điểm danh nào cho học sinh và năm học đã chỉ định."
      });
    }
    return res.status(HTTP_STATUS.OK).json(attendanceRecords);
  } catch (error) {
    console.error("Error in getAttendanceByStudentAndSchoolYear:", error);
    return res.status(HTTP_STATUS.SERVER_ERROR).json({
      message: "Lỗi server xảy ra khi lấy bản ghi điểm danh.",
      error
    });
  }
};

exports.getByIdController = async (req, res) => {
  try {
    const { id } = req.params;
    const attendanceRecord = await Attendance.findById(id)
      .populate({
        path: "class",
        select: "classCode className"
      })
      .populate({
        path: "schoolYear",
        select: "schoolyearCode schoolYear"
      })
      .populate({
        path: "takenBy",
        select: "fullName staffCode email"
      })
      .populate({
        path: "students.student",
        select: "studentCode fullName gender classGroup dob address imageStudent"
      })
      .populate({
        path: "students.guardian",
        select: "fullName dob phoneNumber relationship pickUpDate"
      })
      .select("class schoolYear date students takenBy generalNote takenAt");
    ;
    if (!attendanceRecord) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: "Không tìm thấy bản ghi điểm danh với ID đã chỉ định."
      });
    }
    return res.status(HTTP_STATUS.OK).json(attendanceRecord);
  } catch (error) {
    console.error("Error in getByIdController:", error);
    return res.status(HTTP_STATUS.SERVER_ERROR).json({
      message: "Lỗi server xảy ra khi lấy bản ghi điểm danh.",
      error
    });
  }
};

exports.updateAttendanceController = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const attendance = await Attendance.findById(id)
      .populate({
        path: "students.student",
        select: "studentCode fullName"
      })
      .populate({
        path: "class",
        select: "className"
      })
      .populate({
        path: "takenBy",
        select: "fullName"
      });

    if (!attendance) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(RESPONSE_MESSAGE.NOT_FOUND);
    }

    const now = new Date();
    const diffHours = (now - new Date(attendance.date)) / (1000 * 60 * 60);
    if (diffHours >= 24) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: "Không thể chỉnh sửa điểm danh sau 1 ngày.",
      });
    }

    Object.assign(attendance, updateData);
    await attendance.save();

    await attendance.populate([
      { path: "students.student", select: "studentCode fullName" },
      { path: "class", select: "className" },
      { path: "takenBy", select: "fullName" },
    ]);

    const absentStudents =
      (attendance && Array.isArray(attendance.students))
        ? attendance.students.filter(item => item.status === "Vắng mặt")
        : [];

    if (absentStudents.length > 0) {
      setImmediate(async () => {
        try {
          const templatePath = path.join(
            __dirname,
            "..",
            "templates",
            "absentNoticeMail.ejs"
          );
          const mail = new SMTP(SMTP_CONFIG);

          for (const item of absentStudents) {
            const studentId = item.student;
            const parent = await Parent.findOne({
              students: new mongoose.Types.ObjectId(studentId),
              active: true,
            });
            const student = await Student.findById(studentId);
            const staff = await Staff.findById(attendance.takenBy._id);

            if (!parent || !parent.email) continue;

            const html = await ejs.renderFile(templatePath, {
              parentName: parent.fullName || "",
              studentName: student.fullName || "",
              className: attendance.class?.className || "Không xác định",
              date: attendance.date.toLocaleDateString("vi-VN"),
              reason: "Vắng mặt hôm nay",
              absentDate: attendance.date.toLocaleDateString("vi-VN"),
              teacherName: staff.fullName || "",
              portalLink: "http://school-portal.example.com/login",
            });

            await mail.send(
              parent.email,
              `Thông báo vắng mặt của học sinh ${student.fullName || ""} - lớp ${attendance.class?.className || ""}`,
              "",
              html,
              "",
              () => {
                console.log(`✅ Đã gửi email đến phụ huynh ${parent.fullName}`);
              }
            );
          }
        } catch (mailErr) {
          console.error("❌ Lỗi khi gửi mail thông báo vắng mặt:", mailErr);
        }
      });
    }

    return res.status(HTTP_STATUS.UPDATED).json({
      message: "Cập nhật điểm danh thành công.",
      data: attendance,
    });
  } catch (error) {
    console.error("❌ Lỗi updateAttendanceController:", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(", ") });
    }

    res.status(HTTP_STATUS.SERVER_ERROR).json({
      message: "Lỗi khi cập nhật điểm danh.",
      error: error.message,
    });
  }
};

exports.getAttendanceByStudentAndDate = async (req, res) => {
  try {
    const { studentId, date } = req.query;

    if (!studentId || !date) {
      return res.status(400).json({
        success: false,
        message: "Cần phải đưa vào học sinh và ngày để tìm kiếm",
      });
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const attendance = await Attendance.findOne({
      date: { $gte: startOfDay, $lte: endOfDay },
      "students.student": studentId,
      active: true,
    })
      .populate({
        path: "class",
        select: "classCode className",
      })
      .populate({
        path: "schoolYear",
        select: "schoolyearCode schoolYear",
      })
      .populate({
        path: "takenBy",
        select: "teacherCode fullName phoneNumber",
      })
      .populate({
        path: "students.student",
        select: "studentCode fullName gender",
      })
      .populate({
        path: "students.guardian",
        select: "fullName dob phoneNumber relationship pickUpDate"
      })
      .lean();

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy điểm danh cho học sinh trong ngày này",
      });
    }

    const studentAttendance = attendance.students.find(
      (s) => s.student && s.student._id.toString() === studentId
    );

    if (!studentAttendance) {
      return res.status(200).json([]);
    }

    return res.status(200).json({
      success: true,
      class: attendance.class,
      schoolYear: attendance.schoolYear,
      teacher: attendance.takenBy,
      date: attendance.date,
      generalNote: attendance.generalNote,
      student: {
        ...studentAttendance,
        student: studentAttendance.student,
      },
    });

  } catch (error) {
    console.error("❌ Lỗi getAttendanceByStudentAndDate:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};