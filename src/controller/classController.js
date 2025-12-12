const { Model } = require("mongoose");
const { HTTP_STATUS, RESPONSE_MESSAGE, USER_ROLES, VALIDATION_CONSTANTS, MAXIMIMUM_CLASS } = require('../constants/useConstants');
const Class = require('../models/classModel');
const Staff = require('../models/staffModel');
const SchoolYear = require('../models/schoolYearModel');
const Student = require("../models/studentModel");
const Room = require("../models/roomModel");
const _ = require('lodash')
const i18n = require("../middlewares/i18n.middelware");
const dayjs = require('dayjs');

exports.getAllClassController = async (req, res) => {
    try {
        let { limit, page, year } = req.query;

        limit = parseInt(limit) || 30;
        page = parseInt(page) || 1;

        const offset = (page - 1) * limit;

        const dataSchoolYear = await SchoolYear.findOne({ schoolYear: year });
        if (!dataSchoolYear) {
          return res.status(HTTP_STATUS.OK).json({
            data: [],
            page: {
              totalCount: 0,
              limit,
                page,
            },
          });
        }
        let queryString = {
            active: { $eq: true },
            schoolYear: dataSchoolYear._id,
        };
        const totalCount = await Class.countDocuments(queryString);

        const data = await Class.find(queryString).populate("schoolYear room")
            .skip(offset)
            .limit(limit);

        if (!data || data.length === 0) {
            return res.status(HTTP_STATUS.OK).json({
                data: [],
                page: {
                    totalCount: 0,
                    limit,
                    page,
                },
            });
        }
        const newObject = data.map(item => ({
            "_id": item._id,
            "classCode": item.classCode,
            "className": item.className,
            "age": item.age,
            "numberStudent": item.students.length,
            "numberTeacher": item.teachers.length,
            "room": item.room?.roomName,
            "schoolYear": item.schoolYear.schoolYear
        }))

        return res.status(HTTP_STATUS.OK).json({
            data: newObject,
            page: {
                totalCount,
                limit,
                page,
            },
        });
    } catch (error) {
        console.log("Error getAllClassController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
}

exports.getByIdClassController = async (req, res) => {
    try {
        const data = await Class.findById(req.params.id).populate("students teachers room");
        if (!data) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy dữ liệu lớp học" });
        }
        return res.status(HTTP_STATUS.OK).json(data)
    } catch (error) {
        console.log("Error getByIdClassController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
}

exports.getAvailableStudentController = async (req, res) => {
    try {
        const { age } = req.query;
        if(!age){
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Vui lòng chọn độ tuổi của lớp học" });
        }

        const dataSchoolYear = await SchoolYear.findOne({ active: true, state: "Đang hoạt động" });

        const dataClass = await Class.find({ 
            active: true, 
            schoolYear: dataSchoolYear._id 
        }).lean();

        const studentArr = dataClass.map(item => item.students);
        const studentList = studentArr.flat();

        const currentYear = dayjs().year();
        const maxDob = dayjs().year(currentYear - Number(age)).endOf('year').toDate();
        const minDob = dayjs().year(currentYear - Number(age)).startOf('year').toDate();

        const studentAvailable = await Student.find({
            active: true,
            graduated: { $ne: true },
            _id: { $nin: studentList },
            dob: { $gte: minDob, $lte: maxDob } 
        });

        // if (!studentAvailable || studentAvailable.length === 0) {
        //     return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy học sinh phù hợp" });
        // }

        return res.status(HTTP_STATUS.OK).json(studentAvailable);
    } catch (error) {
        console.log("Error getAvailableStudentController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
};

exports.getAvailableTeacherController = async (req, res) => {
    try {
        const dataSchoolYear = await SchoolYear.findOne({ active: true, state: "Đang hoạt động" });
        let queryString = {
            active: { $eq: true },
            schoolYear: dataSchoolYear._id,
        };
        const dataClass = await Class.find(queryString).lean();

        const teacherArr = dataClass.map(item => item.teachers);
        const teacherList = teacherArr.flat();
        queryString = {
            active: { $eq: true },
            isTeacher: { $eq: true },
            _id: { $nin: teacherList }
        }
        const teacherAvailable = await Staff.find(queryString);
        if (!teacherAvailable) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy giáo viên phù hợp" });
        }
        return res.status(HTTP_STATUS.OK).json(teacherAvailable);
    } catch (error) {
        console.log("Error getAvailableTeacherController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
}

exports.getAvailableRoomController = async (req, res) => {
    try {
        const dataSchoolYear = await SchoolYear.findOne({
            active: { $eq: true },
            state: "Đang hoạt động"
        });
        let queryString = {
            active: { $eq: true },
            schoolYear: dataSchoolYear._id
        }
        const dataClass = await Class.find(queryString).lean();
        const roomArr = dataClass.map(item => item.room);
        queryString = {
            active: { $eq: true },
            _id: { $nin: roomArr }
        }
        const roomAvailable = await Room.find(queryString).lean();
        if (!roomAvailable) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy phòng học phù hợp" });
        }
        return res.status(HTTP_STATUS.OK).json(roomAvailable);
    } catch (error) {
        console.log("Error getAvailableRoomController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
}

const assignStudentsAndTeachersToClass = (classes, studentsByAge, teachersAvailable) => {
    const result = [];
    const assignedTeachersGlobal = new Set();
    const defaultMaxPerClass = MAXIMIMUM_CLASS.CLASS;
    const maxTeacherPerClass = MAXIMIMUM_CLASS.TEACHER;

    const classList = classes.map(c => ({
        ...c,
        students: [...(c.students || [])],
        teachers: [...(c.teachers || [])],
    }));

    const ages = Object.keys(studentsByAge);

    for (const ageStr of ages) {
        const age = Number(ageStr);
        let studentsLeft = [...studentsByAge[age]];

        for (const cls of classList) {
            if (studentsLeft.length === 0) break;

            if (!cls.age) cls.age = age;

            if (cls.age !== age) continue;

            const maxPerClass = MAXIMIMUM_CLASS[`CLASS_${age}`] || defaultMaxPerClass;
            const canAdd = Math.min(maxPerClass - cls.students.length, studentsLeft.length);

            if (canAdd > 0) {
                cls.students.push(...studentsLeft.splice(0, canAdd).map(s => s._id));
            }
        }
    }

    let remainingTeachers = teachersAvailable.filter(
        t => !assignedTeachersGlobal.has(t._id.toString())
    );

    for (const cls of classList) {
        const need = Math.min(maxTeacherPerClass, remainingTeachers.length);
        const assigned = remainingTeachers.splice(0, need);
        cls.teachers = assigned.map(t => t._id);
        assigned.forEach(t => assignedTeachersGlobal.add(t._id.toString()));
    }

    return classList;
};

exports.asyncClassController = async (req, res) => {
    try {
        const dataSchoolYear = await SchoolYear.findOne({ active: true, state: "Đang hoạt động" });
        if (!dataSchoolYear) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Không có năm học đang hoạt động" });
        }

        const dataClass = await Class.find({ active: true, schoolYear: dataSchoolYear._id }).lean();

        const studentListInClass = dataClass.map(c => c.students).flat();
        const studentAvailable = await Student.find({
            active: true,
            graduated: { $ne: true },
            _id: { $nin: studentListInClass }
        }).lean();

        const teacherArr = dataClass.map(item => item.teachers);
        const teacherList = teacherArr.flat();
        queryString = {
            active: { $eq: true },
            isTeacher: { $eq: true },
            _id: { $nin: teacherList }
        }
        const teacherAvailable = await Staff.find(queryString);

        const studentsWithAge = studentAvailable.map(s => {
            const dob = new Date(s.dob);
            const age = new Date().getFullYear() - dob.getFullYear();
            return { ...s, age };
        });
        const groupedByAge = _.groupBy(studentsWithAge, "age");

        const assignedClasses = assignStudentsAndTeachersToClass(dataClass, groupedByAge, teacherAvailable);

        const updatedClasses = await Promise.all(
            assignedClasses.map(cls =>
                Class.findByIdAndUpdate(cls._id, { students: cls.students, teachers: cls.teachers, age: cls.age }, { new: true })
            )
        );

        return res.status(HTTP_STATUS.OK).json({
            message: "Chia lớp thành công",
            assignedClasses: assignedClasses
        });

    } catch (error) {
        console.log("Error asyncClassController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
};

exports.getAvailableClassStudentController = async (req, res) => {
    try {
        const { classAge } = req.query;

        const dataSchoolYear = await SchoolYear.findOne({
            active: true,
            state: "Đang hoạt động",
        });

        if (!dataSchoolYear) {
            return res.status(404).json({ message: "Không tìm thấy năm học đang hoạt động" });
        }

        const dataClass = await Class.find({
            active: true,
            schoolYear: dataSchoolYear._id,
            age: classAge,
        }).populate({ path: "teachers", select: "staffCode fullName" });

        const maximumClassKey = `CLASS_${classAge}`;
        const avaClass = dataClass
            .filter(item => item.students.length < MAXIMIMUM_CLASS[maximumClassKey])
            .map(item => ({
                _id: item._id,
                classCode: item.classCode,
                className: item.className,
                teachers: item.teachers,
            }));

        if (avaClass.length === 0) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                message: "Không tìm thấy lớp học phù hợp",
            });
        }

        return res.status(HTTP_STATUS.OK).json(avaClass);
    } catch (error) {
        console.error("Error getAvailableClassStudentController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
};

exports.getAvailableClassTeacherController = async (req, res) => {
    try {
        const { classAge } = req.query;

        const dataSchoolYear = await SchoolYear.findOne({
            active: true,
            state: "Đang hoạt động",
        });

        if (!dataSchoolYear) {
            return res.status(404).json({ message: "Không tìm thấy năm học đang hoạt động" });
        }

        const dataClass = await Class.find({
            active: true,
            schoolYear: dataSchoolYear._id,
            age: classAge,
        });

        const avaClass = dataClass
            .filter(item => item.teachers.length < MAXIMIMUM_CLASS.TEACHER)
            .map(item => ({
                _id: item._id,
                classCode: item.classCode,
                className: item.className,
            }));

        if (avaClass.length === 0) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                message: "Không tìm thấy lớp học phù hợp",
            });
        }

        return res.status(HTTP_STATUS.OK).json(avaClass);
    } catch (error) {
        console.error("Error getAvailableClassTeacherController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
};

exports.changeClassStudentController = async (req, res) => {
    try {
        const { studentId, oldClassId, newClassId, classAge } = req.body;

        if (!studentId || !oldClassId || !newClassId || !classAge) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Thiếu dữ liệu đầu vào" });
        }

        const oldClass = await Class.findById(oldClassId);
        if (!oldClass) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy lớp cũ" });
        }

        const isInOldClass = oldClass.students.some(id => String(id) === String(studentId));
        if (!isInOldClass) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Học sinh không có trong lớp cũ" });
        }

        const newClass = await Class.findById(newClassId);
        if (!newClass) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy lớp mới" });
        }

        const maximumClassKey = `CLASS_${classAge}`;
        const maxStudents = MAXIMIMUM_CLASS[maximumClassKey];
        if (newClass.students.length >= maxStudents) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Lớp mới đã đầy, không thể chuyển học sinh" });
        }

        await Class.updateOne(
            { _id: oldClassId },
            { $pull: { students: studentId } }
        );

        await Class.updateOne(
            { _id: newClassId },
            { $addToSet: { students: studentId } }
        );

        return res.status(HTTP_STATUS.OK).json({
            message: "Chuyển học sinh sang lớp mới thành công",
            oldClassId,
            newClassId,
        });
    } catch (error) {
        console.error("Error changeClassStudentController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json({ message: "Lỗi khi chuyển lớp học sinh", error: error.message });
    }
};

exports.changeClassTeacherController = async (req, res) => {
    try {
        const { teacherId, oldClassId, newClassId } = req.body;

        if (!teacherId || !oldClassId || !newClassId) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Thiếu dữ liệu đầu vào" });
        }

        const oldClass = await Class.findById(oldClassId);
        if (!oldClass) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy lớp cũ" });
        }

        const isInOldClass = oldClass.teachers.some(
            (id) => String(id) === String(teacherId)
        );
        if (!isInOldClass) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Giáo viên không có trong lớp cũ" });
        }

        const newClass = await Class.findById(newClassId);
        if (!newClass) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Không tìm thấy lớp mới" });
        }

        if (newClass.teachers.length >= MAXIMIMUM_CLASS.TEACHER) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Lớp mới đã đủ giáo viên" });
        }

        await Class.updateOne(
            { _id: oldClassId },
            { $pull: { teachers: teacherId } }
        );

        await Class.updateOne(
            { _id: newClassId },
            { $addToSet: { teachers: teacherId } }
        );

        return res.status(200).json({
            message: "Chuyển giáo viên sang lớp mới thành công",
            oldClassId,
            newClassId,
        });
    } catch (error) {
        console.error("Error changeClassTeacherController", error);
        return res
            .status(HTTP_STATUS.SERVER_ERROR)
            .json({ message: "Lỗi khi chuyển lớp giáo viên", error: error.message });
    }
};

exports.getClassByStudentAndSchoolYear = async (req, res) => {
    try {
        const { studentId, schoolYearId } = req.query;

        if (!studentId || !schoolYearId) {
            return res.status(400).json({
                success: false,
                message: "Cần có thông tin của học sinh và năm học để tìm kiếm",
            });
        }

        const classFound = await Class.findOne({
            schoolYear: schoolYearId,
            students: { $in: [studentId] },
            active: true,
        })
            .populate({
                path: "students",
                select: "studentCode fullName gender",
            })
            .populate({
                path: "teachers",
                select: "teacherCode fullName phoneNumber",
            })
            .populate({
                path: "schoolYear",
                select: "schoolyearCode schoolYear",
            })
            .populate({
                path: "room",
                select: "roomCode roomName",
            });

        if (!classFound) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy lớp cho học sinh trong năm học này",
            });
        }

        res.status(200).json({
            success: true,
            class: classFound,
        });
    } catch (error) {
        console.error("Lỗi getClassByStudentAndSchoolYear:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi máy chủ",
            error: error.message,
        });
    }
};

exports.getClassCountBySchoolYear = async (req, res) => {
    try {
        const total = await Staff.countDocuments({ isTeacher: true });

        const result = await Class.aggregate([
            {
                $group: {
                    _id: "$schoolYear",
                    totalClasses: { $sum: 1 },
                    teachers: { $push: "$teachers" },
                    students: { $push: "$students" }
                },
            },

            // Lấy thông tin SchoolYear
            {
                $lookup: {
                    from: "schoolyears",
                    localField: "_id",
                    foreignField: "_id",
                    as: "schoolYearInfo",
                },
            },
            { $unwind: "$schoolYearInfo" },

            // Gộp teacher và student, loại trùng
            {
                $addFields: {
                    teachers: {
                        $reduce: {
                            input: "$teachers",
                            initialValue: [],
                            in: { $setUnion: ["$$value", "$$this"] }
                        }
                    },
                    students: {
                        $reduce: {
                            input: "$students",
                            initialValue: [],
                            in: { $setUnion: ["$$value", "$$this"] }
                        }
                    }
                }
            },

            {
                $project: {
                    _id: 0,
                    schoolYearId: "$_id",
                    totalClasses: 1,
                    totalStudents: { $size: "$students" },   // 👈 Thêm dòng này
                    schoolYear: {
                        _id: "$schoolYearInfo._id",
                        schoolyearCode: "$schoolYearInfo.schoolyearCode",
                        schoolYear: "$schoolYearInfo.schoolYear",
                        startDate: "$schoolYearInfo.startDate",
                        endDate: "$schoolYearInfo.endDate",
                        state: "$schoolYearInfo.state",
                        isPublished: "$schoolYearInfo.isPublished",
                        active: "$schoolYearInfo.active",
                    }
                },
            },

            { $sort: { "schoolYear.startDate": 1 } }
        ]);

        res.status(200).json({ success: true, totalTeachers: total, data: result });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ success: false, message: "Lỗi server!" });
    }
};
