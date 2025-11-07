const { Model } = require("mongoose");
const { PayOS } = require("@payos/node");
const { HTTP_STATUS, RESPONSE_MESSAGE, USER_ROLES, VALIDATION_CONSTANTS } = require('../constants/useConstants');
const SchoolYear = require("../models/schoolYearModel");
const Parent = require("../models/parentModel");
const Tuition = require("../models/tuitionModel");
const Receipt = require("../models/receiptModel");
const Service = require("../models/serviceModel");
const Student = require("../models/studentModel");
const dotenv = require("dotenv");
dotenv.config();

const payos = new PayOS({
    clientId: process.env.CLIENT_ID,
    apiKey: process.env.API_KEY,
    checksumKey: process.env.CHECKSUM_KEY,
});

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

exports.getDetailTuitionController = async (req, res) => {
    try {
        const { parentId } = req.params;

        const dataParent = await Parent.findById(parentId);
        if (!dataParent) {
            return res
                .status(HTTP_STATUS.BAD_REQUEST)
                .json("Không tìm thấy phụ huynh");
        }

        const students = dataParent.students;

        const dataTuition = await Tuition.find({
            studentId: { $in: students },
            state: "Chưa thanh toán",
        })
            .populate({
                path: "receipt",
                populate: {
                    path: "revenueList.revenue",
                    model: "Revenue",
                },
            })
            .populate("schoolYear")
            .populate("studentId")
            .lean();

        const dataService = await Service.find({
            student: { $in: students },
            active: true,
        })
            .populate("revenue")
            .lean();

        const result = dataTuition.map((item) => {
            const tuitionRevenueList =
                item.receipt?.revenueList?.map((r) => ({
                    revenueId: r.revenue?._id,
                    revenueCode: r.revenue?.revenueCode,
                    revenueName: r.revenue?.revenueName,
                    amount: r.amount,
                    source: "Tuition",
                })) || [];

            const studentServices = dataService.filter(
                (sv) => sv.student.toString() === item.studentId.toString()
            );

            const serviceRevenueList = studentServices.map((sv) => ({
                revenueId: sv.revenue?._id,
                revenueCode: sv.revenue?.revenueCode,
                revenueName: sv.revenue?.revenueName,
                amount: sv.totalAmount,
                qty: sv.qty,
                source: "Service",
            }));

            return {
                tuitionId: item._id,
                tuitionName: item.tuitionName,
                month: item.month,
                totalAmount:
                    item.totalAmount +
                    serviceRevenueList.reduce((sum, s) => sum + s.amount, 0),
                state: item.state,
                studentId: item.studentId?._id,
                studentName: item.studentId?.fullName,
                schoolYear: item.schoolYear?.schoolYear,
                receiptCode: item.receipt?.receiptCode,
                receiptName: item.receipt?.receiptName,
                createdBy: item.createdBy,
                createdAt: item.createdAt,
                revenueList: [...tuitionRevenueList, ...serviceRevenueList],
            };
        });

        const totalAmount = result.reduce((sum, s) => sum + s.totalAmount, 0);
        return res.status(HTTP_STATUS.OK).json({
            message: "Lấy chi tiết học phí thành công",
            data: result,
            totalAmount: totalAmount
        });
    } catch (error) {
        console.log("error getDetailTuitionController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
};

exports.createTuitionPayment = async (req, res) => {
    try {
        const { parentId, totalAmount } = req.body;

        const parent = await Parent.findById(parentId);
        if (!parent) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: "Không tìm thấy phụ huynh",
            });
        }
        const studentIds = parent.students;
        const transactionCode = Date.now();
        const tuitions = await Tuition.find({
            studentId: { $in: studentIds },
            state: "Chưa thanh toán",
        });

        if (tuitions.length === 0) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                message: "Không có học phí nào cần thanh toán",
            });
        }

        const paymentData = {
            orderCode: transactionCode,
            amount: totalAmount,
            description: `HOCPHI${parent.parentCode}`,
            cancelUrl: process.env.PAYOS_CANCEL_URL,
            returnUrl: process.env.PAYOS_RETURN_URL,
        };

        const paymentLinkResponse = await payos.paymentRequests.create(paymentData);

        const tuitionIds = tuitions.map(t => t._id);
        await Tuition.updateMany(
            { _id: { $in: tuitionIds } },
            { $set: { orderCode: transactionCode, state: "Đang xử lý" } }
        );

        return res.status(HTTP_STATUS.OK).json({
            success: true,
            message: "Tạo link thanh toán thành công",
            data: {
                paymentUrl: paymentLinkResponse.checkoutUrl,
                transactionCode,
                qrCode: paymentLinkResponse.qrCode,
            },
        });
    } catch (error) {
        console.error("error createTuitionPayment", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
};


exports.handlePayOSWebhook = async (req, res) => {
    try {
        const webhookData = req.body;

        const isValid = await payos.webhooks.verify(webhookData);
        if (!isValid) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Lỗi ký số" });
        }

        const orderCode = webhookData.data.orderCode;
        const success = webhookData.success || webhookData.data.code === "00";

        if (success) {
            const result = await Tuition.updateMany(
                { orderCode: Number(orderCode) },
                {
                    state: "Đã thanh toán",
                    paidAt: new Date(),
                    payosData: webhookData,
                }
            );

            console.log(`Đã cập nhật ${result.modifiedCount} bản ghi thành "Đã thanh toán"`);
        } else {
            await Tuition.updateMany(
                { orderCode: Number(orderCode) },
                { state: "Thanh toán lỗi", payosData: webhookData }
            );
        }

        return res.json({ success: true });
    } catch (error) {
        console.error("Webhook error:", error);
        return res.status(500).json({ success: false });
    }
};

exports.checkTuitionPaymentStatus = async (req, res) => {
    try {
        const { orderCode } = req.params;
        const tuition = await Tuition.findOne({ orderCode: Number(orderCode) });

        if (!tuition) {
            return res.status(200).json({ success: false, message: "Không tìm thấy học phí" });
        }

        const status = tuition.state === "Đã thanh toán" ? "PAID" : "PENDING";

        return res.json({
            success: true,
            status,
            message: `Trạng thái: ${status}`,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Lỗi server" });
    }
};