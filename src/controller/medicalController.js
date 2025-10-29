const { HTTP_STATUS } = require('../constants/useConstants');
const MedicalRecord = require('../models/medicalModel');
const { getGFS } = require("../configs/gridfs");
const mongoose = require("mongoose");

exports.getByIdMedicalController = async (req, res) => {
  try {
    const gfs = getGFS();
    if (!gfs) {
      return res.status(500).json({ message: "GridFS chưa kết nối" });
    }

    const data = await MedicalRecord.findById(req.params.id)
      .populate({
        path: "student",
        select: "studentCode fullName dob gender address healthCertId",
      })
      .lean();

    if (!data) {
      return res.status(404).json({ message: "Không tìm thấy hồ sơ sức khỏe" });
    }

    let healthCertFiles = null;

    if (data.student?.healthCertId) {
      const files = await gfs.find({ _id: data.student.healthCertId }).toArray();
      healthCertFiles = files.length > 0 ? files[0] : null;
    }

    const result = {
      ...data,
      healthCertFiles,
    };

    return res.status(200).json(result);
  } catch (error) {
    console.error("error getByIdController:", error);
    return res.status(500).json({
      message: "Lỗi máy chủ khi lấy thông tin hồ sơ sức khỏe",
      error: error.message,
    });
  }
};

exports.getAllMedicalByFilter = async (req, res) => {
  try {
    const { schoolYearId, classId } = req.query;
    const gfs = getGFS();
    if (!gfs) {
      return res.status(500).json({ message: "GridFS chưa kết nối" });
    }

    let { limit, page } = req.query;
    limit = parseInt(limit) || 30;
    page = parseInt(page) || 1;
    const offset = (page - 1) * limit;

    const queryString = {
      active: true,
      schoolYear: schoolYearId,
      class: classId
    };

    const totalCount = await MedicalRecord.countDocuments(queryString);

    const records = await MedicalRecord.find(queryString)
      .populate({
        path: "student",
        select: "studentCode fullName dob gender address healthCertId",
      })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    if (!records || records.length === 0) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json("Không tìm thấy dữ liệu");
    }

    for (const record of records) {
      if (record.student?.healthCertId) {
        try {
          const files = await gfs
            .find({ _id: new mongoose.Types.ObjectId(record.student.healthCertId) })
            .toArray();
          record.healthCertFiles = files.length > 0 ? files[0] : null;
        } catch (err) {
          record.healthCertFiles = null;
        }
      } else {
        record.healthCertFiles = null;
      }
    }

    return res.status(HTTP_STATUS.OK).json({
      data: records,
      page: {
        totalCount,
        limit,
        page,
      },
    });
  } catch (error) {
    console.error("error getAllMedicalController:", error);
    return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
  }
};

exports.getAllMedicalController = async (req, res) => {
  try {
    const gfs = getGFS();
    if (!gfs) {
      return res.status(500).json({ message: "GridFS chưa kết nối" });
    }

    let { limit, page } = req.query;
    limit = parseInt(limit) || 30;
    page = parseInt(page) || 1;
    const offset = (page - 1) * limit;

    const queryString = { active: { $eq: true } };

    const totalCount = await MedicalRecord.countDocuments(queryString);

    const records = await MedicalRecord.find(queryString)
      .populate({
        path: "student",
        select: "studentCode fullName dob gender address healthCertId",
      })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    if (!records || records.length === 0) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json("Không tìm thấy dữ liệu");
    }

    for (const record of records) {
      if (record.student?.healthCertId) {
        try {
          const files = await gfs
            .find({ _id: new mongoose.Types.ObjectId(record.student.healthCertId) })
            .toArray();
          record.healthCertFiles = files.length > 0 ? files[0] : null;
        } catch (err) {
          record.healthCertFiles = null;
        }
      } else {
        record.healthCertFiles = null;
      }
    }

    return res.status(HTTP_STATUS.OK).json({
      data: records,
      page: {
        totalCount,
        limit,
        page,
      },
    });
  } catch (error) {
    console.error("error getAllMedicalController:", error);
    return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
  }
};

exports.getAllMedicalByStudent = async (req, res) => {
  try {
    const studentId = req.params.id
    const gfs = getGFS();
    if (!gfs) {
      return res.status(500).json({ message: "GridFS chưa kết nối" });
    }

    let { limit, page } = req.query;
    limit = parseInt(limit) || 30;
    page = parseInt(page) || 1;
    const offset = (page - 1) * limit;

    const queryString = {
      active: true,
      student: studentId,
    };

    const totalCount = await MedicalRecord.countDocuments(queryString);

    const records = await MedicalRecord.find(queryString)
      .populate({
        path: "student",
        select: "studentCode fullName dob gender address healthCertId",
      })
      .populate({
        path: "class",
        select: "classCode className",
      })
      .populate({
        path: "schoolYear",
        select: "schoolYearCode schoolYear",
      })
      .sort({ createdAt: -1 })
      .lean();

    if (!records || records.length === 0) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json("Không tìm thấy dữ liệu");
    }

    for (const record of records) {
      if (record.student?.healthCertId) {
        try {
          const files = await gfs
            .find({ _id: new mongoose.Types.ObjectId(record.student.healthCertId) })
            .toArray();
          record.healthCertFiles = files.length > 0 ? files[0] : null;
        } catch (err) {
          record.healthCertFiles = null;
        }
      } else {
        record.healthCertFiles = null;
      }
    }

    return res.status(HTTP_STATUS.OK).json({
      data: records,
      page: {
        totalCount,
        limit,
        page,
      },
    });
  } catch (error) {
    console.error("error getAllMedicalController:", error);
    return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
  }
};