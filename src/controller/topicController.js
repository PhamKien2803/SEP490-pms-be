
const { Model } = require("mongoose");
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const i18n = require("../middlewares/i18n.middelware");
const Activity = require('../models/activityModel');
const Event = require('../models/eventModel');
const SchoolYear = require('../models/schoolYearModel');
const Topic = require('../models/topicModel');
const { HTTP_STATUS, RESPONSE_MESSAGE, USER_ROLES, VALIDATION_CONSTANTS } = require('../constants/useConstants');
const { IMAP_CONFIG, SMTP_CONFIG } = require('../constants/mailConstants');
const { sequencePattern } = require('../helpers/useHelpers');
const { SEQUENCE_CODE } = require('../constants/useConstants');

exports.getAvailableActivityController = async (req, res) => {
    try {
        const { month, age } = req.query;
        const m = parseInt(month);

        if (isNaN(m) || m < 1 || m > 12) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Tháng không hợp lệ (1–12)" });
        }

        const schoolYearData = await SchoolYear.findOne({
            active: true,
            state: "Đang hoạt động"
        }).lean();

        if (!schoolYearData) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy năm học đang hoạt động" });
        }

        const [startYearStr, endYearStr] = schoolYearData.schoolYear.split("-");
        const startYear = parseInt(startYearStr);
        const endYear = parseInt(endYearStr);

        const yearForMonth = m >= 8 ? startYear : endYear;

        const startOfMonth = new Date(yearForMonth, m - 1, 1, 0, 0, 0);
        const endOfMonth = new Date(yearForMonth, m, 0, 23, 59, 59);

        const eventData = await Event.find({
            schoolYear: schoolYearData._id,
            active: true,
            holidayStartDate: { $lte: endOfMonth },
            holidayEndDate: { $gte: startOfMonth }
        }).lean();

        const dataIsFix = await Activity.find({
            active: true,
            type: "Cố định"
        }).lean();

        const dataActivity = await Activity.find({
            active: true,
            type: "Bình thường",
            age: age
        }).lean();

        let dataEvent = [];
        if (eventData.length > 0) {
            const eventNames = eventData.map(e => e.eventName);
            dataEvent = await Activity.find({
                active: true,
                type: "Sự kiện",
                eventName: { $in: eventNames }
            }).lean();
        }

        return res.status(HTTP_STATUS.OK).json({
            activitiFix: dataIsFix,
            activitiCore: dataActivity,
            activitiEvent: dataEvent,
        });
    } catch (error) {
        console.error("Error getAvailableActivityController:", error);
        return res.status(500).json(error);
    }
};

exports.getListController = async (req, res) => {
    try {
        let { limit, page, schoolYear } = req.query;
        const dataSchoolYear = await SchoolYear.findOne({
            active: { $eq: true },
            schoolYear: schoolYear
        })

        limit = parseInt(limit) || 30;
        page = parseInt(page) || 1;

        const offset = (page - 1) * limit;

        let queryString = {
            active: { $eq: true },
        }
        if (schoolYear) {
            queryString = {
                active: { $eq: true },
                schoolYear: dataSchoolYear._id
            };
        }
        const totalCount = await Topic.countDocuments(queryString);

        const data = await Topic.find(queryString, {
            topicCode: 1,
            topicName: 1,
            month: 1,
            age: 1,
            createdBy: 1,
            updatedBy: 1,
            createdAt: 1,
            updatedAt: 1
        })
            .skip(offset)
            .limit(limit);

        if (!data || data.length === 0) {
            return res
                .status(HTTP_STATUS.BAD_REQUEST)
                .json("Không tìm thấy dữ liệu");
        }

        return res.status(HTTP_STATUS.OK).json({
            data,
            page: {
                totalCount,
                limit,
                page,
            },
        });
    } catch (error) {
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
}

exports.getByIdController = async (req, res) => {
    try {
        const dataTopic = await Topic.findById(req.params.id)
            .populate('activitiFix.activity')
            .populate('activitiCore.activity')
            .populate('activitiEvent.activity');

        if (!dataTopic) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy dữ liệu chủ đề" });
        }

        const activitiesList = [
            ...dataTopic.activitiFix.map(a => ({ ...a.activity.toObject(), sessionsPerWeek: a.sessionsPerWeek, type: 'Fix' })),
            ...dataTopic.activitiCore.map(a => ({ ...a.activity.toObject(), sessionsPerWeek: a.sessionsPerWeek, type: 'Core' })),
            ...dataTopic.activitiEvent.map(a => ({ ...a.activity.toObject(), sessionsPerWeek: a.sessionsPerWeek, type: 'Event' })),
        ];

        return res.status(HTTP_STATUS.OK).json(dataTopic);
    } catch (error) {
        console.log("Error getByIdController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
};

exports.createTopicController = async (req, res) => {
    try {
        const modelName = Topic.modelName.toLowerCase();
        const sequence = await sequencePattern(Topic.modelName);

        const lastRecord = await Topic.find({
            topicCode: { $regex: `^${sequence}` }
        })
            .sort({ topicCode: -1 })
            .limit(1);

        let topicCode;
        if (!lastRecord.length) {
            topicCode = `${sequence}001`;
        } else {
            const lastNumber = parseInt(lastRecord[0].topicCode.slice(-3));
            topicCode = `${sequence}${String(lastNumber + 1).padStart(3, "0")}`;
        }

        const newData = {
            topicCode,
            active: true,
            ...req.body
        };

        const requiredFields = ["topicName", "month", "age"];
        const missingFields = requiredFields.filter(
            (field) => !newData[field]
        );

        if (missingFields.length) {
            const messages = missingFields.map(field =>
                i18n.t("messages.required", { field: i18n.t(`fields.${field}`) })
            );
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: messages.join(", ") });
        }

        const dataSchoolYear = await SchoolYear.findOne({
            active: true,
            state: "Đang hoạt động"
        })
        if (!dataSchoolYear) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Không có năm học hoạt động"
            });
        }
        const existedTopic = await Topic.findOne({
            month: newData.month,
            age: newData.age,
            schoolYear: dataSchoolYear._id,
            active: true
        });

        if (existedTopic) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: `Chủ đề của độ tuổi ${newData.age} đã được tạo`
            });
        }

        const codeExists = await Topic.findOne({ topicCode });
        if (codeExists) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: i18n.t("messages.alreadyExists", {
                    field: i18n.t("fields.topicCode")
                })
            });
        }

        const created = await Topic.create(newData);
        return res.status(HTTP_STATUS.CREATED).json(created);

    } catch (error) {
        console.log("error createTopic", error);

        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: messages.join(", ") });
        }

        return res.status(HTTP_STATUS.SERVER_ERROR).json({ message: error.message });
    }
};
