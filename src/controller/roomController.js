const { HTTP_STATUS } = require('../constants/useConstants');
const Room = require('../models/roomModel');
const SchoolYear = require('../models/schoolYearModel');
const Class = require('../models/classModel');

exports.getRoomByTeacher = async (req, res) => {
  try {
    const teacherId = req.params.id;

    const schoolYear = await SchoolYear.findOne({
      active: true,
      state: "Đang hoạt động"
    });

    if (!schoolYear) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: "Không có năm học nào đang hoạt động!",
      });
    }

    const classes = await Class.findOne({
      teachers: teacherId,
      schoolYear: schoolYear._id,
      active: true,
    });

    if (!classes) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: "Giáo viên chưa được phân lớp học trong năm học này!",
      });
    }

    const room = await Room.findOne({
      _id: classes.room
    });

    return res.status(200).json({ room });
  } catch (error) {
    console.error("error getAllPostFileByClass:", error);
    return res.status(500).json({
      message: "Lỗi server khi lấy danh sách file của lớp",
      error: error.message,
    });
  }
};

exports.getByIdRoomController = async (req, res) => {
  try {
    const data = await Room.findById(req.params.id);
    if (!data) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy dữ liệu phòng học" });
    }
    return res.status(HTTP_STATUS.OK).json(data)
  } catch (error) {
    console.log("Error getByIdRoomController", error);
    return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
  }
}