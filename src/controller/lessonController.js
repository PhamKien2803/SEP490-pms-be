const { Model } = require("mongoose");
const { HTTP_STATUS, RESPONSE_MESSAGE, USER_ROLES, VALIDATION_CONSTANTS, MAXIMIMUM_CLASS } = require('../constants/useConstants');
const Class = require('../models/classModel');
const Staff = require('../models/staffModel');
const SchoolYear = require('../models/schoolYearModel');
const Student = require("../models/studentModel");
const Schedule = require("../models/scheduleModel");
const Topic = require("../models/topicModel");
const Room = require("../models/roomModel");
const Lesson = require("../models/lessonModel");
const _ = require('lodash')
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
            active: {$eq: true},
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
            class: classData.name,
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

exports.getLessonList = async(req, res) => {
    try {
    let { limit, page, teacherId, schoolYear } = req.query;

    limit = parseInt(limit) || 30;
    page = parseInt(page) || 1;

    const offset = (page - 1) * limit;

    const schoolYearData = await SchoolYear.findOne({
        active: {$eq: true},
        schoolYear: schoolYear
    })
    if(!schoolYearData){
        return res.status(HTTP_STATUS.NOT_FOUND).json({message: "Không tìm thấy năm học"});
    }
    const classData = await Class.findOne({
        schoolYear: schoolYearData._id,
         active: {$eq: true},
         teachers: teacherId
    })
      if(!classData){
        return res.status(HTTP_STATUS.NOT_FOUND).json({message: "Không tìm thấy lớp học"});
    }
    const totalCount = await Lesson.countDocuments();

    const data = await Lesson.find({
        classId: classData._id,
        schoolYearId: schoolYearData._id,
    })
    .populate("classId")
    .populate("schoolYearId")
      .skip(offset)
      .limit(limit);

    if (!data || data.length === 0) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json("Không tìm thấy dữ liệu");
    }

    const newObject = data.map(item => ({
        className: item.classId.className,
        schoolYear: item.schoolYearId.schoolYear,
        month: item.month,
        weekNumber: item.weekNumber,
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
    console.log("Error getLessonList", error);
    return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
  }
}
// exports.createLesson = async(req, res) => {
    
// }
