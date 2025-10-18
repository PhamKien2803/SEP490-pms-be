const { HTTP_STATUS } = require('../constants/useConstants');
const Room = require('../models/roomModel');


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