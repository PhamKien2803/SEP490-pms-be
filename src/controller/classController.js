const { Model } = require("mongoose");
const { HTTP_STATUS, RESPONSE_MESSAGE, USER_ROLES, VALIDATION_CONSTANTS, MAXIMIMUM_CLASS } = require('../constants/useConstants');
const Class = require('../models/classModel');
const Staff = require('../models/staffModel');
const SchoolYear = require('../models/schoolYearModel');
const Student = require("../models/studentModel");
const Room = require("../models/roomModel");
const _ = require('lodash')

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
        console.log("[Bthieu] ~ data:", data);

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

    for (const age in classesByAge) {
        const classGroup = classesByAge[age];
        const students = studentsByAge[age] || [];
        if (students.length === 0 && teachersAvailable.length === 0) continue;

        const maxPerClass = MAXIMIMUM_CLASS[`CLASS_${age}`] || MAXIMIMUM_CLASS.CLASS;
        const maxTeacherPerClass = MAXIMIMUM_CLASS.TEACHER;

        let classStatus = classGroup.map(cls => ({
            ...cls,
            students: cls.students || [],
            teachers: cls.teachers || [],
            slotsStudentAvailable: Math.max(maxPerClass - (cls.students?.length || 0), 0),
            slotsTeacherAvailable: Math.max(maxTeacherPerClass - (cls.teachers?.length || 0), 0)
        }));

        let remainingStudents = [...students];
        let classIndex = 0;
        while (remainingStudents.length > 0) {
            const cls = classStatus[classIndex];
            if (cls.slotsStudentAvailable > 0) {
                cls.students.push(remainingStudents.shift()._id);
                cls.slotsStudentAvailable -= 1;
            }
            classIndex = (classIndex + 1) % classStatus.length;
            if (classStatus.every(c => c.slotsStudentAvailable === 0)) break;
        }

        let remainingTeachers = teachersAvailable.filter(t => !assignedTeachersGlobal.has(t._id.toString()));
        classIndex = 0;
        while (remainingTeachers.length > 0) {
            const cls = classStatus[classIndex];

            if (cls.slotsTeacherAvailable > 0) {
                const teacherIndex = remainingTeachers.findIndex(t => !assignedTeachersGlobal.has(t._id.toString()));
                if (teacherIndex !== -1) {
                    const teacher = remainingTeachers.splice(teacherIndex, 1)[0];
                    cls.teachers.push(teacher._id);
                    cls.slotsTeacherAvailable -= 1;
                    assignedTeachersGlobal.add(teacher._id.toString());
                }
            }

            classIndex++;
            if (classIndex >= classStatus.length) {
                if (classStatus.every(c => c.slotsTeacherAvailable === 0) || remainingTeachers.length === 0) break;
                classIndex = 0;
            }
        }

        result.push(...classStatus);
    }

    return result;
};



exports.asyncClassController = async (req, res) => {
    try {
        const dataSchoolYear = await SchoolYear.findOne({ active: true, state: "Đang hoạt động" });
        console.log("[Bthieu] ~ dataSchoolYear:", dataSchoolYear);
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
            message: "Chia lớp thành công"
        });

    } catch (error) {
        console.log("Error asyncClassController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
};
