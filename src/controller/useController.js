const { Model } = require("mongoose");
const { HTTP_STATUS, RESPONSE_MESSAGE, USER_ROLES, VALIDATION_CONSTANTS } = require('../constants/useConstants');
const { sequencePattern } = require('../helpers/useHelpers');
const { SEQUENCE_CODE } = require('../constants/useConstants');

const findAllGeneric = (Model) => async (req, res) => {
    try {
        let { limit, page } = req.query;

        limit = parseInt(limit) || 30;
        page = parseInt(page) || 1;

        const offset = (page - 1) * limit;

        const queryString = {
            active: { $eq: true },
        };

        const totalCount = await Model.countDocuments(queryString);

        const data = await Model.find(queryString)
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
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
};

const createGeneric = (Model) => async (req, res) => {
    try {
        const modelName = Model.modelName.toLowerCase();
        const sequence = await sequencePattern(Model.modelName);

        const lastRecord = await Model.find({
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
            const nextNumber = (lastNumber + 1).toString().padStart(3, '0');
            sequenceCode = `${sequence}${nextNumber}`;
        }

        const newData = {
            active: true,
            [`${modelName}Code`]: sequenceCode,
            ...req.body
        };

        const uniqueFields = Object.keys(Model.schema.paths).filter(
            key => Model.schema.paths[key].options.unique
        );

        for (const field of uniqueFields) {
            const exists = await Model.findOne({ [field]: newData[field] });
            if (exists) {
                return res.status(400).json({ message: `${field} đã tồn tại.` });
            }
        }

        const created = await Model.create(newData);
        return res.status(201).json(created);

    } catch (error) {
        console.log("error createGeneric", error);

        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ message: messages.join(", ") });
        }

        return res.status(500).json({ message: error.message });
    }
};

const deletedSoftGeneric = (Model) => async (req, res) => {
    try {
        const data = await Model.findById(req.params.id);
        if (!data) {
            return res.status(HTTP_STATUS.NOT_FOUND).json(RESPONSE_MESSAGE.NOT_FOUND);
        }
        data.active = false;
        await data.save();
        return res.status(HTTP_STATUS.OK).json(RESPONSE_MESSAGE.DELETED);
    } catch (err) {
        res.status(HTTP_STATUS.SERVER_ERROR).json({ message: err.message });
    }
}

const updateGeneric = (Model) => async (req, res) => {
    try {
        const { id } = req.params;

        const data = await Model.findById(id);
        if (!data) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(RESPONSE_MESSAGE.NOT_FOUND);
        }
        Object.assign(data, req.body);

        const uniqueFields = Object.keys(Model.schema.paths).filter(
            key => Model.schema.paths[key].options.unique
        );

        for (const field of uniqueFields) {
            const exists = await Model.findOne({ [field]: data[field], _id: { $ne: id } });
            if (exists) {
                return res.status(400).json({ message: `Trường ${field} đã tồn tại.` });
            }
        }
        await data.save();

        return res.status(HTTP_STATUS.UPDATED).json(RESPONSE_MESSAGE.UPDATED);
    } catch (error) {
        console.log("error createGeneric", error);

        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ message: messages.join(", ") });
        }
        res.status(HTTP_STATUS.SERVER_ERROR).json({ message: error.message });
    }
};


module.exports = {
    findAllGeneric,
    createGeneric,
    updateGeneric,
    deletedSoftGeneric
};
