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
const User = require("../models/userModel");
const SchoolYear = require("../models/schoolYearModel");
const Class = require("../models/classModel");
const Student = require("../models/studentModel");
const Parent = require("../models/parentModel");
const Event = require("../models/eventModel");
const Room = require('../models/roomModel');
const { emailQueue } = require('../configs/queue');
const SMTP = require('../helpers/stmpHelper');
const IMAP = require('../helpers/iMapHelper');

exports.createSchoolYearController = async (req, res) => {
    try {
        const modelName = SchoolYear.modelName.toLowerCase();
        const sequence = await sequencePattern(SchoolYear.modelName);

        const { startDate, endDate, enrollmentStartDate, enrollmentEndDate, serviceStartTime, serviceEndTime } = req.body;
        const startYearNumber = new Date(startDate).getFullYear();
        const endYearNumber = new Date(endDate).getFullYear();
        const currentYearNumber = new Date().getFullYear();

        if (endYearNumber !== startYearNumber + 1) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Thời gian bắt đầu và thời gian kết thúc phải cách nhau 1 năm (VD: 2024-2025)." });
        }

        if (startYearNumber < currentYearNumber - 1) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Khung thời gian bắt đầu năm học không hợp lệ" });
        }

        if (enrollmentStartDate < startDate || enrollmentEndDate > endDate) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Khung thời gian tuyển sinh phải nằm trong khung thời gian năm học",
            });
        }

        if (new Date(enrollmentStartDate).getFullYear() === endYearNumber) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Thời gian tuyển sinh phải là đầu năm học"
            });
        }


        if (serviceStartTime < startDate || serviceEndTime > endDate) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Khung thời gian dịch vụ phải nằm trong khung thời gian năm học",
            });
        }

        if (new Date(serviceStartTime).getFullYear() === endYearNumber) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Thời gian đăng kí dịch vụ phải là đầu năm học"
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
        const dataSchoolYear = await SchoolYear.findOne({
            active: { $eq: true },
            schoolYear: `${startYearNumber - 1}-${endYearNumber - 1}`
        });

        if (dataSchoolYear) {

            let queryString = {
                active: { $eq: true },
                schoolYear: dataSchoolYear._id,
            }
            const dataClass = await Class.find(queryString);

            const dataEvent = await Event.find(queryString);

            const datePart = new Date(created.startDate);
            const yy = datePart.getFullYear().toString().slice(-2);
            const mm = (datePart.getMonth() + 1).toString().padStart(2, '0');
            const dd = datePart.getDate().toString().padStart(2, '0');
            const prefixClass = `CL${yy}${mm}${dd}`;
            const prefixEvent = `EV${yy}${mm}${dd}`;

            const newObjectClass = dataClass.map((item, index) => {
                const sequence = (index + 1).toString().padStart(3, '0');
                return {
                    classCode: `${prefixClass}${sequence}`,
                    className: item.className,
                    room: item.room,
                    schoolYear: created._id,
                };
            });
            const newObjectEvent = dataEvent.map((item, index) => {
                const sequence = (index + 1).toString().padStart(3, '0');
                return {
                    eventCode: `${prefixEvent}${sequence}`,
                    eventName: item.eventName,
                    isHoliday: item.isHoliday,
                    schoolYear: created._id,
                };
            });
            await Class.insertMany(newObjectClass);
            await Event.insertMany(newObjectEvent);
        }

        return res.status(HTTP_STATUS.CREATED).json({ message: "Tạo mới năm học thành công" });
    } catch (error) {
        console.log("Error createSchoolYearController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
}

exports.updateSchoolYearController = async (req, res) => {
    try {
        const { id } = req.params;

        const data = await SchoolYear.findById(id);
        if (!data) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(RESPONSE_MESSAGE.NOT_FOUND);
        }

        Object.assign(data, req.body);

        const {
            startDate,
            endDate,
            enrollmentStartDate,
            enrollmentEndDate,
            serviceStartTime,
            serviceEndTime,
        } = req.body;

        const start = new Date(startDate);
        const end = new Date(endDate);
        const enrollStart = new Date(enrollmentStartDate);
        const enrollEnd = new Date(enrollmentEndDate);
        const serviceStart = new Date(serviceStartTime);
        const serviceEnd = new Date(serviceEndTime);

        const startYearNumber = start.getFullYear();
        const endYearNumber = end.getFullYear();
        const currentYearNumber = new Date().getFullYear();


        if (endYearNumber !== startYearNumber + 1) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Khung thời gian năm học không hợp lệ" });
        }

        if (startYearNumber < currentYearNumber - 1) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Khung thời gian bắt đầu năm học không hợp lệ" });
        }

        if (enrollStart < start || enrollEnd > end) {
            return res.status(400).json({
                message: "Thời gian tuyển sinh phải nằm trong khoảng năm học",
            });
        }

        if (serviceStart < start || serviceEnd > end) {
            return res.status(400).json({
                message: "Thời gian đăng kí dịch vụ phải nằm trong khoảng năm học",
            });
        }

        const uniqueFields = Object.keys(SchoolYear.schema.paths).filter(
            key => SchoolYear.schema.paths[key].options.unique
        );

        for (const field of uniqueFields) {
            const exists = await SchoolYear.findOne({
                [field]: data[field],
                _id: { $ne: id },
            });

            if (exists) {
                const fieldLabel = i18n.t(`fields.${field}`);
                const message = i18n.t("messages.alreadyExists", { field: fieldLabel });
                return res.status(400).json({ message });
            }
        }

        await data.save();

        return res.status(HTTP_STATUS.UPDATED).json(RESPONSE_MESSAGE.UPDATED);

    } catch (error) {
        console.log("error updateSchoolYearController", error);

        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ message: messages.join(", ") });
        }

        return res.status(HTTP_STATUS.SERVER_ERROR).json({ message: error.message });
    }
};


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
        const dataCheck = await SchoolYear.findOne({
            active: { $eq: true },
            state: "Đang hoạt động"
        })
        if (dataCheck) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Không thể kích hoạt lớp khi có lớp đang hoạt động" });
        }
        const startDate = new Date(data.startDate);
        const endDate = new Date(data.endDate);
        const enrollmentStart = new Date(data.enrollmentStartDate);
        const enrollmentEnd = new Date(data.enrollmentEndDate);
        if (enrollmentStart < startDate || enrollmentEnd > endDate) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Thời gian tuyển sinh phải nằm trong khoảng thời gian của năm học" });
        }
        data.state = "Đang hoạt động";
        data.save();
        await Room.updateMany(
            {
                active: true,
                state: { $in: ["Hoàn thành", "Chờ xử lý"] }
            },
            {
                $set: { state: "Dự thảo" }
            }
        );

        res.status(HTTP_STATUS.OK).json("Đã chuyển trạng thái thành công");


    } catch (error) {
        console.log("Error confirmSchoolYearController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
}

exports.publishServiceController = async (req, res) => {
    try {
        const data = await SchoolYear.findById(req.params.id);
        if (!data) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy dữ liệu năm học" });
        }
        data.isPublished = true;
        data.save();
        res.status(HTTP_STATUS.OK).json("Đã mở đăng kí dịch vụ thành công");

        setImmediate(async () => {
            try {
                if (dataCheck.serviceStartTime && data.serviceEndTime) {
                    const dataParent = await Parent.find({ active: true }).lean();
                    const emails = dataParent.map(parent => parent.email);
                    const userData = await User.find({
                        active: { $eq: true },
                        email: { $in: emails }
                    });
                    const roleData = await Role.findOne({ roleName: "Đăng kí đồng phục" });
                    await User.updateMany(
                        { _id: { $in: userData.map(user => user._id) } },
                        { $addToSet: { roleList: roleData._id } }
                    );
                    for (const email of emails) {
                        const htmlContent = `
                <h2>Thông báo Hồ sơ Tuyển Sinh</h2>
                <p>Xin chào Quý phụ huynh</strong>,</p>
                <p>Năm học <strong>${data.schoolYear}</strong> đã bắt đầu. Quý phụ huynh vui lòng đăng ký dịch vụ cho con em mình trong khoảng thời gian từ <strong>${data.serviceStartTime}</strong> đến <strong>${data.serviceEndTime}</strong>.</p>
                <p>Tại chức năng đăng kí dịch vụ của nhà trường</strong>,</p>
                <p><strong>Ban Giám Hiệu Nhà Trường</strong></p>
            `;
                        const mail = new SMTP(SMTP_CONFIG);
                        await mail.send(
                            email,
                            ``,
                            'THÔNG BÁO ĐĂNG KÍ DỊCH VỤ',
                            htmlContent,
                            ``,
                            () => {
                                console.log(`Mail gửi thành công đến email : ${email}`);
                            }
                        );
                    }
                }
            } catch (error) {
                console.log("Error publishServiceController - setImmediate", error);
            }
        })
    } catch (error) {
        console.log("Error publishServiceController", error);
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
            try {
                for (const student of allStudents) {
                    const parentData = await Parent.find({ students: student }).lean();
                    const emails = parentData.map(parent => parent.email);
                    const userData = await User.find({
                        active: { $eq: true },
                        email: { $in: emails }
                    });

                    await User.updateMany(
                        { _id: { $in: userData.map(user => user._id) } },
                        { $set: { active: false } }
                    );

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
                                console.log(`Mail gửi thành công đến email : ${parentData[0].email}`);
                            }
                        );
                    }
                }
            }catch(error){
                console.log("Error endSchoolYearController - setImmediate", error);
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
                message: "Năm học không hợp lệ"
            });
        }

        const offset = (page - 1) * limit;

        const startOfYear = new Date(`${year + 1}-01-01T00:00:00.000Z`);
        const endOfYear = new Date(`${year + 2}-01-01T00:00:00.000Z`);

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

exports.getListEventController = async (req, res) => {
    try {
        let { limit, page, schoolYear } = req.query;

        limit = parseInt(limit) || 30;
        page = parseInt(page) || 1;

        const offset = (page - 1) * limit;


        const dataSchoolYear = await SchoolYear.findOne({
            active: { $eq: true },
            schoolYear: schoolYear
        })
        const queryString = {
            active: { $eq: true },
            schoolYear: dataSchoolYear._id
        };
        const totalCount = await Event.countDocuments(queryString);

        const data = await Event.find(queryString)
            .skip(offset)
            .limit(limit);

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
        console.log("Error getListEventController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
}

exports.createEventController = async (req, res) => {

    try {
        const modelName = Event.modelName.toLowerCase();
        const sequence = await sequencePattern(Event.modelName);

        const lastRecord = await Event.find({
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

        const dataSchoolYear = await SchoolYear.findOne({
            active: { $eq: true },
            state: "Đang hoạt động"
        });
        if (!dataSchoolYear) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Chưa có năm học đang hoạt động" });
        }

        const newData = {
            active: true,
            [`${modelName}Code`]: sequenceCode,
            ...req.body
        };


        if (newData.holidayStartDate && newData.holidayEndDate) {
            const start = new Date(newData.holidayStartDate);
            const end = new Date(newData.holidayEndDate);

            const schoolStart = new Date(dataSchoolYear.startDate);
            const schoolEnd = new Date(dataSchoolYear.endDate);

            if (start < schoolStart || end > schoolEnd) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    message: `Khoảng thời gian sự kiện phải nằm trong thời gian năm học`
                });
            }
            const overlappingEvent = await Event.findOne({
                active: true,
                $or: [
                    {
                        holidayStartDate: { $lte: newData.holidayEndDate },
                        holidayEndDate: { $gte: newData.holidayStartDate }
                    }
                ]
            });

            if (overlappingEvent) {
                return res.status(400).json({
                    message: "Khoảng thời gian sự kiện bị trùng với một sự kiện khác"
                });
            }
        }
        const uniqueFields = Object.keys(Event.schema.paths).filter(
            (key) => Event.schema.paths[key].options.unique
        );

        const requiredFields = Object.keys(Event.schema.paths).filter(
            (key) => Event.schema.paths[key].options.required
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

            const exists = await Event.findOne({ [field]: newData[field] });
            if (exists) {
                const fieldLabel = i18n.t(`fields.${field}`);
                const message = i18n.t("messages.alreadyExists", { field: fieldLabel });
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ message });
            }
        }

        const created = await Event.create(newData);
        return res.status(HTTP_STATUS.CREATED).json(created);

    } catch (error) {
        console.log("error createGeneric", error);

        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({ message: messages.join(", ") });
        }

        return res.status(500).json({ message: error.message });
    }

}

exports.updateEventController = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await Event.findById(id);
    if (!data) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(RESPONSE_MESSAGE.NOT_FOUND);
    }

    Object.assign(data, req.body);

    const uniqueFields = Object.keys(Event.schema.paths).filter(
      key => Event.schema.paths[key].options.unique
    );

    for (const field of uniqueFields) {
      const exists = await Event.findOne({ [field]: data[field], _id: { $ne: id }, active: true, schoolYear: data.schoolYear });
      if (exists) {
        const fieldLabel = i18n.t(`fields.${field}`);
        const message = i18n.t("messages.alreadyExists", { field: fieldLabel });
        return res.status(400).json({ message });
      }
    }

    const dataSchoolYear = await SchoolYear.findOne({
      active: true,
      state: "Đang hoạt động"
    });
    if (!dataSchoolYear) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Chưa có năm học đang hoạt động" });
    }

    if (data.holidayStartDate && data.holidayEndDate) {
      const start = new Date(data.holidayStartDate);
      const end = new Date(data.holidayEndDate);
      const schoolStart = new Date(dataSchoolYear.startDate);
      const schoolEnd = new Date(dataSchoolYear.endDate);

      if (start < schoolStart || end > schoolEnd) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: `Khoảng thời gian sự kiện phải nằm trong thời gian năm học`
        });
      }

      const overlappingEvent = await Event.findOne({
        _id: { $ne: id },
        active: true,
        $or: [
          {
            holidayStartDate: { $lte: end },
            holidayEndDate: { $gte: start }
          }
        ]
      });

      if (overlappingEvent) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: `Khoảng thời gian sự kiện bị trùng với thời gian sự kiện khác`
        });
      }
    }

    await data.save();

    return res.status(HTTP_STATUS.UPDATED).json(RESPONSE_MESSAGE.UPDATED);
  } catch (error) {
    console.log("error updateEventController", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ message: messages.join(", ") });
    }
    res.status(HTTP_STATUS.SERVER_ERROR).json({ message: error.message });
  }
};
