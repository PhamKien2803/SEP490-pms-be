const { Model } = require("mongoose");
const { HTTP_STATUS, RESPONSE_MESSAGE, USER_ROLES, VALIDATION_CONSTANTS } = require('../constants/useConstants');
const { sequencePattern } = require('../helpers/useHelpers');
const { SEQUENCE_CODE } = require('../constants/useConstants');
const i18n = require("../middlewares/i18n.middelware");
const SchoolYear = require("../models/schoolYearModel");

exports.getByIdController = async (req, res) => {
    try {
        const dataSchoolYear = await SchoolYear.findById(req.params.id);
        if (!dataSchoolYear) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy dữ liệu năm học" });
        }
        return res.status(HTTP_STATUS.OK).json(dataSchoolYear);
    } catch (error) {
        console.log("Error getByIdController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
}

exports.confirmSchoolYearController = async (req, res) => {
    try {
        const data = await SchoolYear.findById(req.params.id);
        if (!data) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy dữ liệu năm học" });
        }
        data.state = "Đang hoạt động";
        data.save();

        return res.status(HTTP_STATUS.OK).json("Đã chuyển trạng thái thành công");
    } catch (error) {
        console.log("Error confirmSchoolYearController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
}