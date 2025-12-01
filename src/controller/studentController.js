const { HTTP_STATUS, RESPONSE_MESSAGE, VALIDATION_CONSTANTS } = require('../constants/useConstants');
const { IMAP_CONFIG, SMTP_CONFIG } = require('../constants/mailConstants');
const { sequencePattern } = require('../helpers/useHelpers');
const { uploadBuffer } = require("../helpers/uploadImageHelper")
const { getGFS } = require("../configs/gridfs");
const i18n = require("../middlewares/i18n.middelware");
const Enrollment = require("../models/enrollmentModel");
const Student = require("../models/studentModel");
const Parent = require("../models/parentModel");
const SchoolYear = require("../models/schoolYearModel");
const User = require("../models/userModel");
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

exports.getListStudent = async (req, res) => {
    try {
        return res.status(200).json("test");
    } catch (error) {
        console.log("Error getListStudent", error);
        return res.status(500).json(error);
    }
}

exports.getStudentByParentController = async (req, res) => {
    try {
        const { id } = req.params;

        const parent = await Parent.findById(id)
            .populate({
                path: "students",
                select: "studentCode fullName dob gender idCard nation religion",
            });

        if (!parent) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy phụ huynh",
            });
        }

        res.status(200).json({
            success: true,
            parent: {
                _id: parent._id,
                fullName: parent.fullName,
                phoneNumber: parent.phoneNumber,
                email: parent.email,
                job: parent.job,
                idCard: parent.IDCard
            },
            students: parent.students || [],
        });
    } catch (error) {
        console.error("Lỗi khi lấy học sinh theo phụ huynh:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi máy chủ",
            error: error.message,
        });
    }
};

exports.getByIdController = async (req, res) => {
    try {
        const studentId = req.params.id;

        const dataStudent = await Student.findById(studentId);
        if (!dataStudent) {
            return res
                .status(HTTP_STATUS.NOT_FOUND)
                .json({ message: "Không tìm thấy học sinh" });
        }

        const dataParents = await Parent.find({
            students: studentId
        }).select("parentCode fullName gender phoneNumber email IDCard dob job address");

        let father = null;
        let mother = null;

        dataParents.forEach(parent => {
            if (parent.gender === "Nam") father = parent;
            if (parent.gender === "Nữ") mother = parent;
        });

        const response = {
            student: dataStudent,
            parents: {
                father,
                mother
            }
        };

        return res.status(HTTP_STATUS.OK).json(response);

    } catch (error) {
        console.error("getByIdController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json({
            message: "Đã xảy ra lỗi khi lấy thông tin học sinh",
            error: error.message
        });
    }
};


exports.createStudentEnroll = async (req, res) => {
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
            fatherDob
        } = req.body;

        const date = new Date();
        const year = date.getFullYear();
        const nextYear = year + 1;

        const queryString = {
            active: { $eq: true },
            state: "Đang hoạt động",
            schoolYear: `${year}-${nextYear}`
        }

        const dataSchoolYear = await SchoolYear.findOne(queryString);
        if (motherDob && fatherDob) {
            const motherAge = getAge(motherDob);
            const fatherAge = getAge(fatherDob);
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

        const validateDuplicates = (values) => {
            const filtered = values.filter(Boolean);
            return new Set(filtered).size !== filtered.length;
        };

        if (validateDuplicates([studentIdCard, fatherIdCard, motherIdCard])) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Số CMND/CCCD của học sinh, cha và mẹ không được trùng nhau." });
        }

        if (!isCheck) {
            if (validateDuplicates([fatherEmail, motherEmail])) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Email của cha và mẹ không được trùng nhau." });
            }

            if (validateDuplicates([fatherPhoneNumber, motherPhoneNumber])) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Số điện thoại của cha và mẹ không được trùng nhau." });
            }
        }

        const modelName = Enrollment.modelName.toLowerCase();
        const sequence = await sequencePattern(Enrollment.modelName);
        const lastRecord = await Enrollment.findOne({
            [`${modelName}Code`]: { $regex: `^${sequence}` },
        })
            .sort({ [`${modelName}Code`]: -1 })
            .lean();

        const nextNumber = lastRecord
            ? (parseInt(lastRecord[`${modelName}Code`].slice(-3)) + 1)
                .toString()
                .padStart(3, "0")
            : "001";
        const sequenceCode = `${sequence}${nextNumber}`;

        let newData = {
            active: true,
            [`${modelName}Code`]: sequenceCode,
            fatherGender: "Nam",
            motherGender: "Nữ",
            schoolYear: dataSchoolYear._id,
            ...req.body,
        };

        if (isCheck === true) {
            const [dataCheckDad, dataCheckMom] = await Promise.all([
                Parent.findOne({ active: true, IDCard: fatherIdCard }),
                Parent.findOne({ active: true, IDCard: motherIdCard }),
            ]);

            const [dataCheckEmailDad, dataCheckEmailMom] = await Promise.all([
                User.findOne({ active: true, email: fatherEmail }),
                User.findOne({ active: true, email: motherEmail }),
            ])

            if (!dataCheckDad)
                return res
                    .status(HTTP_STATUS.BAD_REQUEST)
                    .json({ message: "Không tìm thấy dữ liệu của cha" });
            if (!dataCheckMom)
                return res
                    .status(HTTP_STATUS.BAD_REQUEST)
                    .json({ message: "Không tìm thấy dữ liệu của mẹ" });

            if (!dataCheckEmailDad) {
                return res
                    .status(HTTP_STATUS.BAD_REQUEST)
                    .json({ message: "Email của cha không hợp lệ" });
            }

            if (!dataCheckEmailMom) {
                return res
                    .status(HTTP_STATUS.BAD_REQUEST)
                    .json({ message: "Email của mẹ không hợp lệ" });
            }
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
            };
        }

        const schemaPaths = Enrollment.schema.paths;
        const uniqueFields = Object.keys(schemaPaths).filter(
            (key) => schemaPaths[key].options.unique
        );

        let requiredFields;

        if (isCheck) {
            requiredFields = ["studentIdCard", "fatherIdCard", "motherIdCard"];
        } else {
            requiredFields = Object.keys(schemaPaths).filter(
                (key) => schemaPaths[key].options.required
            );
        }

        const missingFields = requiredFields.filter(
            (field) => !newData[field]?.toString().trim()
        );

        if (missingFields.length > 0) {
            const messages = missingFields.map((field) =>
                i18n.t("messages.required", { field: i18n.t(`fields.${field}`) })
            );
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ messages: messages.join(", ") });
        }


        for (const field of uniqueFields) {
            if (!newData[field]) continue;
            const exists = await Enrollment.exists({ [field]: newData[field] });
            if (exists) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json(i18n.t("messages.alreadyExists", {
                    field: i18n.t(`fields.${field}`),
                }),);
            }
        }

        const created = await Enrollment.create(newData);
        res.status(HTTP_STATUS.CREATED).json(created);

        setImmediate(async () => {
            try {
                const htmlContent = `
          <h2>Thông báo Hồ sơ Tuyển Sinh</h2>
          <p>Xin chào Quý phụ huynh của học sinh <strong>${created.studentName}</strong>,</p>
          <p>Nhà trường đã tiếp nhận hồ sơ tuyển sinh của học sinh. Hiện trạng hồ sơ đang <strong>đang xử lý</strong>.</p>
          <p>Trân trọng,</p>
          <p><strong>Ban Giám Hiệu Nhà Trường</strong></p>
        `;

                const mail = new SMTP(SMTP_CONFIG);
                await mail.send(
                    created.fatherEmail,
                    created.motherEmail,
                    "THÔNG BÁO TIẾP NHẬN HỒ SƠ TUYỂN SINH",
                    htmlContent
                );

                console.log("✅ Đã gửi mail thành công");
            } catch (mailErr) {
                console.error("❌ Lỗi khi gửi mail:", mailErr);
            }
        });
    } catch (error) {
        console.error("Error registerEnrollController:", error);
        const status = error.status || HTTP_STATUS.SERVER_ERROR;
        const message = error.message || "Lỗi máy chủ";
        return res.status(status).json({ message });
    }
}


exports.getByIdParentController = async (req, res) => {
    try {
        const parentId = req.params.id;

        const dataParent = await Parent.findById(parentId).populate("students");
        if (!dataParent) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                message: "Không tìm thấy phụ huynh"
            });
        }
        return res.status(HTTP_STATUS.OK).json(dataParent);
    } catch (error) {
        console.error("getByIdParentController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json({
            message: "Đã xảy ra lỗi khi lấy thông tin phụ huynh",
            error: error.message
        });
    }
}