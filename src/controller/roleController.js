
const { Model } = require("mongoose");
const { HTTP_STATUS, RESPONSE_MESSAGE, USER_ROLES, VALIDATION_CONSTANTS } = require('../constants/useConstants');
const UserModel = require('../models/userModel');
const Role = require('../models/roleModel');
const Function = require('../models/functionModel');
const Module = require('../models/moduleModel');


exports.getListController = async (req, res) => {
    try {
        let { limit, page } = req.query;

        limit = parseInt(limit) || 30;
        page = parseInt(page) || 1;

        const offset = (page - 1) * limit;

        const queryString = {
            active: { $eq: true },
        };

        const totalCount = await Role.countDocuments(queryString);
        const data = await Role.find(queryString, {
            roleCode: 1,
            roleName: 1,
            createdBy: 1,
            updatedBy: 1,
        })
            .skip(offset)
            .limit(limit)
            .lean();

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
        console.log("Error getCurrentUser", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
}
exports.getDetailController = async (req, res) => {
    try {
        const data = await Role.findById(req.params.id);
        if (!data || data.length === 0) {
            return res.status(HTTP_STATUS.NOT_FOUND).json(RESPONSE_MESSAGE.NOT_FOUND);
        }
        return res.status(HTTP_STATUS.OK).json(data);
    } catch (error) {
        console.log("Error getCurrentUser", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
}

exports.getListFunctionController = async (req, res) => {
    try {
        let queryString = {
            active: { $eq: true },
        }
        const data = await Function.find(queryString, {
            functionCode: 1,
            functionName: 1
        })
        return res.status(HTTP_STATUS.OK).json(data);
    } catch (error) {
        console.log("Error getCurrentUser", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
}

exports.getListModuleController = async(req, res) => {
     try {
        let queryString = {
            active: { $eq: true },
        }
        const data = await Module.find(queryString, {
            moduleCode: 1,
            moduleName: 1
        })
        return res.status(HTTP_STATUS.OK).json(data);
    } catch (error) {
        console.log("Error getCurrentUser", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
}