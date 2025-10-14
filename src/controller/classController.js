const { Model } = require("mongoose");
const { HTTP_STATUS, RESPONSE_MESSAGE, USER_ROLES, VALIDATION_CONSTANTS } = require('../constants/useConstants');
const Class = require('../models/classModel');
const Staff = require('../models/staffModel');
const SchoolYear = require('../models/schoolYearModel');
const Student = require("../models/studentModel");

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

        const data = await Class.find(queryString).populate({ path: "schoolYear", select: "schoolYear" })
            .skip(offset)
            .limit(limit);

        const newObject = data.map(item => ({
            "_id": item._id,
            "classCode": item.classCode,
            "className": item.className,
            "age": item.age,
            "numberStudent": item.students.length,
            "numberTeacher": item.teachers.length,
            "room": "Chờ data",
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
        const data = await Class.findById(req.params.id).populate("students teachers");
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
            _id: { $nin: studentList }
        }
        const studentAvailable = await Student.find(queryString);
        if(!studentAvailable){
            return res.status(HTTP_STATUS.NOT_FOUND).json({message: "Không tìm thấy giáo viên phù hợp"});
        }
        return res.status(HTTP_STATUS.OK).json(studentAvailable);
    } catch (error) {
        console.log("Error getByIdClassController", error);
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
        console.log("[Bthieu] ~ dataClass:", dataClass)

        const teacherArr = dataClass.map(item => item.teachers);
        console.log("[Bthieu] ~ teacherArr:", teacherArr)
        const teacherList = teacherArr.flat();
        console.log("[Bthieu] ~ teacherList:", teacherList)
        queryString = {
            active: { $eq: true },
            isTeacher: { $eq: true },
            _id: { $nin: teacherList }
        }
        const teacherAvailable = await Staff.find(queryString);
        if(!teacherAvailable){
            return res.status(HTTP_STATUS.NOT_FOUND).json({message: "Không tìm thấy giáo viên phù hợp"});
        }
        return res.status(HTTP_STATUS.OK).json(teacherAvailable);
    } catch (error) {
        console.log("Error getByIdClassController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
}


