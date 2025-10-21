const { HTTP_STATUS } = require('../constants/useConstants');
const MedicalRecord = require('../models/medicalModel');


exports.getByIdMedicalController = async (req, res) => {
    try {
        const data = await MedicalRecord.findById(req.params.id);
        if (!data) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy dữ liệu hồ sơ sức khỏe" });
        }
        return res.status(HTTP_STATUS.OK).json(data)
    } catch (error) {
        console.log("Error getByIdMedicalController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
}