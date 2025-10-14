const { Model } = require("mongoose");
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');
const puppeteer = require('puppeteer');
const { HTTP_STATUS, RESPONSE_MESSAGE, USER_ROLES, VALIDATION_CONSTANTS } = require('../constants/useConstants');
const { IMAP_CONFIG, SMTP_CONFIG } = require('../constants/mailConstants');
const { sequencePattern } = require('../helpers/useHelpers');
const { SEQUENCE_CODE } = require('../constants/useConstants');
const i18n = require("../middlewares/i18n.middelware");
const SchoolYear = require("../models/schoolYearModel");
const Class = require("../models/classModel");
const Student = require("../models/studentModel");
const Parent = require("../models/parentModel");
const { emailQueue } = require('../configs/queue');
const SMTP = require('../helpers/stmpHelper');
const IMAP = require('../helpers/iMapHelper');

exports.createSchoolYearController = async (req, res) => {
    try {
        const modelName = SchoolYear.modelName.toLowerCase();
        const sequence = await sequencePattern(SchoolYear.modelName);

        const { startDate, endDate, enrollmentStartDate, enrollmentEndDate } = req.body;
        const startYearNumber = new Date(startDate).getFullYear();
        const endYearNumber = new Date(endDate).getFullYear();
        const currentYearNumber = new Date().getFullYear();

        if (endYearNumber !== startYearNumber + 1) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Thời gian bắt đầu và thời gian kết thúc không hợp lệ" });
        }

        if (startYearNumber < currentYearNumber - 1) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Thời gian bắt đầu không hợp lệ" });
        }

        if (enrollmentStartDate < startDate || enrollmentEndDate > endDate) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Thời gian tuyển sinh phải nằm trong khoảng năm học",
            });
        }

        const lastRecord = await SchoolYear.find({
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
            schoolYear: `${startYearNumber}-${endYearNumber}`,
            [`${modelName}Code`]: sequenceCode,
            ...req.body
        };

        const uniqueFields = Object.keys(SchoolYear.schema.paths).filter(
            (key) => SchoolYear.schema.paths[key].options.unique
        );

        const requiredFields = Object.keys(SchoolYear.schema.paths).filter(
            (key) => SchoolYear.schema.paths[key].options.required
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

            const query = { [field]: newData[field] };
            const exists = await SchoolYear.findOne({ [field]: newData[field] });
            if (exists) {
                const fieldLabel = i18n.t(`fields.${field}`);
                const message = i18n.t("messages.alreadyExists", { field: fieldLabel });
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ message });
            }
        }

        const created = await SchoolYear.create(newData);
        return res.status(HTTP_STATUS.CREATED).json(created);
    } catch (error) {
        console.log("Error createSchoolYearController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
}

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


async function renderTemplate(data) {
    const templatePath = path.join(__dirname, '../templates/graduatedPDF.hbs');
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(templateSource);
    const html = template(data);
    return html;
}

async function htmlToPDFBase64(html) {
    try {
        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
        });

        return pdfBuffer;
    } catch (error) {
        console.error("🚀 ~ Error in htmlToPDFBase64:", error);
        throw error;
    }
}

exports.endSchoolYearController = async (req, res) => {
    try {
        const dataSchoolYear = await SchoolYear.findById(req.params.id);
        if (!dataSchoolYear) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Không tìm thấy dữ liệu năm học" });
        }
        const endDate = new Date(dataSchoolYear.endDate);
        const now = new Date();

        if (endDate > now) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Chưa đến thời hạn kết thúc" });
        }

        let queryString = {
            schoolYear: { $eq: req.params.id },
            active: { $eq: true },
            age: { $eq: "5" }
        }
        const dataClass = await Class.find(queryString);

        const allStudents = dataClass.flatMap(cls => cls.students);

        await Student.updateMany(
            { _id: { $in: allStudents } },
            {
                $set: {
                    graduated: true,
                    graduatedAt: new Date()
                }
            }
        );

        dataSchoolYear.state = "Hết thời hạn";
        await dataSchoolYear.save();

        res.status(HTTP_STATUS.OK).json({ message: "Tất cả học sinh đã được tốt nghiệp" });

        setImmediate(async () => {
            for (const student of allStudents) {
                const parentData = await Parent.find({ students: student }).lean();
                const studentData = await Student.findById(student).lean();
                if (parentData.length > 0) {
                    if (!emailQueue) {
                        console.error('Email Queue chưa khởi tạo');
                        continue;
                    }

                    const htmlTemplate = await renderTemplate({
                        studentName: studentData.fullName,
                        dob: studentData.dob ? new Date(studentData.dob).toLocaleDateString('vi-VN') : '',
                        schoolYear: dataSchoolYear.schoolYear,
                        graduationDate: new Date().toLocaleDateString('vi-VN'),
                    });

                    const pdfBase64 = await htmlToPDFBase64(htmlTemplate);

                    const htmlContent = `
                <h2>Thông báo Hồ sơ Tuyển Sinh</h2>
                <p>Xin chào Quý phụ huynh của học sinh <strong>${studentData.fullName}</strong>,</p>
                <p>Học sinh <strong>${studentData.fullName}</strong> với mã <strong>${studentData.studentCode}</strong> đã <strong>hoàn thành chương trình học năm học ${dataSchoolYear.schoolYear}</strong>.</p>
                <p><strong>Ban Giám Hiệu Nhà Trường</strong></p>
            `;
                    const mail = new SMTP(SMTP_CONFIG);
                    await mail.send(
                        parentData[0].email,
                        parentData[1].email,
                        'THÔNG BÁO TỐT NGHIỆP',
                        htmlContent,
                        [
                            {
                                filename: `GiayXacNhanTotNghiep_${studentData.studentCode}.pdf`,
                                content: Buffer.from(pdfBase64, 'base64'),
                                contentType: 'application/pdf'
                            }
                        ],
                        () => {
                            console.log(`✅ Mail gửi thành công đến email : ${parentData[0].email}`);
                        }
                    );
                }
            }
        })

    } catch (error) {
        console.log("Error confirmSchoolYearController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
}

exports.getStudentGraduatedController = async (req, res) => {
    try {
        let { limit, page, year } = req.query;

        limit = parseInt(limit) || 30;
        page = parseInt(page) || 1;

        year = parseInt(year);
        if (!year || year < 1900 || year > 3000) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Year không hợp lệ"
            });
        }

        const offset = (page - 1) * limit;

        const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
        const endOfYear = new Date(`${year + 1}-01-01T00:00:00.000Z`);

        const queryString = {
            active: true,
            graduatedAt: { $gte: startOfYear, $lt: endOfYear }
        };


        const totalCount = await Student.countDocuments(queryString);

        const data = await Student.find(queryString)
            .skip(offset)
            .limit(limit);

        if (!data || data.length === 0) {
            return res
                .status(HTTP_STATUS.NOT_FOUND)
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
        console.log("Error getStudentGraduatedController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
}