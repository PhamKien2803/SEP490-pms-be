const { HTTP_STATUS } = require('../constants/useConstants');
const Feedback = require('../models/feedbackModel');
const Staff = require('../models/staffModel');
const SchoolYear = require('../models/schoolYearModel');
const Teacher = require('../models/staffModel');
const Class = require('../models/classModel');
const { getGFS } = require("../configs/gridfs");
const mongoose = require("mongoose");

exports.createMultipleFeedbacks = async (req, res) => {
  try {
    const { students, classId, teacherId, date, reminders, teacherNote,
      dailyHighlight, health, social, learning, hygiene, sleeping, eating
    } = req.body;

    if (!students?.length || !classId || !teacherId) {
      return res.status(400).json({
        message: "Thiếu students, classId hoặc teacherId",
      });
    }

    const targetDate = new Date(date || new Date());
    targetDate.setHours(0, 0, 0, 0);

    const existingFeedbacks = await Feedback.find({
      studentId: { $in: students },
      classId,
      teacherId,
      date: {
        $gte: targetDate,
        $lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000),
      },
    }).select("studentId");

    const existingStudentIds = existingFeedbacks.map((f) =>
      f.studentId.toString()
    );

    const newStudents = students.filter(
      (id) => !existingStudentIds.includes(id)
    );

    if (newStudents.length === 0) {
      return res.status(400).json({
        message: "Tất cả học sinh đã có feedback trong ngày này.",
      });
    }

    const feedbacks = newStudents.map((studentId) => ({
      studentId,
      classId,
      teacherId,
      date: targetDate,
      reminders: reminders || [],
      teacherNote: teacherNote || "",
      dailyHighlight: dailyHighlight || "",
      health: health || {},
      social: social || {},
      learning: learning || {},
      hygiene: hygiene || {},
      sleeping: sleeping || {},
      eating: eating || {},
    }));

    const result = await Feedback.insertMany(feedbacks);

    return res.status(201).json({
      message: `Đã tạo ${result.length} bản ghi feedback mới. ${existingStudentIds.length
        ? `${existingStudentIds.length} học sinh đã có feedback trước đó.`
        : ""
        }`,
      alreadyExisted: existingStudentIds,
      newCreated: result.map((f) => f.studentId),
      data: result,
    });
  } catch (error) {
    console.error("Lỗi khi tạo nhiều feedback:", error);
    return res
      .status(500)
      .json({ message: "Lỗi server", error: error.message });
  }
};

exports.getFeedbacksByClassAndDate = async (req, res) => {
  try {
    const { classId, date } = req.query;
    if (!classId || !date) {
      return res.status(400).json({
        message: "Thiếu classId hoặc date",
      });
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);

    const feedbacks = await Feedback.find({
      classId,
      date: { $gte: targetDate, $lt: nextDay },
    })
      .populate({
        path: "studentId",
        select: "studentCode fullName dob gender address healthCertId",
      })
      .populate({
        path: "classId",
        select: "classCode className",
      })
      .lean();

    const gfs = getGFS();
    if (!gfs) {
      return res.status(500).json({ message: "GridFS chưa kết nối." });
    }

    const healthCertIds = feedbacks
      .map((fb) => fb.studentId?.healthCertId)
      .filter(Boolean);

    const uniqueHealthCertIds = [...new Set(healthCertIds.map((id) => id.toString()))];

    let healthFiles = [];
    if (uniqueHealthCertIds.length > 0) {
      healthFiles = await gfs.find({ _id: { $in: uniqueHealthCertIds } }).toArray();
    }

    const fileMap = new Map(healthFiles.map((f) => [f._id.toString(), f]));

    for (const fb of feedbacks) {
      const student = fb.studentId;
      if (student && student.healthCertId) {
        student.healthCertFile = fileMap.get(student.healthCertId.toString()) || null;
      }
    }

    return res.status(200).json(feedbacks);
  } catch (error) {
    console.error("Lỗi khi lấy feedback theo lớp và ngày:", error);
    return res
      .status(500)
      .json({ message: "Lỗi server", error: error.message });
  }
};


exports.getByIdFeedbackController = async (req, res) => {
  try {
    const data = await Feedback.findById(req.params.id)
      .populate({
        path: "studentId",
        select: "studentCode fullName dob gender address healthCertId",
      })
      .populate({
        path: "classId",
        select: "classCode className",
      })
      .lean();

    if (!data) {
      return res.status(404).json({ message: "Không tìm thấy feedback" });
    }
    const student = data.studentId;
    if (!student?.healthCertId) {
      return res.status(200).json(data);
    }
    const gfs = getGFS();
    if (!gfs) {
      return res.status(500).json({ message: "GridFS chưa kết nối." });
    }

    const files = await gfs.find({ _id: student.healthCertId }).toArray();
    student.healthCertFile = files.length > 0 ? files[0] : null;

    return res.status(200).json(data);
  } catch (error) {
    console.error("error getByIdFeedbackController:", error);
    return res.status(500).json({
      message: "Lỗi máy chủ khi lấy thông tin feedback",
      error: error.message,
    });
  }
};


exports.getClassAndStudentByTeacherController = async (req, res) => {
  try {
    const teacherId = req.params.id;
    const schoolYearId = req.query.schoolYearId;
    const teacher = await Staff.findById(teacherId);
    if (!teacher) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ message: "Nhân viên không tồn tại." });
    }

    if (!teacher.isTeacher) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: "Nhân viên này không phải giáo viên." });
    }

    const activeSchoolYear = await SchoolYear.findOne({
      _id: schoolYearId,
      active: true,
    })

    if (!activeSchoolYear) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ message: "Không có năm học nào đang hoạt động." });
    }

    const classes = await Class.find({
      teachers: teacherId,
      schoolYear: activeSchoolYear._id,
      active: true,
    })
      .populate({
        path: "students",
        select:
          "studentCode fullName gender dob address parent healthCertId birthCertId",
      })
      .populate("room", "roomName facilities")
      .populate("schoolYear", "schoolYear state")
      .lean();

    if (!classes || classes.length === 0) {
      return res.status(HTTP_STATUS.OK).json({
        message: `Giáo viên này chưa được phân công lớp trong năm học ${activeSchoolYear.schoolYear}.`,
        classes: [],
      });
    }

    const gfs = getGFS();
    if (!gfs) {
      return res
        .status(HTTP_STATUS.SERVER_ERROR)
        .json({ message: "GridFS chưa kết nối." });
    }

    for (const classItem of classes) {
      if (classItem.students?.length) {
        for (const student of classItem.students) {
          let healthCertFile = null;
          let birthCertFile = null;

          if (student.healthCertId) {
            const files = await gfs
              .find({ _id: student.healthCertId })
              .toArray();
            healthCertFile = files.length > 0 ? files[0] : null;
          }

          if (student.birthCertId) {
            const files = await gfs
              .find({ _id: student.birthCertId })
              .toArray();
            birthCertFile = files.length > 0 ? files[0] : null;
          }

          student.healthCertFile = healthCertFile;
          student.birthCertFile = birthCertFile;
        }
      }
    }

    return res.status(HTTP_STATUS.OK).json({
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
    return res.status(HTTP_STATUS.SERVER_ERROR).json({
      message: "Lỗi khi lấy danh sách lớp và học sinh.",
      error: error.message,
    });
  }
};

exports.getFeedbackByStudentAndDate = async (req, res) => {
  try {
    const { studentId, date } = req.query;

    if (!studentId || !date) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: "Cần phải đưa vào thông tin học sinh và ngày để tìm kiếm",
      });
    }

    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: "Ngày không hợp lệ",
      });
    }

    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const feedback = await Feedback.findOne({
      studentId: studentId,
      date: { $gte: startOfDay, $lte: endOfDay },
    })
      .populate({
        path: "studentId",
        select: "studentCode fullName dob gender",
      })
      .populate({
        path: "classId",
        select: "className classCode",
      })
      .populate({
        path: "teacherId",
        model: "Staff",
        select: "fullName staffCode",
      })
      .lean();

    if (!feedback) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: "Không tìm thấy feedback cho học sinh trong ngày này",
      });
    }

    return res.status(HTTP_STATUS.OK).json({
      message: "Lấy feedback thành công",
      data: feedback,
    });
  } catch (error) {
    console.error("Error getFeedbackByStudentAndDate:", error);
    return res
      .status(HTTP_STATUS.SERVER_ERROR)
      .json({ message: "Lỗi server", error });
  }
};