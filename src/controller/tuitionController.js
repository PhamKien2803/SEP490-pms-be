const { Model } = require("mongoose");
const { HTTP_STATUS, RESPONSE_MESSAGE, USER_ROLES, VALIDATION_CONSTANTS } = require('../constants/useConstants');
const { IMAP_CONFIG, SMTP_CONFIG } = require('../constants/mailConstants');
const { sequencePattern } = require('../helpers/useHelpers');
const Receipt = require("../models/receiptModel");
const Revenue = require("../models/revenueModel");
const SchoolYear = require("../models/schoolYearModel");
const Student = require("../models/studentModel");
const Service = require("../models/serviceModel");
const Tuition = require("../models/tuitionModel");
const Parent = require("../models/parentModel");
const { SEQUENCE_CODE } = require('../constants/useConstants');
const i18n = require("../middlewares/i18n.middelware");
const SMTP = require('../helpers/stmpHelper');
const IMAP = require('../helpers/iMapHelper');

exports.getListController = async (req, res) => {
    try {
        let { limit, page, schoolYear } = req.query;

        limit = parseInt(limit) || 30;
        page = parseInt(page) || 1;

        const offset = (page - 1) * limit;

        const schoolYearData = await SchoolYear.findOne({
            state: "Đang hoạt động",
            schoolYear: schoolYear
        });

        if (!schoolYearData) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json("Không tìm thấy năm học đang hoạt động");
        }

        let queryString = {
            schoolYear: schoolYearData._id,
        };
        const totalCount = await Tuition.countDocuments(queryString);

        const data = await Tuition.find(queryString)
            .populate('studentId')
            .populate('schoolYear')
            .skip(offset)
            .limit(limit);

        if (!data || data.length === 0) {
            // return res
            //   .status(HTTP_STATUS.BAD_REQUEST)
            //   .json("Không tìm thấy dữ liệu");
            return res.status(HTTP_STATUS.OK).json({
                data: [],
                page: {
                    totalCount,
                    limit,
                    page,
                },
            })
        }
        const object = data.map(item => ({
            _id: item._id,
            tuitionName: item.tuitionName,
            totalAmount: item.totalAmount,
            month: item.month,
            schoolYear: item.schoolYear.schoolYear,
            studentName: item.studentId.fullName,
            state: item.state,
            createdBy: item.createdBy,
            updatedBy: item.updatedBy,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
        }))

        const totalAmount = object.reduce((sum, item) => sum + item.totalAmount, 0);


        return res.status(HTTP_STATUS.OK).json({
            data: object,
            totalAmount: totalAmount,
            page: {
                totalCount,
                limit,
                page,
            },
        });
    } catch (error) {
        console.log("error getListController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
}