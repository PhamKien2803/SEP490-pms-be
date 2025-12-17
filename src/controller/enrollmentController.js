const { Model } = require("mongoose");
const mongoose = require("mongoose");
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const { HTTP_STATUS, RESPONSE_MESSAGE, VALIDATION_CONSTANTS } = require('../constants/useConstants');
const { IMAP_CONFIG, SMTP_CONFIG } = require('../constants/mailConstants');
const { sequencePattern } = require('../helpers/useHelpers');
const { uploadBuffer } = require("../helpers/uploadImageHelper")
const { getGFS } = require("../configs/gridfs");
const i18n = require("../middlewares/i18n.middelware");
const Revenue = require("../models/revenueModel");
const TransactionHistory = require("../models/transactionHistoryModel");
const Enrollment = require("../models/enrollmentModel");
const Balance = require("../models/balanceModel");
const Student = require("../models/studentModel");
const Parent = require("../models/parentModel");
const SchoolYear = require("../models/schoolYearModel");
const User = require("../models/userModel");
const Role = require('../models/roleModel');
const Tuition = require('../models/tuitionModel');
const Service = require('../models/serviceModel');
const Receipt = require('../models/receiptModel')
const SMTP = require('../helpers/stmpHelper');
const IMAP = require('../helpers/iMapHelper');
const { emailQueue } = require('../configs/queue');



const getAge = async (dob) => {
    if (!dob) return null;
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();

    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
};

exports.registerEnrollController = async (req, res) => {
    try {
        const {
            studentIdCard,
            fatherIdCard,
            motherIdCard,
            fatherEmail,
            motherEmail,
            fatherPhoneNumber,
            motherPhoneNumber,
            isCheck,
            motherDob,
            fatherDob,
            nickName
        } = req.body;

        const date = new Date();
        const year = date.getFullYear();
        const nextYear = year + 1;

        // Lấy năm học hiện tại
        const dataSchoolYear = await SchoolYear.findOne({
            active: true,
            state: "Đang hoạt động",
        });

        if (!dataSchoolYear) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Nhà trường chưa có kế hoạch tuyển sinh"
            });
        }

        // Kiểm tra số lượng hồ sơ
        const countEnrollment = await Enrollment.countDocuments({
            schoolYear: dataSchoolYear._id,
            state: { $ne: "Chưa đủ điều kiện nhập học" }
        });

        if (countEnrollment >= dataSchoolYear.numberTarget) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Số lượng hồ sơ tuyển sinh đã đạt giới hạn"
            });
        }

        // Kiểm tra thời gian tuyển sinh
        const enrollmentStart = new Date(dataSchoolYear.enrollmentStartDate);
        const enrollmentEnd = new Date(dataSchoolYear.enrollmentEndDate);
        const enrollmentStartDate = enrollmentStart.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
        const enrollmentEndDate = enrollmentEnd.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

        if (date < enrollmentStart || date > enrollmentEnd) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: `Nhà trường đã kết thúc tuyển sinh (thời gian: ${enrollmentStartDate} - ${enrollmentEndDate})`
            });
        }

        // Kiểm tra tuổi cha/mẹ
        if (motherDob && fatherDob) {
            const motherAge = await getAge(motherDob);
            const fatherAge = await getAge(fatherDob);
            if (motherAge !== null && motherAge < 18) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    message: "Tuổi của mẹ phải lớn hơn hoặc bằng 18."
                });
            }
            if (fatherAge !== null && fatherAge < 18) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    message: "Tuổi của bố phải lớn hơn hoặc bằng 18."
                });
            }
        }

        // Hàm kiểm tra trùng giá trị
        const validateDuplicates = (values) => {
            const filtered = values.filter(Boolean);
            return new Set(filtered).size !== filtered.length;
        };

        // Kiểm tra CMND/CCCD trùng nhau
        if (validateDuplicates([studentIdCard, fatherIdCard, motherIdCard])) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Số CMND/CCCD của học sinh, cha và mẹ không được trùng nhau." });
        }

        // Kiểm tra thông tin cha mẹ khi không check dữ liệu sẵn có
        if (!isCheck) {
            // Email trùng nhau giữa cha/mẹ
            if (validateDuplicates([fatherEmail, motherEmail])) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Email của cha và mẹ không được trùng nhau." });
            }

            // SĐT trùng nhau giữa cha/mẹ
            if (validateDuplicates([fatherPhoneNumber, motherPhoneNumber])) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Số điện thoại của cha và mẹ không được trùng nhau." });
            }

            // Kiểm tra email đã tồn tại trong User
            const [checkDadEmail, checkMomEmail] = await Promise.all([
                User.findOne({ active: true, email: fatherEmail }),
                User.findOne({ active: true, email: motherEmail })
            ]);

            if (checkDadEmail) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Email của cha đã tồn tại" });
            }

            if (checkMomEmail) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Email của mẹ đã tồn tại" });
            }
        }

        // Tạo mã hồ sơ theo sequence
        const modelName = Enrollment.modelName.toLowerCase();
        const sequence = await sequencePattern(Enrollment.modelName);
        const lastRecord = await Enrollment.findOne({
            [`${modelName}Code`]: { $regex: `^${sequence}` },
        }).sort({ [`${modelName}Code`]: -1 }).lean();

        const nextNumber = lastRecord
            ? (parseInt(lastRecord[`${modelName}Code`].slice(-3)) + 1).toString().padStart(3, "0")
            : "001";
        const sequenceCode = `${sequence}${nextNumber}`;

        // Khởi tạo dữ liệu mới
        let newData = {
            active: true,
            [`${modelName}Code`]: sequenceCode,
            fatherGender: "Nam",
            motherGender: "Nữ",
            schoolYear: dataSchoolYear._id,
            ...req.body,
        };

        // Kiểm tra dữ liệu cha mẹ đã có sẵn
        if (isCheck === true) {
            const [dataCheckDad, dataCheckMom] = await Promise.all([
                Parent.findOne({ active: true, IDCard: fatherIdCard }),
                Parent.findOne({ active: true, IDCard: motherIdCard }),
            ]);

            if (!dataCheckDad) return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Không tìm thấy dữ liệu của cha" });
            if (!dataCheckMom) return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Không tìm thấy dữ liệu của mẹ" });

            const [dataCheckEmailDad, dataCheckEmailMom] = await Promise.all([
                User.findOne({ active: true, email: dataCheckDad.email }),
                User.findOne({ active: true, email: dataCheckMom.email }),
            ]);

            if (!dataCheckEmailDad) return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Email của cha không hợp lệ" });
            if (!dataCheckEmailMom) return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Email của mẹ không hợp lệ" });

            newData = {
                ...newData,
                fatherName: dataCheckDad.fullName,
                fatherPhoneNumber: dataCheckDad.phoneNumber,
                fatherEmail: dataCheckDad.email,
                fatherJob: dataCheckDad.job,
                motherName: dataCheckMom.fullName,
                motherPhoneNumber: dataCheckMom.phoneNumber,
                motherEmail: dataCheckMom.email,
                motherJob: dataCheckMom.job,
                motherDob: dataCheckMom.dob,
                fatherDob: dataCheckDad.dob,
            };
        }

        // Kiểm tra các trường required
        const schemaPaths = Enrollment.schema.paths;
        const uniqueFields = Object.keys(schemaPaths).filter(key => schemaPaths[key].options.unique);
        const requiredFields = isCheck
            ? ["studentIdCard", "fatherIdCard", "motherIdCard"]
            : Object.keys(schemaPaths).filter(key => schemaPaths[key].options.required);

        const missingFields = requiredFields.filter(field => !newData[field]?.toString().trim());
        if (missingFields.length > 0) {
            const messages = missingFields.map(field => i18n.t("messages.required", { field: i18n.t(`fields.${field}`) }));
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ messages: messages.join(", ") });
        }

        // Kiểm tra trùng unique fields
        for (const field of uniqueFields) {
            if (!newData[field]) continue;
            const exists = await Enrollment.exists({ [field]: newData[field] });
            if (exists) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    message: i18n.t("messages.alreadyExists", { field: i18n.t(`fields.${field}`) })
                });
            }
        }

        // Tạo hồ sơ
        const created = await Enrollment.create(newData);
        res.status(HTTP_STATUS.CREATED).json(created);

        // Gửi mail thông báo
        setImmediate(async () => {
            try {
                const htmlContent = `
                    <h2>Thông báo Hồ sơ Tuyển Sinh</h2>
                    <p>Xin chào Quý phụ huynh của học sinh <strong>${created.studentName}</strong>,</p>
                    <p>Nhà trường đã tiếp nhận hồ sơ tuyển sinh của học sinh. Hiện trạng hồ sơ đang <strong>đang xử lý</strong>.</p>
                    <p>Quý phụ huynh vui lòng đến trường từ ngày <strong>${enrollmentStartDate}</strong> đến ngày <strong>${enrollmentEndDate}</strong> để nộp giấy tờ cần thiết với mã đăng kí <strong>${created.enrollmentCode}</strong>.</p>
                    <p>Giấy tờ cần mang bao gồm: </p>
                    <p>+ Giấy khai sinh</p>
                    <p>+ Giấy khám sức khỏe</p>
                    <p>+ Hình ảnh chụp của bé</p>
                    <p>Ngoài ra, Quý phụ huynh có thể gửi thông tin giấy tờ đến email của trường theo cấu trúc: </p>
                    <p>Subject: HỒ SƠ NHẬP HỌC ${created.enrollmentCode}</p>
                    <p>+ Giaykhaisinh.pdf</p>
                    <p>+ Giaykhamsuckhoe.pdf</p>
                    <p>+ Ảnh học sinh </p>
                    <p>Trân trọng,</p>
                    <p><strong>Ban Giám Hiệu Nhà Trường</strong></p>
                `;

                const mail = new SMTP(SMTP_CONFIG);
                await mail.send(created.fatherEmail, created.motherEmail, "THÔNG BÁO TIẾP NHẬN HỒ SƠ TUYỂN SINH", htmlContent);
                console.log("Đã gửi mail thành công");
            } catch (mailErr) {
                console.error("Lỗi khi gửi mail:", mailErr);
            }
        });

    } catch (error) {
        console.error("Error registerEnrollController:", error);
        const status = error.status || HTTP_STATUS.SERVER_ERROR;
        const message = error.message || "Lỗi máy chủ";
        return res.status(status).json({ message });
    }
};


// nếu mà chuyển khoản tạo mới tài khoản add cho quyền parent portal 
// tạo mới tuition theo tháng hiện tại, và theo enrollementId
// chuyển khoản xong là sang trạng thái chờ BGH xác nhận 
// tiền mặt ấn nút đã thanh toán sang trạng thái chờ BGH xác nhận


exports.approvedEnrollController = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { _id, ...updateFields } = req.body;

        const enrollment = await Enrollment.findById(_id).session(session);
        if (!enrollment) {
            await session.abortTransaction();
            session.endSession();
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Đơn đăng kí nhập học không tồn tại" });
        }

        if (enrollment.state !== "Chờ xử lý") {
            await session.abortTransaction();
            session.endSession();
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Đơn đăng kí nhập học hết thời hạn xử lý" });
        }

        // Cập nhật trường
        Object.keys(updateFields).forEach(key => {
            enrollment[key] = updateFields[key];
        });

        const dataSave = await enrollment.save({ session });
        const statePayment = dataSave.statePayment
        // Tìm khoản thu nhập học
        const receiptData = await Receipt.findOne({
            schoolYear: dataSave.schoolYear,
            state: "Đã xác nhận",
            isEnroll: true
        }).session(session);

        if (!receiptData) {
            await session.abortTransaction();
            session.endSession();
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Chưa có khoản thu nhập học" });
        }

        // Tạo học phí
        const currentMonth = new Date().getMonth() + 1;
        const dataTuition = await Tuition.create([{
            tuitionName: `Nhập học ${enrollment.enrollmentCode}`,
            totalAmount: receiptData.totalAmount,
            month: currentMonth,
            receipt: receiptData._id,
            schoolYear: enrollment.schoolYear,
            enrollementId: enrollment._id,
            createdBy: enrollment.createdBy
        }], { session });

        // Xử lý tài khoản phụ huynh
        const modelParentName = Parent.modelName.toLowerCase();

        if (statePayment === "Chuyển khoản") {
            const role = await Role.findOne({ roleName: "Parent Portal" }).session(session);

            // Dad
            let dad = await Parent.findOne({ active: true, IDCard: dataSave.fatherIdCard }).session(session);
            if (!dad) {
                const seqDad = await processSequenceCode(Parent);
                dad = await Parent.create({
                    [`${modelParentName}Code`]: seqDad,
                    fullName: dataSave.fatherName,
                    phoneNumber: dataSave.fatherPhoneNumber,
                    email: dataSave.fatherEmail,
                    gender: dataSave.fatherGender,
                    IDCard: dataSave.fatherIdCard,
                    dob: dataSave.fatherDob,
                    job: dataSave.fatherJob,
                    isPreview: true,
                    active: true,
                })

                userDad = await User.create({
                    email: enrollment.fatherEmail,
                    password: "12345678",
                    roleList: [role._id],
                    active: true,
                    isPreview: true,
                    parent: dad._id
                });

            } else {
                userDad = await User.findOne({ parent: dad._id }).session(session);
            }

            // Mom
            let mom = await Parent.findOne({ active: true, IDCard: dataSave.motherIdCard }).session(session);
            if (!mom) {
                const seqMom = await processSequenceCode(Parent);
                mom = await Parent.create({
                    [`${modelParentName}Code`]: seqMom,
                    fullName: dataSave.motherName,
                    phoneNumber: dataSave.motherPhoneNumber,
                    email: dataSave.motherEmail,
                    gender: dataSave.motherGender,
                    IDCard: dataSave.motherIdCard,
                    dob: dataSave.motherDob,
                    job: dataSave.motherJob,
                    isPreview: true,
                    active: true,
                });

                userMom = await User.create({
                    email: enrollment.motherEmail,
                    password: "12345678",
                    roleList: [role._id],
                    active: true,
                    isPreview: true,
                    parent: mom._id
                });

            } else {
                userMom = await User.findOne({ parent: mom._id }).session(session);
            }
            setImmediate(async () => {
                try {
                    const htmlContent = `
                <h2>Thông báo Hồ sơ Tuyển Sinh</h2>
                <p>Xin chào Quý phụ huynh của học sinh <strong>${dataSave.studentName}</strong>,</p>
                <p>Nhà trường đã tiếp nhận hồ sơ tuyển sinh của học sinh. Hiện trạng hồ sơ <strong>đã tiếp nhận giấy tờ</strong>.</p>
                <br>
                <p>Quý phụ huynh vui lòng truy cập trang web để nộp học phí cho con với thông tin đăng nhập là: </p>

                <p>Tài khoản bố</p>
                <p>Email: ${dataSave.fatherEmail}</p>
                <p>Password: 12345678</p>
                <p>Tài khoản mẹ</p>
                <p>Email: ${dataSave.motherEmail}</p>
                <p>Password: 12345678</p>

                <p>Trân trọng,</p>
                <p><strong>Ban Giám Hiệu Nhà Trường</strong></p>
            `;

                    const mail = new SMTP(SMTP_CONFIG);
                    mail.send(
                        dataSave.fatherEmail,
                        dataSave.motherEmail,
                        'THÔNG BÁO XÉT TUYỂN HỒ SƠ TUYỂN SINH',
                        htmlContent,
                        '',
                        (err, info) => {
                            if (err) console.error("Lỗi khi gửi mail:", err);
                            else console.log("Đã gửi mail thành công");
                        }
                    );
                } catch (err) {
                    console.error("Lỗi khi gửi mail:", err);
                }
            });
        }

        enrollment.state = "Chờ thanh toán";
        await enrollment.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(HTTP_STATUS.OK).json({ message: "Phê duyệt thành công" });



    } catch (error) {
        console.error("Error approvedEnrollController:", error);
        await session.abortTransaction();
        session.endSession();
        return res.status(HTTP_STATUS.SERVER_ERROR).json({
            message: "Lỗi khi phê duyệt hồ sơ, đã rollback toàn bộ thay đổi.",
            error: error.message
        });
    }
};

exports.paymentEnrollmentController = async (req, res) => {
    try {
        const dataEnroll = await Enrollment.findById(req.params.id);
        if (!dataEnroll) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy hồ sơ nhập học" });
        }

        const dataTuition = await Tuition.findOne({
            state: "Chưa thanh toán",
            enrollementId: dataEnroll._id
        });
        if (!dataTuition) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy học phí cần thanh toán" });
        }

        let balance = await Balance.findOne();
        if (!balance) balance = await Balance.create({ currentBalance: 0 });

        const newBalance = balance.currentBalance + dataTuition.totalAmount;

        balance.currentBalance = newBalance;
        await balance.save();

        await TransactionHistory.create({
            type: "Tiền thu",
            amount: dataTuition.totalAmount,
            balanceBefore: balance.currentBalance - dataTuition.totalAmount,
            balanceAfter: newBalance,
            source: `Phụ huynh thanh toán nhập học ${dataEnroll.enrollmentCode}`,
            transactionCode: Date.now(),
            note: "Thanh toán học phí tiền mặt",
        });

        dataTuition.state = "Đã thanh toán";
        await dataTuition.save();

        dataEnroll.state = "Chờ BGH phê duyệt";
        await dataEnroll.save();

        return res.status(HTTP_STATUS.OK).json({ message: "Thanh toán thành công" });
    } catch (error) {
        console.error("Error paymentEnrollmentController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
};

exports.getByIdController = async (req, res) => {
    try {
        const gfs = getGFS();
        if (!gfs) {
            return res.status(500).json({ message: "GridFS chưa kết nối" });
        }
        let result1 = [];
        let totalAmount = 0;
        const data = await Enrollment.findById(req.params.id).lean();
        if (!data) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                message: "Không tìm thấy phiếu nhập học",
            });
        }
        const tuition = await Tuition.findOne({ enrollementId: data._id, state: "Chưa thanh toán" });

        let birthCertFiles = null;
        let healthCertFiles = null;

        if (data.birthCertId) {
            const birthFiles = await gfs.find({ _id: data.birthCertId }).toArray();
            birthCertFiles = birthFiles.length > 0 ? birthFiles[0] : null;
        }

        if (data.healthCertId) {
            const healthFiles = await gfs.find({ _id: data.healthCertId }).toArray();
            healthCertFiles = healthFiles.length > 0 ? healthFiles[0] : null;
        }

        if (data.state == "Chờ thanh toán") {
            const parent = await Parent.find({ IDCard: data.fatherIdCard }).lean();
            let students = parent.students || [];
            const tuitionFilter = {
                enrollementId: data._id,
                state: "Chưa thanh toán"
            };
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
            result1 = tuitions.map(tuition => {
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

            totalAmount = result1.reduce((sum, r) => {
                return sum + r.totalAmount;
            }, 0);
        }

        const result = {
            ...data,
            birthCertFiles,
            healthCertFiles,
            tuitionDetails: result1,
            totalAmountDue: totalAmount
        };



        return res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
        console.error("error getByIdController:", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json({
            message: "Lỗi máy chủ khi lấy thông tin phiếu nhập học",
            error: error.message,
        });
    }
};

exports.rejectEnrollController = async (req, res) => {
    try {
        const { reason } = req.body;
        if (!reason) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Lý do là bắt buộc" });
        }
        const data = await Enrollment.findById(req.params.id);
        data.state = "Chưa đủ điều kiện nhập học";
        data.reason = reason;

        await data.save();
        res.status(HTTP_STATUS.OK).json({ message: "Từ chối đơn nhập học thành công" });

        setImmediate(async () => {
            try {
                const htmlContent = `
                    <h2>Thông báo Kết Quả Tuyển Sinh</h2>
                    <p>Xin chào Quý phụ huynh của học sinh <strong>${data.studentName}</strong>,</p>
                    <p>Nhà trường trân trọng cảm ơn Quý phụ huynh đã quan tâm và gửi hồ sơ tuyển sinh cho học sinh.</p>
                    <p>Sau khi xem xét hồ sơ và kết quả tuyển sinh, rất tiếc chúng tôi xin thông báo rằng hồ sơ của học sinh <strong>không đủ điều kiện nhập học</strong>.</p>
                        <p>Với lý do là <strong>${reason}</strong>.</p>
                    <p>Nhà trường mong Quý phụ huynh và học sinh sẽ tiếp tục cố gắng, và hy vọng sẽ có cơ hội đồng hành cùng Quý vị trong những năm học tới.</p>
                    <br>
                    <p>Trân trọng,</p>
                    <p><strong>Ban Giám Hiệu Nhà Trường</strong></p>`;

                const mail = new SMTP(SMTP_CONFIG);
                mail.send(
                    data.fatherEmail,
                    data.motherEmail,
                    'THÔNG BÁO XÉT TUYỂN HỒ SƠ TUYỂN SINH',
                    htmlContent,
                    '',
                    (err, info) => {
                        if (err) {
                            console.error("Lỗi khi gửi mail:", err);
                            return;
                        }
                        console.log(`Đã gửi mail thành công`);
                    }
                );
            } catch (err) {
                console.error("Lỗi khi gửi mail:", err);
            }

        });
    } catch (error) {
        console.error("error getByIdController:", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json({
            message: "Lỗi máy chủ khi lấy thông tin phiếu nhập học",
            error: error.message,
        });
    }
}

const processSequenceCode = async (Model) => {
    const modelName = Model.modelName.toLowerCase();
    const sequence = await sequencePattern(Model.modelName);

    const lastRecord = await Model.find({
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
    return sequenceCode;
}

exports.approvedEnrollAllController = async (req, res) => {
    try {
        const pending = await Enrollment.find({ state: "Chờ BGH phê duyệt" });
        if (!pending.length) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                message: "Không có phiếu nào chờ phê duyệt",
            });
        }

        await Enrollment.updateMany(
            { state: "Chờ BGH phê duyệt" },
            { $set: { state: "Chờ xử lý tự động" } }
        );

        res.status(HTTP_STATUS.OK).json({
            message: "Đang xử lý tuyển sinh",
        });

        setImmediate(async () => {
            try {
                const roleParent = await Role.findOne({ roleName: "Phụ huynh" });
                const mail = new SMTP(SMTP_CONFIG);
                const modelStudentName = Student.modelName.toLowerCase();
                const modelParentName = Parent.modelName.toLowerCase();

                for (const data of pending) {
                    try {
                        const {
                            studentName, studentDob, studentGender, studentIdCard,
                            studentNation, studentReligion, address, birthCertId, healthCertId, nickname,
                            fatherName, fatherGender, fatherPhoneNumber, fatherEmail, fatherIdCard, fatherJob, fatherDob,
                            motherName, motherGender, motherPhoneNumber, motherEmail, motherIdCard, motherJob, motherDob,
                            imageStudent


                        } = data;

                        /** --- Tạo học sinh mới --- **/
                        const sequenceCodeStudent = await processSequenceCode(Student);
                        const newStudent = await Student.create({
                            [`${modelStudentName}Code`]: sequenceCodeStudent,
                            fullName: studentName,
                            dob: studentDob,
                            nickname: nickname,
                            gender: studentGender,
                            idCard: studentIdCard,
                            nation: studentNation,
                            religion: studentReligion,
                            active: true,
                            imageStudent: imageStudent,
                            address,
                            createdBy: "Hệ thống",
                            updatedBy: "Hệ thống",
                            birthCertId,
                            healthCertId
                        });

                        /** --- Xử lý cha & mẹ --- **/
                        const parents = [
                            {
                                type: "father",
                                name: fatherName,
                                gender: fatherGender,
                                phone: fatherPhoneNumber,
                                email: fatherEmail,
                                idCard: fatherIdCard,
                                dob: fatherDob,
                                job: fatherJob
                            },
                            {
                                type: "mother",
                                name: motherName,
                                gender: motherGender,
                                phone: motherPhoneNumber,
                                email: motherEmail,
                                dob: motherDob,
                                idCard: motherIdCard,
                                job: motherJob
                            }
                        ];

                        let fatherCreated = false;
                        let motherCreated = false;

                        for (const p of parents) {
                            if (!p.idCard) continue;
                            let parent = await Parent.findOne({ active: true, IDCard: p.idCard });

                            if (!parent) {
                                // tạo mới phụ huynh
                                const seqCode = await processSequenceCode(Parent);
                                parent = await Parent.create({
                                    [`${modelParentName}Code`]: seqCode,
                                    fullName: p.name,
                                    gender: p.gender,
                                    phoneNumber: p.phone,
                                    email: p.email,
                                    IDCard: p.idCard,
                                    dob: p.dob,
                                    job: p.job,
                                    active: true,
                                    students: [newStudent._id]
                                });

                                await User.create({
                                    email: p.email,
                                    password: "12345678",
                                    roleList: [roleParent._id],
                                    active: true,
                                    parent: parent._id
                                });

                                if (p.type === "father") fatherCreated = true;
                                else motherCreated = true;
                            } else {
                                // thêm học sinh nếu chưa có
                                if (!parent.students.includes(newStudent._id)) {
                                    parent.students.push(newStudent._id);
                                    await parent.save();
                                }
                                // reset quyền về phụ huynh
                                const parentUser = await User.findOne({ parent: parent._id });
                                if (parentUser) {
                                    parentUser.isPreview = false,
                                        parentUser.roleList = [roleParent._id];
                                    await parentUser.save();
                                }
                            }
                        }

                        let htmlContent = `
                            <h2>Thông báo Hồ sơ Tuyển Sinh</h2>
                            <p>Xin chào Quý phụ huynh của học sinh <strong>${studentName}</strong>,</p>
                            <p>Học sinh <strong>${studentName}</strong> với mã <strong>${newStudent[`${modelStudentName}Code`]}</strong> đã <strong>trúng tuyển</strong>.</p>
                        `;

                        if (fatherCreated || motherCreated) {
                            htmlContent += `
                                <p>Tài khoản phụ huynh mới được tạo:</p>
                                <ul>
                                    ${fatherCreated
                                    ? `<li>Email: ${fatherEmail} | Mật khẩu: 12345678</li>`
                                    : `<li>Email: ${fatherEmail}</li>`}
                                    ${motherCreated
                                    ? `<li>Email: ${motherEmail} | Mật khẩu: 12345678</li>`
                                    : `<li>Email: ${motherEmail}</li>`}
                                </ul>
                            `;
                        } else {
                            htmlContent += `<p>Hồ sơ nhập học của học sinh đã được duyệt thành công.</p>`;
                        }

                        htmlContent += `<p><strong>Ban Giám Hiệu Nhà Trường</strong></p>`;

                        try {
                            await mail.send(
                                fatherEmail,
                                motherEmail,
                                "THÔNG BÁO TRÚNG TUYỂN NHẬP HỌC",
                                htmlContent,
                                "",
                                () => console.log(`Mail gửi thành công đến: ${fatherEmail} (cc: ${motherEmail})`)
                            );
                        } catch (err) {
                            console.error(`Lỗi gửi mail cho ${fatherEmail}:`, err);
                        }

                        data.state = "Hoàn thành";
                        await data.save();

                    } catch (err) {
                        console.error("Lỗi khi xử lý hồ sơ:", err);
                    }
                }
            } catch (err) {
                console.error("Lỗi trong tiến trình ngầm:", err);
            }
        });

    } catch (error) {
        console.error("error approvedEnrollAllController:", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json({
            message: "Lỗi máy chủ khi phê duyệt phiếu nhập học",
            error: error.message,
        });
    }
};

exports.uploadImageController = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Không có file được gửi lên' });
        }

        const buffer = req.file.buffer;
        const contentType = req.file.mimetype;

        const url = await uploadBuffer(buffer, contentType);

        return res.status(HTTP_STATUS.OK).json({
            message: 'Upload thành công',
            url
        });
    } catch (err) {
        console.error(err);
        return res.status(HTTP_STATUS.SERVER_ERROR).json({ message: 'Upload thất bại', error: err.message });
    }
}