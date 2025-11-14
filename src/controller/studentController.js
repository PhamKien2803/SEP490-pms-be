const { HTTP_STATUS } = require('../constants/useConstants');
const Parent = require('../models/parentModel');
const Student = require('../models/studentModel');

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
      },
      students: parent.students || [],
    });
  } catch (error) {
    console.error("❌ Lỗi khi lấy học sinh theo phụ huynh:", error);
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
    }).select("parentCode fullName gender phoneNumber email IDCard job address");

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
