const { Model } = require("mongoose");
const { HTTP_STATUS, RESPONSE_MESSAGE, USER_ROLES, VALIDATION_CONSTANTS } = require('../constants/useConstants');
const { sequencePattern } = require('../helpers/useHelpers');
const { SEQUENCE_CODE } = require('../constants/useConstants');
const SchoolYear = require("../models/schoolYearModel");
const Revenue = require("../models/revenueModel");
const Service = require("../models/serviceModel");
const i18n = require("../middlewares/i18n.middelware");

exports.getPreviewServiceController = async (req, res) => {
    try {
        const dataSchoolYear = await SchoolYear.findOne({ active: true, state: "Đang hoạt động" });
        if (!dataSchoolYear) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy năm học" });
        }
        const revenue = await Revenue.findOne({
            revenueName: "Đồng phục",
            active: true,
        });
        if (!revenue) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Hiện không có dịch vụ nào" });
        }

        const newObject = {
            schoolYearId: dataSchoolYear._id,
            schoolYear: dataSchoolYear.schoolYear,
            revenue: revenue._id,
            revenueName: revenue.revenueName,
            amount: revenue.amount,
            imageUniform: "https://dongphuckimvang.vn/assets/shops/2021_10/dong-phuc-hoc-sinh-mam-non15.png"
        }
        return res.status(HTTP_STATUS.OK).json(newObject);
    } catch (error) {
        console.log("error getPreviewServiceController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
}

exports.getByStudentId = async (req, res) => {
    try {
        const { studentId, schoolYear } = req.query;
        const schoolYearData = await SchoolYear.findOne({ schoolYear: schoolYear, active: true });
        if (!schoolYearData) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy năm học" });
        }
        const revenue = await Revenue.findOne({
            revenueName: "Đồng phục",
            active: true,
        });
        if (!revenue) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Hiện không có dịch vụ nào" });
        }

        const services = await Service.findOne({ student: studentId, active: true, schoolYearId: schoolYearData._id });
        if (!services) {
            return res.status(HTTP_STATUS.OK).json({ data: [] });
        }
        
        const object = {
            _id: services._id,
            serviceCode: services.serviceCode,
            schoolYearId: services.schoolYearId,
            student: services.student,
            revenue: services.revenue,
            amount: revenue.amount,
            imageUniform: services.imageUniform,
            qty: services.qty,
            totalAmount: services.totalAmount,
            createdBy: services.createdBy,
            updatedBy: services.updatedBy,
            active: services.active,
            createdAt: services.createdAt,
            updatedAt: services.updatedAt
        }

        return res.status(HTTP_STATUS.OK).json(object);
    } catch (error) {
        console.log("error getByStudentId", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
}

exports.reportUniformService = async (req, res) => {
    try {

        let { limit, page, schoolYear } = req.query;

        limit = parseInt(limit) || 30;
        page = parseInt(page) || 1;

        const offset = (page - 1) * limit;

        const queryString = {
            active: { $eq: true },
        };
        const schoolYearData = await SchoolYear.findOne({ schoolYear: schoolYear, active: true });
        if (!schoolYearData) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy năm học" });
        }

        const services = await Service.find({ schoolYearId: schoolYearData._id, active: true })
            .populate("student")
            .skip(offset)
            .limit(limit);

        const newObject = services.map((service) => ({
            serviceCode: service.serviceCode,
            studentName: service.student.fullName,
            qty: service.qty,
            totalAmount: service.totalAmount,
            createdBy: service.createdBy,
            updatedBy: service.updatedBy,
        }));


        if (!newObject || newObject === 0) {
            return res.status(HTTP_STATUS.OK).json({
                data: [],
                page: {
                    totalCount,
                    limit,
                    page,
                },
            })
        }

        return res.status(HTTP_STATUS.OK).json({
            data: newObject,
            page: {
                totalCount: newObject.length,
                limit,
                page,
            },
        });

    } catch (error) {
        console.log("error reportUniformService", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
}