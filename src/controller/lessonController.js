const { Model } = require("mongoose");
const { HTTP_STATUS, RESPONSE_MESSAGE, USER_ROLES, VALIDATION_CONSTANTS, MAXIMIMUM_CLASS, SEQUENCE_CODE, TOKEN } = require('../constants/useConstants');
const Class = require('../models/classModel');
const Staff = require('../models/staffModel');
const SchoolYear = require('../models/schoolYearModel');
const Student = require("../models/studentModel");
const Schedule = require("../models/scheduleModel");
const Topic = require("../models/topicModel");
const Room = require("../models/roomModel");
const Lesson = require("../models/lessonModel");
const { IMAP_CONFIG, SMTP_CONFIG } = require('../constants/mailConstants');
const _ = require('lodash')
const SMTP = require('../helpers/stmpHelper');
const IMAP = require('../helpers/iMapHelper');
const i18n = require("../middlewares/i18n.middelware");



const getWeekRange = async (year, month, weekNumber) => {
    const firstDate = new Date(year, month - 1, 1);
    const dayOfWeek = firstDate.getDay();

    const firstMonday = new Date(firstDate);
    firstMonday.setDate(firstDate.getDate() - ((dayOfWeek + 6) % 7));

    const startDate = new Date(firstMonday);
    startDate.setDate(firstMonday.getDate() + (weekNumber - 1) * 7);

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    return { startDate, endDate };
}

exports.getScheduleByWeek = async (req, res) => {
    try {
        const { teacherId, month, week } = req.query;

        const schoolYearData = await SchoolYear.findOne({
            active: true,
            state: "Đang hoạt động"
        });

        if (!schoolYearData) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy năm học" });
        }

        const classData = await Class.findOne({
            active: true,
            schoolYear: schoolYearData._id,
            teachers: teacherId
        });

        if (!classData) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy lớp học" });
        }

        const topicData = await Topic.findOne({
            active: { $eq: true },
            age: classData.age,
            schoolYear: schoolYearData._id
        })

        const scheduleData = await Schedule.findOne({
            schoolYear: schoolYearData._id,
            class: classData._id,
            month: Number(month),
            status: "Xác nhận"
        })
            .populate({
                path: "scheduleDays.activities.activity",
                select: "activityCode activityName type category"
            })
            .lean();

        if (!scheduleData) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy thời khóa biểu" });
        }

        const year = new Date().getFullYear();
        const { startDate, endDate } = await getWeekRange(year, Number(month), Number(week));

        const filteredDays = scheduleData.scheduleDays
            .filter(dayItem => {
                const dateObj = new Date(dayItem.date);
                return dateObj >= startDate && dateObj <= endDate;
            })
            .map(dayItem => ({
                ...dayItem,
                activities: dayItem.activities.map(act => {
                    if (act.activity && typeof act.activity === "object") {
                        return {
                            activity: act.activity._id,
                            activityCode: act.activity.activityCode,
                            activityName: act.activity.activityName,
                            type: act.activity.type,
                            category: act.activity.category,
                            startTime: act.startTime,
                            endTime: act.endTime,
                            isFix: act.isFix,
                            tittle: act.tittle,
                            description: act.description
                        };
                    }
                    return {
                        startTime: act.startTime,
                        endTime: act.endTime
                    };
                })
            }));

        return res.status(HTTP_STATUS.OK).json({
            classId: classData._id,
            schoolYearId: schoolYearData._id,
            month: Number(month),
            week: Number(week),
            topic: topicData.topicName,
            scheduleDays: filteredDays
        });

    } catch (error) {
        console.log("Error getScheduleByWeek", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
};

exports.getLessonList = async (req, res) => {
    try {
        let { limit, page, teacherId, schoolYear } = req.query;

        limit = parseInt(limit) || 30;
        page = parseInt(page) || 1;
        const offset = (page - 1) * limit;

        const schoolYearData = await SchoolYear.findOne({
            active: true,
            schoolYear: schoolYear
        });
        if (!schoolYearData) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy năm học" });
        }

        let classFilter = { schoolYear: schoolYearData._id, active: true };
        if (teacherId) classFilter.teachers = teacherId;

        const classDataList = await Class.find(classFilter);
        if (!classDataList || classDataList.length === 0) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy lớp học" });
        }

        const classIds = classDataList.map(c => c._id);

        const totalCount = await Lesson.countDocuments({
            classId: { $in: classIds },
            schoolYearId: schoolYearData._id
        });

        const data = await Lesson.find({
            classId: { $in: classIds },
            schoolYearId: schoolYearData._id
        })
            .populate("classId")
            .populate("schoolYearId")
            .skip(offset)
            .limit(limit);

        if (!data || data.length === 0) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json("Không tìm thấy dữ liệu");
        }

        const newObject = data.map(item => ({
            _id: item._id,
            className: item.classId.className,
            schoolYear: item.schoolYearId.schoolYear,
            month: item.month,
            weekNumber: item.weekNumber,
            status: item.status
        }));

        return res.status(HTTP_STATUS.OK).json({
            data: newObject,
            page: {
                totalCount,
                limit,
                page,
            },
        });
    } catch (error) {
        console.log("Error getLessonList", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
};

exports.createLessonController = async (req, res) => {
    try {
        const { classId, schoolYearId, month, weekNumber, scheduleDays, status, topicName } = req.body;

        if (!classId || !schoolYearId || !month || !weekNumber) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Thiếu thông tin bắt buộc nhập" });
        }

        const dataCheck = await Lesson.findOne({
            classId: classId,
            schoolYearId: schoolYearId,
            month: month,
            weekNumber: weekNumber
        })
        if (dataCheck) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Báo giảng đã được tạo" })
        }
        const newLesson = new Lesson({
            classId,
            schoolYearId,
            month,
            weekNumber,
            scheduleDays,
            topicName,
            status: status || "Dự thảo"
        });

        const savedLesson = await newLesson.save();

        return res.status(HTTP_STATUS.CREATED).json({
            message: "Tạo lesson thành công",
            lesson: savedLesson
        });

    } catch (error) {
        console.error("Error createLessonController:", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
};

exports.updateLessonController = async (req, res) => {
    const { id } = req.params;
    try {
        const data = await Lesson.findById(id);
        if (!data) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Không tìm thấy lịch học" });
        }
        Object.assign(data, req.body);

        const uniqueFields = Object.keys(Lesson.schema.paths).filter(
            key => Lesson.schema.paths[key].options.unique
        );

        for (const field of uniqueFields) {
            const exists = await Lesson.findOne({ [field]: data[field], _id: { $ne: id } });
            if (exists) {
                return res.status(400).json({ message: `Trường ${field} đã tồn tại.` });
            }
        }
        await data.save();

        return res.status(HTTP_STATUS.UPDATED).json({ message: "Cập nhật thành công" });
    } catch (error) {
        console.log("error updateGeneric", error);

        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ message: messages.join(", ") });
        }
        res.status(HTTP_STATUS.SERVER_ERROR).json({ message: error.message });
    }
}

exports.sendRequestLessonController = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await Lesson.findById(id);
        if (!data) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Không tìm thấy lịch học" });
        }

        const dataClass = await Class.findById(data.classId);
        if (!dataClass) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Không tìm thấy lớp học" });
        }
        const teacherId = dataClass.teachers;
        console.log("[Bthieu] ~ teacherId:", teacherId);
        const dataStaff = await Staff.find({
            _id: { $in: teacherId }
        });
        const emailRecipients = dataStaff.map(staff => staff.email);


        data.status = "Chờ duyệt";
        await data.save();

        res.status(HTTP_STATUS.OK).json({ message: "Gửi yêu cầu duyệt thành công" });
        setImmediate(async () => {
            try {
                const htmlContent = `
                    <p>Xin chào quý giáo viên,</p>
                    <p>Báo giảng tuần <b>${data.weekNumber}</b> của lớp <b>${dataClass.className}</b> 
                    đã được gửi đến Ban giám hiệu</p>
                    <p>Chủ đề: <b>${data.topicName || "Không có"}</b></p>
                    <p>Vui lòng kiểm tra lại trên hệ thống.</p>
                    <br/>
                    <p>Trân trọng,<br/>Ban giám hiệu</p>
                `

                const mail = new SMTP(SMTP_CONFIG);
                const to = emailRecipients[0];
                const cc = emailRecipients.length > 1 ? emailRecipients[1] : null;
                await mail.send(
                    to,
                    cc,
                    "THÔNG BÁO DUYỆT BÁO GIẢNG",
                    htmlContent
                );

                console.log("✅ Đã gửi mail thành công");
            } catch (mailErr) {
                console.error("Lỗi khi gửi mail:", mailErr);
            }
        });
    } catch (error) {
        console.log("error sendRequestLessonController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
}

exports.rejectRequestLessonController = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await Lesson.findById(id);
        if (!data) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Không tìm thấy lịch học" });
        }

        const dataClass = await Class.findById(data.classId);
        if (!dataClass) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Không tìm thấy lớp học" });
        }
        const teacherId = dataClass.teachers;
        const dataStaff = await Staff.find({
            _id: { $in: teacherId }
        });

        const emailRecipients = dataStaff.map(staff => staff.email);

        data.status = "Dự thảo";
        await data.save();
        res.status(HTTP_STATUS.OK).json({ message: "Từ chối yêu cầu duyệt thành công" });
        setImmediate(async () => {
            try {
                const htmlContent = `
                    <p>Xin chào quý giáo viên,</p>
                    <p>Báo giảng tuần <b>${data.weekNumber}</b> của lớp <b>${dataClass.className}</b> 
                    chưa được phê duyệt thành công và cần sửa đổi.</p>
                    <p>Chủ đề: <b>${data.topicName || "Không có"}</b></p>
                    <p>Vui lòng kiểm tra lại trên hệ thống.</p>
                    <br/>
                    <p>Trân trọng,<br/>Ban giám hiệu</p>
                `

                const mail = new SMTP(SMTP_CONFIG);
                const to = emailRecipients[0];
                const cc = emailRecipients.length > 1 ? emailRecipients[1] : null;
                await mail.send(
                    to,
                    cc,
                    "THÔNG BÁO DUYỆT BÁO GIẢNG",
                    htmlContent
                );

                console.log("✅ Đã gửi mail thành công");
            } catch (mailErr) {
                console.error("Lỗi khi gửi mail:", mailErr);
            }
        });
    } catch (error) {
        console.log("error sendRequestLessonController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
}

exports.confirmRequestLessonController = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await Lesson.findById(id);
        if (!data) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Không tìm thấy lịch học" });
        }
        const dataClass = await Class.findById(data.classId);
        if (!dataClass) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Không tìm thấy lớp học" });
        }
        const teacherId = dataClass.teachers;
        const dataStaff = await Staff.find({
            _id: { $in: teacherId }
        });

        const emailRecipients = dataStaff.map(staff => staff.email);
        const schedule = await Schedule.findOne({
            schoolYear: data.schoolYearId,
            class: data.classId,
            month: data.month,
            status: "Xác nhận"
        });

        if (!schedule) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Không tìm thấy thời khóa biểu tương ứng" });
        }

        for (const lessonDay of data.scheduleDays) {
            const scheduleDay = schedule.scheduleDays.find(
                s => new Date(s.date).toDateString() === new Date(lessonDay.date).toDateString()
            );
            if (scheduleDay) {
                lessonDay.activities.forEach(lessonAct => {
                    const act = scheduleDay.activities.find(
                        s => String(s.activity) === String(lessonAct.activity)
                    );
                    if (act) {
                        act.tittle = lessonAct.tittle || act.tittle;
                    } else {
                        scheduleDay.activities.push({
                            activity: lessonAct.activity,
                            tittle: lessonAct.tittle,
                            startTime: lessonAct.startTime,
                            endTime: lessonAct.endTime,
                            isFix: lessonAct.isFix
                        });
                    }
                });
            }
        }
        await schedule.save();
        data.status = "Hoàn thành";
        await data.save();

        res.status(HTTP_STATUS.OK).json({ message: "Duyệt yêu cầu duyệt thành công" });
        setImmediate(async () => {
            try {
                const htmlContent = `
                    <p>Xin chào quý giáo viên,</p>
                    <p>Báo giảng tuần <b>${data.weekNumber}</b> của lớp <b>${dataClass.className}</b> 
                    đã được duyệt thành công.</p>
                    <p>Chủ đề: <b>${data.topicName || "Không có"}</b></p>
                    <p>Vui lòng kiểm tra lại trên hệ thống.</p>
                    <br/>
                    <p>Trân trọng,<br/>Ban giám hiệu</p>
                `

                const mail = new SMTP(SMTP_CONFIG);
                const to = emailRecipients[0];
                const cc = emailRecipients.length > 1 ? emailRecipients[1] : null;
                await mail.send(
                    to,
                    cc,
                    "THÔNG BÁO DUYỆT BÁO GIẢNG",
                    htmlContent
                );

                console.log("✅ Đã gửi mail thành công");
            } catch (mailErr) {
                console.error("Lỗi khi gửi mail:", mailErr);
            }
        });

    } catch (error) {
        console.log("error sendRequestLessonController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
}

exports.getByIdLessonController = async (req, res) => {
    try {
        const { id } = req.params;

        const lesson = await Lesson.findById(id)
            .populate("classId")
            .populate("schoolYearId")
            .populate("scheduleDays.activities.activity");
        if (!lesson) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy lesson" });
        }

        const newObject = {
            classId: lesson.classId._id,
            schoolYearId: lesson.schoolYearId._id,
            classCode: lesson.classId.classCode,
            className: lesson.classId.className,
            schoolYear: lesson.schoolYearId.schoolYear,
            month: lesson.month,
            weekNumber: lesson.weekNumber,
            topicName: lesson.topicName,
            status: lesson.status,
            scheduleDays: lesson.scheduleDays.map(day => ({
                _id: day._id,
                date: day.date,
                dayName: day.dayName,
                activities: day.activities.map(act => ({
                    activity: act.activity?._id,
                    activityCode: act.activity?.activityCode,
                    activityName: act.activity?.activityName,
                    type: act.activity?.type,
                    startTime: act.startTime,
                    endTime: act.endTime,
                    tittle: act.tittle,
                    description: act.description,
                }))
            }))
        }

        return res.status(HTTP_STATUS.OK).json(newObject);

    } catch (error) {
        console.log("error getByIdLessonController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
}

exports.getTimeTableByTeacherController = async (req, res) => {
    try {
        const { teacherId, schoolYear, month } = req.query;

        const schoolYearData = await SchoolYear.findOne({
            active: true,
            schoolYear: schoolYear
        });
        if (!schoolYearData) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy năm học" });
        }
        const classData = await Class.findOne({
            active: true,
            schoolYear: schoolYearData._id,
            teachers: teacherId
        });
        if (!classData) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy lớp học" });
        }

        const scheduleData = await Schedule.findOne({
            schoolYear: schoolYearData._id,
            class: classData._id,
            month: Number(month),
            status: "Xác nhận"
        })
            .populate("class")
            .populate("schoolYear")
            .populate({
                path: "scheduleDays.activities.activity",
                select: "activityCode activityName type category"
            })
            .lean();

            
          const newObject = {
            _id: scheduleData._id,
            classId: scheduleData.class._id,
            classCode: scheduleData.class.classCode,
            className: scheduleData.class.className,
            schoolYearId: scheduleData.schoolYear._id,
            schoolYear: scheduleData.schoolYear.schoolYear,
            month: scheduleData.month,
            scheduleDays: scheduleData.scheduleDays.map(day => ({
                _id: day._id,
                date: day.date,
                dayName: day.dayName,
                activities: day.activities.map(act => ({
                    activity: act.activity?._id,
                    activityCode: act.activity?.activityCode,
                    activityName: act.activity?.activityName,
                    type: act.activity?.type,
                    startTime: act.startTime,
                    endTime: act.endTime,
                    tittle: act.tittle,
                }))
            }))
        }    
        if (!scheduleData) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy thời khóa biểu" });
        }
        return res.status(HTTP_STATUS.OK).json(newObject);
    } catch (error) {
        console.log("error getTimeTableByTeacherController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
}