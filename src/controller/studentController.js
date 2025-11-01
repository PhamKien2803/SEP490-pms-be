const { HTTP_STATUS } = require('../constants/useConstants');
const Parent = require('../models/parentModel');

exports.getListStudent = async(req, res) => {
    try{
        return res.status(200).json("test");
    }catch(error){
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
