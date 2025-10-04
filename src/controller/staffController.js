
const { Model } = require("mongoose");
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

const { HTTP_STATUS, RESPONSE_MESSAGE, USER_ROLES, VALIDATION_CONSTANTS } = require('../constants/useConstants');
const { IMAP_CONFIG, SMTP_CONFIG } = require('../constants/mailConstants');
const Staff = require("../models/staffModel");
const User = require("../models/userModel");
const { sequencePattern } = require('../helpers/useHelpers');
const { SEQUENCE_CODE } = require('../constants/useConstants');
const SMTP = require('../helpers/stmpHelper');
const IMAP = require('../helpers/iMapHelper');

exports.createStaffController = async (req, res) => {
    const session = await Staff.startSession();
    session.startTransaction();

    try {
        const { email, createBy } = req.body;
        const modelName = Staff.modelName.toLowerCase();

        const sequence = await sequencePattern(Staff.modelName);
        const lastRecord = await Staff.find({
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
            ...req.body,
        };

        const uniqueFields = Object.keys(Staff.schema.paths).filter(
            (key) => Staff.schema.paths[key].options.unique
        );

        for (const field of uniqueFields) {
            if (!newData[field]) continue;
            const exists = await Staff.findOne({ [field]: newData[field] });
            if (exists) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ message: `${field} đã tồn tại.` });
            }
        }

        const staffSaved = await Staff.create([newData], { session });

        const userSaved = await User.create(
            [
                {
                    email,
                    password: "12345678",
                    staff: staffSaved[0]._id,
                    createBy,
                    active: true,
                },
            ],
            { session }
        );

        await session.commitTransaction();
        session.endSession();

        res.status(HTTP_STATUS.CREATED).json(RESPONSE_MESSAGE.CREATED);

         setImmediate(async () => {
            const templatePath = path.join(__dirname, '..', 'templates', 'newAccountMail.ejs');

            const htmlConfirm = await ejs.renderFile(templatePath, {
                fullName: staffSaved[0].fullName,
                username: userSaved[0].email,
                password: "12345678"
            });

            const mail = new SMTP(SMTP_CONFIG);
            mail.send(
                email,
                '',
                `THÔNG TIN TÀI KHOẢN SỬ DỤNG HỆ THỐNG`,
                htmlConfirm,
                '',
                () => {
                    console.log(`✅ Mail gửi thành công đến email : ${email}`);
                }
            );

        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        console.error("Error createStaffController", error);

        if (error.code === 11000) {
            const field = Object.keys(error.keyValue)[0];
            return res
                .status(400)
                .json({ message: `${field} đã tồn tại trong hệ thống.` });
        }

        return res
            .status(HTTP_STATUS.SERVER_ERROR)
            .json({ message: "Lỗi server", error });
    }
};

exports.getDetailStaffController = async (req, res) => {
    try {
        const data = await Staff.findById(req.params.id);
        if (!data) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Nhân viên không tồn tại" });
        }
        return res.status(HTTP_STATUS.OK).json(data);
    } catch (error) {
        console.log("Error getDetailStaffController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
}

exports.deleteStaff = async (req, res) => {
    try {
        const dataStaff = await Staff.findById(req.params.id);
        if (!dataStaff) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Nhân viên không tồn tại" });
        }

        dataStaff.active = false;
        await dataStaff.save();

        await User.updateMany(
            { staff: dataStaff._id },
            { $set: { active: false } }
        );

        return res.status(HTTP_STATUS.OK).json(RESPONSE_MESSAGE.DELETED);
    } catch (error) {
        console.error("Error deleteStaffController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json({ message: "Lỗi server", error });
    }
};
