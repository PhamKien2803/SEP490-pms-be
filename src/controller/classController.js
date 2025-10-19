const { Model } = require("mongoose");
const { HTTP_STATUS, RESPONSE_MESSAGE, USER_ROLES, VALIDATION_CONSTANTS, MAXIMIMUM_CLASS } = require('../constants/useConstants');
const Class = require('../models/classModel');
const Staff = require('../models/staffModel');
const SchoolYear = require('../models/schoolYearModel');
const Student = require("../models/studentModel");
const Room = require("../models/roomModel");
const _ = require('lodash')
const i18n = require("../middlewares/i18n.middelware");

exports.getAllClassController = async (req, res) => {
    try {
        let { limit, page, year } = req.query;

        limit = parseInt(limit) || 30;
        page = parseInt(page) || 1;

        const offset = (page - 1) * limit;

        const dataSchoolYear = await SchoolYear.findOne({ schoolYear: year });
        if (!dataSchoolYear) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy dữ liệu năm học" });
        }
        let queryString = {
            active: { $eq: true },
            schoolYear: dataSchoolYear._id,
        };
        const totalCount = await Class.countDocuments(queryString);

        const data = await Class.find(queryString).populate("schoolYear room")
            .skip(offset)
            .limit(limit);

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
        if (!data || data.length === 0) {
            return res
                .status(HTTP_STATUS.BAD_REQUEST)
                .json("Không tìm thấy dữ liệu");
        }

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
        const dataSchoolYear = await SchoolYear.findOne({ active: true, state: "Đang hoạt động" });
        let queryString = {
            active: { $eq: true },
            schoolYear: dataSchoolYear._id,
        };
        const dataClass = await Class.find(queryString).lean();

        const studentArr = dataClass.map(item => item.students);
        const studentList = studentArr.flat();
        queryString = {
            active: { $eq: true },
            graduated: { $ne: true },
            _id: { $nin: studentList }
        }
        const studentAvailable = await Student.find(queryString);
        if (!studentAvailable) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy giáo viên phù hợp" });
        }
        return res.status(HTTP_STATUS.OK).json(studentAvailable);
    } catch (error) {
        console.log("Error getAvailableStudentController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
}

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
    const classesByAge = _.groupBy(classes, "age");
    const assignedTeachersGlobal = new Set();

    for (const [age, classGroup] of Object.entries(classesByAge)) {
        const students = [...(studentsByAge[age] || [])];
        if (!students.length && !teachersAvailable.length) continue;

        const minPerClass = MAXIMIMUM_CLASS.CLASS;
        const maxPerClass = MAXIMIMUM_CLASS[`CLASS_${age}`] || minPerClass;
        const maxTeacherPerClass = MAXIMIMUM_CLASS.TEACHER;

        // Chuẩn hóa lớp
        let classStatus = classGroup.map(cls => {
            const studentCount = cls.students?.length || 0;
            const teacherCount = cls.teachers?.length || 0;
            return {
                ...cls,
                students: [...(cls.students || [])],
                teachers: [...(cls.teachers || [])],
                slotsStudentMin: Math.max(minPerClass - studentCount, 0),
                slotsStudentMax: Math.max(maxPerClass - studentCount, 0),
                slotsTeacherAvailable: Math.max(maxTeacherPerClass - teacherCount, 0),
            };
        });

        // ---- Giai đoạn 1: Đảm bảo đủ min
        for (const cls of classStatus) {
            if (!students.length) break;
            const need = Math.min(cls.slotsStudentMin, students.length);
            cls.students.push(...students.splice(0, need).map(s => s._id));
            cls.slotsStudentMin -= need;
            cls.slotsStudentMax -= need;
        }

        // ---- Giai đoạn 2: Phân bổ thêm nếu dư
        for (const cls of classStatus) {
            if (students.length < minPerClass) break;
            const addable = Math.min(cls.slotsStudentMax, students.length);
            cls.students.push(...students.splice(0, addable).map(s => s._id));
            cls.slotsStudentMax -= addable;
        }

        // ---- Giai đoạn 3: Gộp lớp nhỏ nếu được
        classStatus = classStatus.reduce((merged, cls) => {
            const target = merged.find(
                c => c.age === cls.age && c.students.length + cls.students.length <= maxPerClass
            );
            if (target) {
                target.students.push(...cls.students);
            } else {
                merged.push(cls);
            }
            return merged;
        }, []);

        // ---- Giai đoạn 4: Cân bằng lại nếu có lớp full
        const hasFull = classStatus.some(cls => cls.students.length >= maxPerClass);
        if (hasFull) {
            const active = classStatus.filter(cls => cls.students.length > 0);
            const allStudents = active.flatMap(c => c.students).sort(() => Math.random() - 0.5);

            const avg = Math.floor(allStudents.length / active.length);
            active.forEach(cls => (cls.students = allStudents.splice(0, avg)));
            active.forEach((cls, i) => {
                while (allStudents.length && cls.students.length < maxPerClass) {
                    cls.students.push(allStudents.shift());
                }
            });
        }

        // ---- Giai đoạn 5: Gán giáo viên
        let remainingTeachers = teachersAvailable.filter(
            t => !assignedTeachersGlobal.has(t._id.toString())
        );

        for (const cls of classStatus) {
            const need = Math.min(cls.slotsTeacherAvailable, remainingTeachers.length);
            const assigned = remainingTeachers.splice(0, need);
            cls.teachers.push(...assigned.map(t => t._id));
            assigned.forEach(t => assignedTeachersGlobal.add(t._id.toString()));
        }

        result.push(...classStatus);
    }

    return result;
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
                Class.findByIdAndUpdate(cls._id, { students: cls.students, teachers: cls.teachers }, { new: true })
            )
        );

        return res.status(HTTP_STATUS.OK).json({
            message: "Chia lớp thành công",
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
