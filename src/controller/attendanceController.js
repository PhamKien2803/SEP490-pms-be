const Attendance = require('../models/attendanceModel');
const { HTTP_STATUS } = require('../constants/useConstants');

exports.getAttendanceByClassAndDate = async (req, res) => {
  try {
    const { classId, date } = req.params;
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
        path: "takenBy",
        select: "fullName staffCode email"
      })
      .populate({
        path: "students.student",
        select: "studentCode fullName gender classGroup dob address"
      })
      .select("class schoolYear date students takenBy generalNote takenAt");

    if (!attendanceRecord) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: "Không tìm thấy bản ghi điểm danh cho lớp và ngày đã chỉ định"
      });
    }
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
    // get and populate student, takenBy, schoolYear, class fields
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
    // get and populate student, takenBy, schoolYear, class fields, get 2 3 fields
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
        select: "studentCode fullName gender classGroup dob address"
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