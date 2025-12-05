const { HTTP_STATUS, RESPONSE_MESSAGE } = require('../constants/useConstants');
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

    const sequenceCode =
      lastRecord.length === 0
        ? `${sequence}001`
        : `${sequence}${(parseInt(lastRecord[0][`${modelName}Code`].slice(-3)) + 1)
          .toString()
          .padStart(3, "0")}`;

    const newData = {
      active: true,
      [`${modelName}Code`]: sequenceCode,
      ...req.body
    };

    const missingFields = [];
    if (newData.type === "Cố định") {
      if (newData.startTime == null) missingFields.push("startTime");
      if (newData.endTime == null) missingFields.push("endTime");

      if (newData.endTime <= newData.startTime) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: "Giờ kết thúc phải sau giờ bắt đầu."
        });
      }

      const overlap = await Activity.findOne({
        active: true,
        type: "Cố định",
        startTime: { $lt: newData.endTime },
        endTime: { $gt: newData.startTime }
      });

      if (overlap) {
        const fmt = m => `${Math.floor(m / 60)}h${(m % 60).toString().padStart(2, "0")}`;
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: `Khung giờ này đã trùng với hoạt động '${overlap.activityName}' từ ${fmt(overlap.startTime)} đến ${fmt(overlap.endTime)}.`
        });
      }
    }

    else if (newData.type === "Bình thường") {
      if (!newData.age) missingFields.push("age");
      if (!newData.category) missingFields.push("category");
    }

    else if (newData.type === "Sự kiện") {
      if (!newData.eventName) missingFields.push("eventName");
      const existsEvent = await Activity.findOne({
        active: true,
        type: "Sự kiện",
        eventName: newData.eventName
      });

      if (existsEvent) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: `Sự kiện '${newData.eventName}' đã được dùng trong hoạt động '${existsEvent.activityName}'.`
        });
      }
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

    // ====== CHECK UNIQUE FIELD ======
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



exports.updateActivityController = async (req, res) => {
  try {
    const { id } = req.params;

    const activity = await Activity.findById(id);
    if (!activity) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(RESPONSE_MESSAGE.NOT_FOUND);
    }

    Object.assign(activity, req.body);

    const {
      type,
      startTime,
      endTime,
      age,
      category,
      eventName,
      activityName
    } = activity;

    const missingFields = [];

    if (type === "Cố định") {
      if (startTime == null) missingFields.push("startTime");
      if (endTime == null) missingFields.push("endTime");

      if (endTime <= startTime) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: "Giờ kết thúc phải sau giờ bắt đầu."
        });
      }

      const overlap = await Activity.findOne({
        _id: { $ne: id },
        active: true,
        type: "Cố định",
        startTime: { $lt: endTime },
        endTime: { $gt: startTime }
      });

      if (overlap) {
        const fmt = m => `${Math.floor(m / 60)}h${(m % 60).toString().padStart(2, "0")}`;
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: `Khung giờ này bị trùng với hoạt động '${overlap.activityName}' từ ${fmt(overlap.startTime)} đến ${fmt(overlap.endTime)}.`
        });
      }

      activity.age = undefined;
      activity.category = undefined;
      activity.eventName = undefined;
    }

    else if (type === "Bình thường") {
      if (!age) missingFields.push("age");
      if (!category) missingFields.push("category");

      activity.startTime = undefined;
      activity.endTime = undefined;
      activity.eventName = undefined;
    }

    else if (type === "Sự kiện") {
      if (!eventName) missingFields.push("eventName");

      const existsEvent = await Activity.findOne({
        _id: { $ne: id },
        active: true,
        type: "Sự kiện",
        eventName: eventName
      });

      if (existsEvent) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          message: `Sự kiện '${eventName}' đã được dùng trong hoạt động '${existsEvent.activityName}'.`
        });
      }

      activity.startTime = undefined;
      activity.endTime = undefined;
      activity.age = undefined;
      activity.category = undefined;
    }

    if (!activityName) missingFields.push("activityName");
    if (!type) missingFields.push("type");

    if (missingFields.length > 0) {
      const messages = missingFields.map(field => {
        const fieldLabel = i18n.t(`fields.${field}`);
        return i18n.t("messages.required", { field: fieldLabel });
      });

      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: messages.join(", ")
      });
    }

    const uniqueFields = Object.keys(Activity.schema.paths).filter(
      key => Activity.schema.paths[key].options.unique
    );

    for (const field of uniqueFields) {
      if (!activity[field]) continue;

      const exists = await Activity.findOne({
        [field]: activity[field],
        _id: { $ne: id }
      });

      if (exists) {
        const fieldLabel = i18n.t(`fields.${field}`);
        const message = i18n.t("messages.alreadyExists", { field: fieldLabel });
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message });
      }
    }

    await activity.save();
    return res.status(HTTP_STATUS.UPDATED).json(RESPONSE_MESSAGE.UPDATED);

  } catch (error) {
    console.log("Error updateActivityController", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: messages.join(", ") });
    }

    return res.status(HTTP_STATUS.SERVER_ERROR).json({ message: error.message });
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
};
