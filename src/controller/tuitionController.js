const { Model } = require("mongoose");
const { PayOS } = require("@payos/node");
const { HTTP_STATUS, RESPONSE_MESSAGE, USER_ROLES, VALIDATION_CONSTANTS } = require('../constants/useConstants');
const SchoolYear = require("../models/schoolYearModel");
const Parent = require("../models/parentModel");
const Tuition = require("../models/tuitionModel");
const Receipt = require("../models/receiptModel");
const Service = require("../models/serviceModel");
const Student = require("../models/studentModel");
const Balance = require("../models/balanceModel");
const Enrollment = require("../models/enrollmentModel");
const TransactionHistory = require("../models/transactionHistoryModel");
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

        const parent = await Parent.findById(parentId).lean();
        if (!parent) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Không tìm thấy phụ huynh" });
        }

        // Xác định danh sách students hoặc enrollmentId dựa trên isPreview
        let tuitionFilter = { state: "Chưa thanh toán" };
        let students = parent.students || [];

        if (!parent.isPreview) {
            tuitionFilter.studentId = { $in: students };
        } else {
            let enrollment;
            if (parent.gender === "Nam") {
                enrollment = await Enrollment.findOne({
                    state: "Chờ thanh toán",
                    fatherIdCard: parent.IDCard
                }).lean();
            } else {
                enrollment = await Enrollment.findOne({
                    state: "Chờ thanh toán",
                    motherIdCard: parent.IDCard
                }).lean();
            }

            if (!enrollment) {
                return res.status(HTTP_STATUS.OK).json({
                    message: "Không có học phí đang chờ thanh toán",
                    data: [],
                    totalAmount: 0
                });
            }

            tuitionFilter.enrollementId = enrollment._id;
        }

        // Lấy dữ liệu học phí
        const tuitions = await Tuition.find(tuitionFilter)
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

        // Lấy dữ liệu dịch vụ
        const services = await Service.find({
            student: { $in: students },
            active: true,
        })
            .populate("revenue")
            .lean();

        // Map dữ liệu học phí + dịch vụ
        const result = tuitions.map(tuition => {
            const tuitionRevenueList = tuition.receipt?.revenueList?.map(r => ({
                revenueId: r.revenue?._id,
                revenueCode: r.revenue?.revenueCode,
                revenueName: r.revenue?.revenueName,
                amount: r.amount,
                source: "Tuition"
            })) || [];

            const serviceRevenueList = services
                .filter(s => s.student.toString() === tuition.studentId?._id.toString())
                .map(s => ({
                    revenueId: s.revenue?._id,
                    revenueCode: s.revenue?.revenueCode,
                    revenueName: s.revenue?.revenueName,
                    amount: s.totalAmount,
                    qty: s.qty,
                    source: "Service"
                }));

            return {
                tuitionId: tuition._id,
                tuitionName: tuition.tuitionName,
                month: tuition.month,
                totalAmount: tuition.totalAmount + serviceRevenueList.reduce((sum, s) => sum + s.amount, 0),
                state: tuition.state,
                studentId: tuition.studentId?._id,
                studentName: tuition.studentId?.fullName,
                schoolYear: tuition.schoolYear?.schoolYear,
                receiptCode: tuition.receipt?.receiptCode,
                receiptName: tuition.receipt?.receiptName,
                createdBy: tuition.createdBy,
                createdAt: tuition.createdAt,
                enrollementId: tuition?.enrollementId,
                revenueList: [...tuitionRevenueList, ...serviceRevenueList]
            };
        });

        const totalAmount = result.reduce((sum, r) => sum + r.totalAmount, 0);

        return res.status(HTTP_STATUS.OK).json({
            message: "Lấy chi tiết học phí thành công",
            data: result,
            totalAmount
        });

    } catch (error) {
        console.error("error getDetailTuitionController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json({
            message: "Lỗi server khi lấy chi tiết học phí",
            error: error.message
        });
    }
};


exports.createTuitionPayment = async (req, res) => {
    try {
        const { parentId, totalAmount, enrollementId } = req.body;
        let paymentData;
        let tuitions;
        const transactionCode = Date.now();
        if (enrollementId) {
            const enrollmentData = await Enrollment.findById(enrollementId);
            console.log("[Bthieu] ~ enrollmentData:", enrollmentData);
            
            tuitions = await Tuition.find({
                enrollementId: enrollementId,
                state: "Chưa thanh toán",
            });
            console.log("")
            if (tuitions.length === 0) {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    message: "Không có học phí nào cần thanh toán",
                });
            }
            paymentData = {
                orderCode: transactionCode,
                amount: totalAmount,
                description: `HOCPHI${enrollmentData.enrollmentCode}`,
                cancelUrl: process.env.PAYOS_CANCEL_URL,
                returnUrl: process.env.PAYOS_RETURN_URL,
            }; 
        } else {
            const parent = await Parent.findById(parentId);
            if (!parent) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    success: false,
                    message: "Không tìm thấy phụ huynh",
                });
            }
            const studentIds = parent.students;
            tuitions = await Tuition.find({
                studentId: { $in: studentIds },
                state: "Chưa thanh toán",
            });

            if (tuitions.length === 0) {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    message: "Không có học phí nào cần thanh toán",
                });
            }
            paymentData = {
                orderCode: transactionCode,
                amount: totalAmount,
                description: `HOCPHI${parent.parentCode}`,
                cancelUrl: process.env.PAYOS_CANCEL_URL,
                returnUrl: process.env.PAYOS_RETURN_URL,
            };
        }

        const paymentLinkResponse = await payos.paymentRequests.create(paymentData);

        const tuitionIds = tuitions.map(t => t._id);
        await Tuition.updateMany(
            { _id: { $in: tuitionIds } },
            { $set: { orderCode: transactionCode } }
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
            return res
                .status(HTTP_STATUS.BAD_REQUEST)
                .json({ success: false, message: "Lỗi ký số" });
        }

        const orderCode = webhookData.data.orderCode;
        const statusCode = webhookData.data.code;
        const success = webhookData.success || statusCode === "00";

        const tuitions = await Tuition.find({ orderCode: Number(orderCode) });
        if (!tuitions || tuitions.length === 0) {
            console.log(`[Webhook] Không tìm thấy phiếu thu với orderCode: ${orderCode}`);
            return res.json({ success: true });
        }

        if (success) {
            const result = await Tuition.updateMany(
                { orderCode: Number(orderCode) },
                {
                    state: "Đã thanh toán",
                    paidAt: new Date(),
                    payosData: webhookData,
                }
            );
            console.log(`Đã cập nhật ${result.modifiedCount} phiếu thu thành "Đã thanh toán"`);

            const totalAmount = tuitions.reduce((sum, t) => sum + t.totalAmount, 0);

            let balance = await Balance.findOne();
            if (!balance) balance = await Balance.create({ currentBalance: 0 });

            const newBalance = balance.currentBalance + totalAmount;

            await TransactionHistory.create({
                type: "Tiền thu",
                amount: totalAmount,
                balanceBefore: balance.currentBalance,
                balanceAfter: newBalance,
                source: `Phụ huynh thanh toán học phí (${orderCode})`,
                transactionCode: orderCode.toString(),
                note: "Thanh toán học phí qua PayOS",
            });

            balance.currentBalance = newBalance;
            balance.lastUpdated = new Date();
            await balance.save();

            console.log(`[Webhook] Đã ghi nhận giao dịch +${totalAmount} VND`);

            const enrollmentIds = tuitions
                .filter(t => t.enrollementId)
                .map(t => t.enrollementId);

            if (enrollmentIds.length > 0) {
                await Enrollment.updateMany(
                    { _id: { $in: enrollmentIds } },
                    { state: "Chờ BGH phê duyệt" }
                );
            }

        } else if (statusCode === "01") {
            await Tuition.updateMany(
                { orderCode: Number(orderCode) },
                { state: "Chưa thanh toán", payosData: webhookData }
            );
            console.log(`[Webhook] Hủy giao dịch ${orderCode}`);
        } else {
            await Tuition.updateMany(
                { orderCode: Number(orderCode) },
                { state: "Thanh toán lỗi", payosData: webhookData }
            );
            console.log(`[Webhook] Giao dịch ${orderCode} lỗi`);
        }

        return res.json({ success: true });
    } catch (error) {
        console.error("Webhook error:", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json({ success: false });
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

exports.getHistoryFeeController = async (req, res) => {
    try {
        const { parentId, schoolYear } = req.query;

        const dataParent = await Parent.findById(parentId);
        if (!dataParent) {
            return res
                .status(HTTP_STATUS.BAD_REQUEST)
                .json("Không tìm thấy phụ huynh");
        }

        const students = dataParent.students;

        const dataSchoolYear = await SchoolYear.findOne({
            schoolYear: schoolYear,
            state: "Đang hoạt động"
        })
        if (!dataSchoolYear) {
            return res
                .status(HTTP_STATUS.BAD_REQUEST)
                .json("Không tìm thấy thông tin năm học");
        }
        const dataTuition = await Tuition.find({
            studentId: { $in: students },
            schoolYear: dataSchoolYear._id
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
            message: "Lấy lịch sử học phí thành công",
            data: result,
            totalAmount: totalAmount
        });
    } catch (error) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Lỗi server" });
    }
}

exports.getBalanceDetailController = async (req, res) => {
    try {
        const dataBalance = await Balance.findOne();

        const dataTransactionHistory = await TransactionHistory.find()
            .sort({ createdAt: -1 })
            .limit(20);

        const object = {
            currentBalance: dataBalance.currentBalance,
            transactions: dataTransactionHistory
        }
        return res.status(HTTP_STATUS.OK).json(object);

    } catch (error) {
        console.log("Error getBalanceDetailController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json({ success: false, error });
    }
};

