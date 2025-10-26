const { Model } = require("mongoose");
const { HTTP_STATUS, RESPONSE_MESSAGE, USER_ROLES, VALIDATION_CONSTANTS, MAXIMIMUM_CLASS } = require('../constants/useConstants');
const Activity = require("../models/activityModel");
const i18n = require("../middlewares/i18n.middelware");
const { sequencePattern } = require('../helpers/useHelpers');


exports.createActivityController = async (req, res) => {
  try {
    const modelName = Activity.modelName.toLowerCase();
    const sequence = await sequencePattern(Activity.modelName);

    const lastRecord = await Activity.find({
      [`${modelName}Code`]: { $regex: `^${sequence}` }
    }).sort({ [`${modelName}Code`]: -1 }).limit(1);

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
      ...req.body
    };

    const missingFields = [];

    if (newData.type === "Cố định") {
      if (newData.startTime == null) missingFields.push("startTime");
      if (newData.endTime == null) missingFields.push("endTime");
    } else if (newData.type === "Bình thường") {
      if (newData.age == null) missingFields.push("age");
      if (!newData.category) missingFields.push("category");
    }

    if (!newData.type) missingFields.push("type");
    if (!newData.activityName) missingFields.push("activityName");

    if (missingFields.length > 0) {
      const messages = missingFields.map(field => {
        const fieldLabel = i18n.t(`fields.${field}`);
        return i18n.t("messages.required", { field: fieldLabel });
      });
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: messages.join(", ") });
    }

    const uniqueFields = Object.keys(Activity.schema.paths).filter(
      key => Activity.schema.paths[key].options.unique
    );

    for (const field of uniqueFields) {
      if (!newData[field]) continue;
      const exists = await Activity.findOne({ [field]: newData[field] });
      if (exists) {
        const fieldLabel = i18n.t(`fields.${field}`);
        const message = i18n.t("messages.alreadyExists", { field: fieldLabel });
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message });
      }
    }

    const created = await Activity.create(newData);
    return res.status(HTTP_STATUS.CREATED).json(created);

  } catch (error) {
    console.log("Error createActivityController", error);
    return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
  }
};


exports.getByIdController = async (req, res) => {
  try {
    const data = await Activity.findById(req.params.id);
    if (!data) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy dữ liệu hoạt động" });
    }
    return res.status(HTTP_STATUS.OK).json(data);
  } catch (error) {
    console.log("Error getByIdController", error);
    return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
  }
}