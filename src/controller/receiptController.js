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

        const schoolYearData = await SchoolYear.findOne({ active: true, schoolYear: schoolYear });
        const queryString = {
            active: { $eq: true },
            schoolYear: schoolYearData._id
        };

        const totalCount = await Receipt.countDocuments(queryString);
        const data = await Receipt.find(queryString, {
            receiptCode: 1,
            receiptName: 1,
            schoolYear: 1,
            month: 1,
            createdBy: 1,
            state: 1,
        })
            .skip(offset)
            .limit(limit);
        console.log("[Bthieu] ~ data:", data);

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
        console.log("error getListController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
}

exports.getRevenueController = async (req, res) => {
    try {
        const data = await Revenue.find({ active: { $eq: true } });
        return res.status(HTTP_STATUS.OK).json(data);
    } catch (error) {
        console.log("error getRevenueController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
}

exports.getByIdController = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await Receipt.findById(id)
            .populate('schoolYear')
            .populate('revenueList.revenue');

        if (!data) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy dữ liệu khoản thu" });
        }

        const newObject = {
            receiptCode: data.receiptCode,
            receiptName: data.receiptName,
            schoolYearId: data.schoolYear._id,
            schoolYear: data.schoolYear.schoolYear,
            month: data.month,
            totalAmount: data.totalAmount,
            state: data.state,
            revenueList: data.revenueList.map(item => ({
                revenue: item.revenue._id,
                revenueName: item.revenue.revenueName,
                amount: item.amount
            }))
        }
        return res.status(HTTP_STATUS.OK).json(newObject);
    } catch (error) {
        console.log("error getByIdController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
}


//Khi tích chọn isEnroll thì sẽ bỏ năm và state lưu receiptName là Học phí nhập học
exports.confirmReceiptController = async (req, res) => {
    try {
        const { id } = req.params;
        const receipt = await Receipt.findById(id);

        if (!receipt) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy phiếu thu" });
        }

        const schoolYearData = await SchoolYear.findOne({ active: true, state: "Đang hoạt động" });
        if (!schoolYearData) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy năm học đang hoạt động" });
        }
        const currentDate = new Date();


        if (receipt.isEnroll === false) {
            if (schoolYearData.serviceEndTime && currentDate < schoolYearData.serviceEndTime) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    message: `Chưa hết hạn đăng ký dịch vụ`
                });
            }
            const students = await Student.find({
                active: true,
                graduated: { $ne: true }
            });

            const results = [];
            for (const student of students) {
                const services = await Service.find({
                    student: student._id,
                    schoolYearId: receipt.schoolYear,
                    active: true
                });

                const totalServiceAmount = services.reduce((sum, s) => sum + (s.totalAmount || 0), 0);

                const totalAmount = receipt.totalAmount + totalServiceAmount;
                const parent = await Parent.find({ students: student._id, active: true });

                results.push({
                    receipt: receipt._id,
                    services: services[0]?._id,
                    studentId: student._id,
                    studentName: student.fullName,
                    tuitionName: receipt.receiptName,
                    month: receipt.month,
                    schoolYear: receipt.schoolYear,
                    totalAmount,
                    createdBy: receipt.createdBy,
                    state: 'Chưa thanh toán',
                    dadEmail: parent[0]?.email || null,
                    momEmail: parent[1]?.email || null,
                });
            }


            await Tuition.insertMany(results);

            receipt.state = "Đã xác nhận";
            await receipt.save();

            res.status(HTTP_STATUS.OK).json({
                message: "Tạo danh sách khoản thu thành công",
            });

            for (const item of results) {
                const { dadEmail, momEmail, studentName, month } = item;
                setImmediate(async () => {
                    try {
                        const htmlContent = `
                  <h2>Thông báo đóng học phí tháng ${month}</h2>
                  <p>Xin chào Quý phụ huynh của học sinh <strong>${studentName}</strong>,</p>
                  <p>Nhà trường xin thông báo học phí tháng ${month} của học sinh ${studentName}. Xin mời Anh/Chị truy cập hệ thống để xem thông tin </strong>.</p>
                  <br>
                  <p>Trân trọng,</p>
                  <p><strong>Ban Giám Hiệu Nhà Trường</strong></p>
                `;

                        const mail = new SMTP(SMTP_CONFIG);
                        await mail.send(
                            dadEmail,
                            momEmail,
                            "THÔNG BÁO ĐÓNG HỌC PHÍ",
                            htmlContent
                        );

                        console.log("✅ Đã gửi mail thành công");
                    } catch (mailErr) {
                        console.error("❌ Lỗi khi gửi mail:", mailErr);
                    }
                });
            }
        } else {
            receipt.state = "Đã xác nhận";
            await receipt.save();

            res.status(HTTP_STATUS.OK).json({
                message: "Tạo danh sách khoản thu thành công",
            });

        }
    } catch (error) {
        console.log("error confirmReceiptController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json({
            message: "Đã xảy ra lỗi khi xác nhận phiếu thu",
            error: error.message
        });
    }
};
