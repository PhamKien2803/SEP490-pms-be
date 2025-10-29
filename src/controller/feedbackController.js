const { HTTP_STATUS } = require('../constants/useConstants');
const Feedback = require('../models/feedbackModel');

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
    console.error("❌ Lỗi khi tạo nhiều feedback:", error);
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
    const feedbacks = await Feedback.find({
      classId,
      date: {
        $gte: targetDate,
        $lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000),
      },
    })
      .populate({
        path: "studentId",
        select: "studentCode fullName dob gender address healthCertId",
      })
      .populate({ path: "classId", select: "classCode className" });
      
    return res.status(200).json(feedbacks);
  } catch (error) {
    console.error("❌ Lỗi khi lấy feedback theo lớp và ngày:", error);
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
      .populate({ path: "classId", select: "classCode className" })

    if (!data) {
      return res.status(404).json({ message: "Không tìm thấy feedback" });
    }
    return res.status(200).json(data);
  } catch (error) {
    console.error("error getByIdFeedbackController:", error);
    return res.status(500).json({
      message: "Lỗi máy chủ khi lấy thông tin feedback",
      error: error.message,
    });
  }
};