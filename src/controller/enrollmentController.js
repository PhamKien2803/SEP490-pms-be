const { Model } = require("mongoose");
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const { HTTP_STATUS, RESPONSE_MESSAGE, USER_ROLES, VALIDATION_CONSTANTS } = require('../constants/useConstants');
const { IMAP_CONFIG, SMTP_CONFIG } = require('../constants/mailConstants');
const { sequencePattern } = require('../helpers/useHelpers');
const { getGFS } = require("../configs/gridfs");
const i18n = require("../middlewares/i18n.middelware");
const Enrollment = require("../models/enrollmentModel");
const Student = require("../models/studentModel");
const Parent = require("../models/parentModel");
const User = require("../models/userModel");
const SMTP = require('../helpers/stmpHelper');
const IMAP = require('../helpers/iMapHelper');
const { emailQueue } = require('../configs/queue');

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
      <p>Quý phụ huynh vui lòng đến trường vào ngày <strong>16/10/2025</strong> để nộp giấy tờ cần thiết với mã đăng kí <strong>${created.enrollmentCode}</strong> .</p>
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

exports.approvedEnrollController = async (req, res) => {
    try {
        const { _id, ...updateFields } = req.body;

        const enrollment = await Enrollment.findById(_id);
        if (!enrollment) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Enrollment không tồn tại" });
        }

        Object.keys(updateFields).forEach(key => {
            enrollment[key] = updateFields[key];
        });
        enrollment.state = "Chờ BGH phê duyệt";
        await enrollment.save();
        res.status(HTTP_STATUS.OK).json({ message: "Phê duyệt thành công" });

        setImmediate(async () => {
            const htmlContent = `
                <h2>Thông báo Hồ sơ Tuyển Sinh</h2>
                <p>Xin chào Quý phụ huynh của học sinh <strong>${enrollment.studentName}</strong>,</p>
                <p>Nhà trường đã tiếp nhận hồ sơ tuyển sinh của học sinh. Hiện trạng hồ sơ <strong>đã tiếp nhận giấy tờ</strong>.</p>
                <br>
                <p>Trân trọng,</p>
                <p><strong>Ban Giám Hiệu Nhà Trường</strong></p>
            `;

            const mail = new SMTP(SMTP_CONFIG);
            mail.send(
                enrollment.fatherEmail,
                enrollment.motherEmail,
                'THÔNG BÁO XÉT TUYỂN HỒ SƠ TUYỂN SINH',
                htmlContent,
                '',
                (err, info) => {
                    if (err) {
                        console.error("❌ Lỗi khi gửi mail:", err);
                        return;
                    }
                    console.log(`✅ Đã gửi mail thành công`);
                }
            );
        });
    } catch (error) {
        console.log("Error approvedEnrollController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
};

exports.getByIdController = async (req, res) => {
    try {
        const gfs = getGFS();
        if (!gfs) {
            return res.status(500).json({ message: "GridFS chưa kết nối" });
        }

        const data = await Enrollment.findById(req.params.id).lean();
        if (!data) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                message: "Không tìm thấy phiếu nhập học",
            });
        }

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

        const result = {
            ...data,
            birthCertFiles,
            healthCertFiles,
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
            const htmlContent = `
    <h2>Thông báo Kết Quả Tuyển Sinh</h2>
    <p>Xin chào Quý phụ huynh của học sinh <strong>${data.studentName}</strong>,</p>
    <p>Nhà trường trân trọng cảm ơn Quý phụ huynh đã quan tâm và gửi hồ sơ tuyển sinh cho học sinh.</p>
    <p>Sau khi xem xét hồ sơ và kết quả tuyển sinh, rất tiếc chúng tôi xin thông báo rằng hồ sơ của học sinh <strong>không đủ điều kiện nhập học</strong>.</p>
        <p>Với lý do là <strong>${reason}</strong>.</p>
    <p>Nhà trường mong Quý phụ huynh và học sinh sẽ tiếp tục cố gắng, và hy vọng sẽ có cơ hội đồng hành cùng Quý vị trong những năm học tới.</p>
    <br>
    <p>Trân trọng,</p>
    <p><strong>Ban Giám Hiệu Nhà Trường</strong></p>
`;

            const mail = new SMTP(SMTP_CONFIG);
            mail.send(
                data.fatherEmail,
                data.motherEmail,
                'THÔNG BÁO XÉT TUYỂN HỒ SƠ TUYỂN SINH',
                htmlContent,
                '',
                (err, info) => {
                    if (err) {
                        console.error("❌ Lỗi khi gửi mail:", err);
                        return;
                    }
                    console.log(`✅ Đã gửi mail thành công`);
                }
            );
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
        const dataProcess = await Enrollment.find({ state: "Chờ BGH phê duyệt" });
        if (!dataProcess.length) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không có phiếu nào chờ phê duyệt" });
        }

        await Enrollment.updateMany(
            { state: "Chờ BGH phê duyệt" },
            { $set: { state: "Chờ xử lý tự động" } }
        );
        const modelStudentName = Student.modelName.toLowerCase();
        const modelParentName = Parent.modelName.toLowerCase();

        const results = [];

        // Xử lý tuần tự
        for (const data of dataProcess) {
            try {
                const {
                    studentName, studentDob, studentGender, studentIdCard,
                    studentNation, studentReligion, address, birthCertId, healthCertId,
                    fatherName, fatherGender, fatherPhoneNumber, fatherEmail, fatherIdCard, fatherJob,
                    motherName, motherGender, motherPhoneNumber, motherEmail, motherIdCard, motherJob
                } = data;

                // tạo học sinh
                const sequenceCodeStudent = await processSequenceCode(Student);
                const newStudent = await Student.create({
                    [`${modelStudentName}Code`]: sequenceCodeStudent,
                    fullName: studentName,
                    dob: studentDob,
                    gender: studentGender,
                    idCard: studentIdCard,
                    nation: studentNation,
                    religion: studentReligion,
                    active: true,
                    address,
                    createdBy: "Hệ thống",
                    updatedBy: "Hệ thống",
                    birthCertId,
                    healthCertId
                });

                // tạo cha
                let dad = await Parent.findOne({ active: true, IDCard: fatherIdCard });
                if (!dad) {
                    const sequenceCodeParentDad = await processSequenceCode(Parent);
                    dad = await Parent.create({
                        [`${modelParentName}Code`]: sequenceCodeParentDad,
                        fullName: fatherName,
                        phoneNumber: fatherPhoneNumber,
                        email: fatherEmail,
                        gender: fatherGender,
                        IDCard: fatherIdCard,
                        job: fatherJob,
                        active: true,
                        students: [newStudent._id]
                    });
                    const sequenceCodeUserDad = await processSequenceCode(User);
                    await User.create({
                        email: fatherEmail,
                        password: "12345678",
                        active: true,
                        parent: dad._id
                    });
                } else {
                    dad.students.push(newStudent._id);
                    await dad.save();
                }

                // tạo mẹ
                let mom = await Parent.findOne({ active: true, IDCard: motherIdCard });
                if (!mom) {
                    const sequenceCodeParentMom = await processSequenceCode(Parent);
                    mom = await Parent.create({
                         [`${modelParentName}Code`]: sequenceCodeParentMom,
                        fullName: motherName,
                        phoneNumber: motherPhoneNumber,
                        email: motherEmail,
                        gender: motherGender,
                        IDCard: motherIdCard,
                        job: motherJob,
                        active: true,
                        students: [newStudent._id]
                    });
                    await User.create({
                        email: motherEmail,
                        password: "12345678",
                        active: true,
                        parent: mom._id
                    });
                } else {
                    mom.students.push(newStudent._id);
                    await mom.save();
                }

                // update trạng thái enrollment
                data.state = "Hoàn thành";
                await data.save();

                results.push({
                    status: "fulfilled",
                    enrollmentCode: data.enrollmentCode,
                    studentId: newStudent._id,
                    dadId: dad._id,
                    momId: mom._id,
                    fatherEmail: fatherEmail,
                    motherEmail: motherEmail,
                    studentCode: newStudent[`${modelStudentName}Code`],
                    studentName: studentName
                });

            } catch (innerError) {
                results.push({
                    status: "rejected",
                    reason: innerError
                });
            }
        }

        for (const r of results) {
            console.log(`🔍 Kiểm tra học sinh: ${r.studentName}, status: ${r.status}`);

            if (r.status === 'fulfilled') {
                console.log("11111");
                if (!emailQueue) {
                    console.error('❌ Email Queue chưa khởi tạo');
                    continue;
                }

                const htmlContent = `
      <h2>Thông báo Hồ sơ Tuyển Sinh</h2>
      <p>Xin chào Quý phụ huynh của học sinh <strong>${r.studentName}</strong>,</p>
      <p>Học sinh <strong>${r.studentName}</strong> với mã <strong>${r.studentCode}</strong> đã <strong>trúng tuyển</strong>.</p>
      <p>Tài khoản phụ huynh:</p>
      <ul><li>Email: ${r.fatherEmail}</li><li>Mật khẩu: 12345678</li></ul>
      <ul><li>Email: ${r.motherEmail}</li><li>Mật khẩu: 12345678</li></ul>
      <p>Vui lòng đổi mật khẩu sau khi đăng nhập.</p>
      <p><strong>Ban Giám Hiệu Nhà Trường</strong></p>
    `;

                await emailQueue.add({
                    to: r.fatherEmail,
                    cc: r.motherEmail,
                    subject: 'THÔNG BÁO TRÚNG TUYỂN NHẬP HỌC',
                    html: htmlContent
                });
            }


            const successCount = results.filter(r => r.status === "fulfilled").length;
            const failCount = results.filter(r => r.status === "rejected").length;

            if (failCount > 0) {
                console.error("Một số hồ sơ bị lỗi:", results.filter(r => r.status === "rejected").map(r => r.reason?.message));
            }

            return res.status(HTTP_STATUS.OK).json({
                message: `Phê duyệt thành công ${successCount}/${dataProcess.length} hồ sơ.`,
                failed: failCount
            });

        }
    } catch (error) {
        console.error("error approvedEnrollAllController:", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json({
            message: "Lỗi máy chủ khi phê duyệt phiếu nhập học",
            error: error.message,
        });
    }
}



