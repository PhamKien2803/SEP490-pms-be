
const { Model } = require("mongoose");
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const i18n = require("../middlewares/i18n.middelware");
const Activity = require('../models/activityModel');
const Event = require('../models/eventModel');
const SchoolYear = require('../models/schoolYearModel');
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
