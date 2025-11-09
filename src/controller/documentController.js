const { Model } = require("mongoose");
const { HTTP_STATUS, RESPONSE_MESSAGE, USER_ROLES, VALIDATION_CONSTANTS } = require('../constants/useConstants');
const SchoolYear = require("../models/schoolYearModel");
const Document = require("../models/documentModel");
const Balance = require("../models/balanceModel");
const TransactionHistory = require("../models/transactionHistoryModel");
const { sequencePattern } = require('../helpers/useHelpers');

exports.getListController = async (req, res) => {
    try {
        let { limit, page, schoolYear } = req.query;

        limit = parseInt(limit) || 30;
        page = parseInt(page) || 1;

        const offset = (page - 1) * limit;
        if (!schoolYear) {
            return res.status(HTTP_STATUS.OK).json({
                data: [],
                page: {
                    totalCount: 0,
                    limit,
                    page,
                }
            })
        }
        const schoolYearData = await SchoolYear.findOne({
            schoolYear: schoolYear,
            state: "Đang hoạt động"
        })
        const queryString = {
            active: { $eq: true },
            schoolYear: schoolYearData._id
        };

        const totalCount = await Document.countDocuments(queryString);

        const data = await Document.find(queryString)
            .skip(offset)
            .limit(limit);

        if (!data || data.length === 0) {
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
            data,
            page: {
                totalCount,
                limit,
                page,
            },
        });
    } catch (error) {
        console.log("Error getListController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
}

exports.createController = async (req, res) => {
    try {
        const modelName = Document.modelName.toLowerCase();
        const sequence = await sequencePattern(Document.modelName);

        const lastRecord = await Document.find({
            [`${modelName}Code`]: { $regex: `^${sequence}` }
        })
            .sort({ [`${modelName}Code`]: -1 })
            .limit(1);

        let sequenceCode;
        if (lastRecord.length === 0) {
            sequenceCode = `${sequence}001`;
        } else {
            const lastCode = lastRecord[0][`${modelName}Code`];
            const lastNumber = parseInt(lastCode.slice(-3));
            const nextNumber = (lastNumber + 1).toString().padStart(3, "0");
            sequenceCode = `${sequence}${nextNumber}`;
        }

        const schoolYearData = await SchoolYear.findOne({
            active: true,
            state: "Đang hoạt động"
        });

        const newData = {
            active: true,
            [`${modelName}Code`]: sequenceCode,
            schoolYear: schoolYearData._id,
            ...req.body
        };

        const uniqueFields = Object.keys(Document.schema.paths).filter(
            (key) => Document.schema.paths[key].options.unique
        );

        const requiredFields = Object.keys(Document.schema.paths).filter(
            (key) => Document.schema.paths[key].options.required
        );

        const missingFields = requiredFields.filter(
            (field) => newData[field] === undefined || newData[field] === ""
        );

        if (missingFields.length > 0) {
            const messages = missingFields.map((field) => {
                const fieldLabel = i18n.t(`fields.${field}`);
                return i18n.t("messages.required", { field: fieldLabel });
            });
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: messages.join(", ") });
        }

        for (const field of uniqueFields) {
            if (!newData[field]) continue;

            const exists = await Document.findOne({ [field]: newData[field] });
            if (exists) {
                const fieldLabel = i18n.t(`fields.${field}`);
                const message = i18n.t("messages.alreadyExists", { field: fieldLabel });
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ message });
            }
        }
        const created = await Document.create(newData);

        return res.status(HTTP_STATUS.CREATED).json(created);
    } catch (error) {
        console.log("Error createController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
}

exports.getByIdController = async (req, res) => {
    try {
        const dataDocument = await Document.findById(req.params.id);
        if (!dataDocument) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                message: "Không tìm thấy dữ liệu chứng từ"
            })
        }
        const schoolYear = await SchoolYear.findById(dataDocument.schoolYear);
        if (!schoolYear) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                message: "Không tìm thấy dữ liệu năm học"
            })
        }
        const newObject = {
            ...dataDocument.toObject(),
            schoolYear: schoolYear.schoolYear
        }
        return res.status(HTTP_STATUS.OK).json(newObject);
    } catch (error) {
        console.log("Error getByIdController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
}


exports.confirmPaymentController = async (req, res) => {
    try {
        const documentId = req.params.id;

        const document = await Document.findById(documentId);
        if (!document) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                success: false,
                message: "Không tìm thấy dữ liệu chứng từ"
            });
        }

        if (document.status === "Đã thanh toán") {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: "Chứng từ này đã được thanh toán"
            });
        }

        const balance = await Balance.findOne();
        if (!balance) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                success: false,
                message: "Không tìm thấy dữ liệu số dư"
            });
        }

        if (balance.currentBalance < document.amount) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: "Số dư không đủ để thanh toán phiếu chi này"
            });
        }

        const balanceBefore = balance.currentBalance;
        const balanceAfter = balanceBefore - document.amount;
        balance.currentBalance = balanceAfter;
        await balance.save();

        const transactionCode = "TC" + Date.now();
        await TransactionHistory.create({
            type: "Tiền chi",
            amount: document.amount,
            balanceBefore,
            balanceAfter,
            source: `${document.documentName}`,
            transactionCode,
            note: document.reason,
            createdBy: document.createdBy || "system"
        });

        document.status = "Đã thanh toán";
        await document.save();

        return res.status(HTTP_STATUS.OK).json({
            success: true,
            message: "Xác nhận phiếu chi và cập nhật số dư thành công",
            data: {
                document,
                balanceAfter
            }
        });

    } catch (error) {
        console.log("Error confirmPaymentController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
};
