
const { Model } = require("mongoose");
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const { HTTP_STATUS, RESPONSE_MESSAGE, USER_ROLES, VALIDATION_CONSTANTS } = require('../constants/useConstants');
const { IMAP_CONFIG, SMTP_CONFIG } = require('../constants/mailConstants');
const { sequencePattern } = require('../helpers/useHelpers');
const i18n = require("../middlewares/i18n.middelware");
const Enrollment = require("../models/enrollmentModel");
const SMTP = require('../helpers/stmpHelper');
const IMAP = require('../helpers/iMapHelper');

exports.registerEnrollController = async (req, res) => {
    try {
        const modelName = Enrollment.modelName.toLowerCase();
        const sequence = await sequencePattern(Enrollment.modelName);

        const lastRecord = await Enrollment.find({
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

        const newData = {
            active: true,
            [`${modelName}Code`]: sequenceCode,
            fatherGender: "Nam",
            motherGender: "Nữ",
            ...req.body
        };

        const uniqueFields = Object.keys(Enrollment.schema.paths).filter(
            (key) => Enrollment.schema.paths[key].options.unique
        );

        const requiredFields = Object.keys(Enrollment.schema.paths).filter(
            (key) => Enrollment.schema.paths[key].options.required
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

            const exists = await Enrollment.findOne({ [field]: newData[field] });
            if (exists) {
                const fieldLabel = i18n.t(`fields.${field}`);
                const message = i18n.t("messages.alreadyExists", { field: fieldLabel });
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ message });
            }
        }

        const created = await Enrollment.create(newData);
        res.status(HTTP_STATUS.CREATED).json(created);

        setImmediate(async () => {
            // const templatePath = path.join(__dirname, '..', 'templates', 'newAccountMail.ejs');
            // const htmlConfirm = await ejs.renderFile(templatePath);
            const htmlContent = `
      <h2>Thông báo Hồ sơ Tuyển Sinh</h2>
      <p>Xin chào Quý phụ huynh của học sinh <strong>${created.studentName}</strong>,</p>
      <p>Nhà trường đã tiếp nhận hồ sơ tuyển sinh của học sinh. Hiện trạng hồ sơ đang <strong>đang xử lý</strong>.</p>
      <p>Quý phụ huynh vui lòng đến trường vào ngày <strong>16/10/2025</strong> để nộp giấy tờ cần thiết.</p>
      <br>
      <p>Trân trọng,</p>
      <p><strong>Ban Giám Hiệu Nhà Trường</strong></p>
    `;
            const mail = new SMTP(SMTP_CONFIG);
            mail.send(
                created.fatherEmail,
                created.motherEmail,
                'THÔNG BÁO TIẾP NHẬN HỒ SƠ TUYỂN SINH',
                htmlContent,
                '',
                (err, info) => {
                    if (err) {
                        console.error("❌ Lỗi khi gửi mail:", err);
                        return res.status(500).send("Gửi mail thất bại.");
                    }
                    console.log(`✅ Đã gửi mail thành công: `);
                }
            );

        });
    } catch (error) {
        console.log("Error registerEnrollController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error)
    }
}

exports.aprrovedEnrollController = async (req, res) => {
    try {
        const { _id, birthCertId, heathCertId, approvedBy } = req.body;
        const data = await Enrollment.findById(_id);
        console.log("🚀 ~ data:", data);
        if (!data) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Enrollment không tồn tại" });
        }
        data.birthCertId = birthCertId;
        data.heathCertId = heathCertId;
        data.approvedBy = approvedBy;
        data.state = "Chờ BGH phê duyệt";

        await data.save();
        res.status(HTTP_STATUS.OK).json({ message: "Phê duyệt thành công" });

        setImmediate(async () => {
            // const templatePath = path.join(__dirname, '..', 'templates', 'newAccountMail.ejs');
            // const htmlConfirm = await ejs.renderFile(templatePath);
            const htmlContent = `
      <h2>Thông báo Hồ sơ Tuyển Sinh</h2>
      <p>Xin chào Quý phụ huynh của học sinh <strong>${data.studentName}</strong>,</p>
      <p>Nhà trường đã tiếp nhận hồ sơ tuyển sinh của học sinh. Hiện trạng hồ sơ <strong>đã tiếp nhận giấy tờ</strong>.</p>
      <br>
      <p>Trân trọng,</p>
      <p><strong>Ban Giám Hiệu Nhà Trường</strong></p>
    `;
            const mail = new SMTP(SMTP_CONFIG);
            mail.send(
                data.fatherEmail,
                data.motherEmail,
                'THÔNG BÁO TIẾP NHẬN HỒ SƠ TUYỂN SINH',
                htmlContent,
                '',
                (err, info) => {
                    if (err) {
                        console.error("❌ Lỗi khi gửi mail:", err);
                        return res.status(500).send("Gửi mail thất bại.");
                    }
                    console.log(`✅ Đã gửi mail thành công: `);
                }
            );

        });
    } catch (error) {
        console.log("Error aprrovedEnrollController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error)
    }
}

exports.getByIdController = async (req, res) => {
    try {
        const data = await Enrollment.findById(req.params.id);
        if (!data) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy phiếu nhập học" });
        }
        return res.status(HTTP_STATUS.OK).json(data);
    } catch (error) {
        console.log("error getByIdController", error)
    }
}