
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
const { sequencePattern } = require('../helpers/useHelpers');
const { SEQUENCE_CODE } = require('../constants/useConstants');
const SMTP = require('../helpers/stmpHelper');
const IMAP = require('../helpers/iMapHelper');
const { getGFS } = require("../configs/gridfs");
const { HTTP_STATUS, RESPONSE_MESSAGE, USER_ROLES, VALIDATION_CONSTANTS } = require('../constants/useConstants');
const Guardian = require("../models/guardianModel");

exports.createStaffController = async (req, res) => {
    const session = await Staff.startSession();
    session.startTransaction();

    try {
        const { email, createBy } = req.body;
        const modelName = Staff.modelName.toLowerCase();

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

        const staffSaved = await Staff.create([newData], { session });

        const userSaved = await User.create(
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
                    console.log(`✅ Mail gửi thành công đến email : ${email}`);
                }
            );

        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        console.error("Error createStaffController", error);
        return res
            .status(HTTP_STATUS.SERVER_ERROR)
            .json({ message: "Lỗi server", error });
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

// exports.getClassAndStudentByTeacherController = async (req, res) => {
//     try {
//         const teacherId = req.params.id;
//         const schoolYearId = req.query.schoolYearId;
//         // 1️⃣ Tìm giáo viên
//         const teacher = await Staff.findById(teacherId);
//         if (!teacher) {
//             return res
//                 .status(HTTP_STATUS.NOT_FOUND)
//                 .json({ message: "Nhân viên không tồn tại." });
//         }

//         if (!teacher.isTeacher) {
//             return res
//                 .status(HTTP_STATUS.BAD_REQUEST)
//                 .json({ message: "Nhân viên này không phải giáo viên." });
//         }

//         // 2️⃣ Tìm năm học hiện tại
//         const activeSchoolYear = await SchoolYear.findOne({
//             _id: schoolYearId,
//             active: true,
//         })

//         if (!activeSchoolYear) {
//             return res
//                 .status(HTTP_STATUS.NOT_FOUND)
//                 .json({ message: "Không có năm học nào đang hoạt động." });
//         }

//         // 3️⃣ Tìm lớp giáo viên đang dạy
//         const classes = await Class.find({
//             teachers: teacherId,
//             schoolYear: activeSchoolYear._id,
//             active: true,
//         })
//             .populate({
//                 path: "students",
//                 select:
//                     "studentCode fullName gender dob address parent healthCertId birthCertId",
//             })
//             .populate("room", "roomName facilities")
//             .populate("schoolYear", "schoolYear state")
//             .lean();

//         if (!classes || classes.length === 0) {
//             return res.status(HTTP_STATUS.OK).json({
//                 message: `Giáo viên này chưa được phân công lớp trong năm học ${activeSchoolYear.schoolYear}.`,
//                 classes: [],
//             });
//         }

//         // 4️⃣ Lấy file healthCert và birthCert từ GridFS
//         const gfs = getGFS();
//         if (!gfs) {
//             return res
//                 .status(HTTP_STATUS.SERVER_ERROR)
//                 .json({ message: "GridFS chưa kết nối." });
//         }

//         for (const classItem of classes) {
//             if (classItem.students?.length) {
//                 for (const student of classItem.students) {
//                     let healthCertFile = null;
//                     let birthCertFile = null;

//                     if (student.healthCertId) {
//                         const files = await gfs
//                             .find({ _id: student.healthCertId })
//                             .toArray();
//                         healthCertFile = files.length > 0 ? files[0] : null;
//                     }

//                     if (student.birthCertId) {
//                         const files = await gfs
//                             .find({ _id: student.birthCertId })
//                             .toArray();
//                         birthCertFile = files.length > 0 ? files[0] : null;
//                     }

//                     student.healthCertFile = healthCertFile;
//                     student.birthCertFile = birthCertFile;
//                 }
//             }
//         }

//         // 5️⃣ Trả về dữ liệu
//         return res.status(HTTP_STATUS.OK).json({
//             teacher: {
//                 _id: teacher._id,
//                 fullName: teacher.fullName,
//                 email: teacher.email,
//             },
//             schoolYear: {
//                 _id: activeSchoolYear._id,
//                 schoolYear: activeSchoolYear.schoolYear,
//                 startDate: activeSchoolYear.startDate,
//                 endDate: activeSchoolYear.endDate,
//             },
//             classes,
//         });
//     } catch (error) {
//         console.error("❌ Error getClassAndStudentByTeacherController:", error);
//         return res.status(HTTP_STATUS.SERVER_ERROR).json({
//             message: "Lỗi khi lấy danh sách lớp và học sinh.",
//             error: error.message,
//         });
//     }
// };


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
    });

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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const classItem of classes) {
      if (classItem.students?.length) {
        for (const student of classItem.students) {
          // 🔹 Gắn file giấy tờ
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

          // 🔹 Thêm phần kiểm tra người giám hộ trong ngày hôm nay
          const guardianToday = await Guardian.findOne({
            studentId: student._id,
            pickUpDate: today,
            active: true,
          })
            .populate("parentId", "fullName phoneNumber")
            .lean();

          student.guardianToday = guardianToday || null;
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

        return res.status(HTTP_STATUS.OK).json(studentData);
    } catch (error) {
        console.error("❌ Error getByIdStudent:", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json({
            message: "Lỗi khi lấy thông tin học sinh.",
            error: error.message,
        });
    }
};

