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
            active: true,
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

        const created = await Model.create(newData);

        return res.status(200).json(created);

    } catch (error) {
        console.log("error createGeneric", error);
        return res.status(500).json(error.message);
    }
};


//     try {
//         if (uniField.length > 0) {
//             const filter = {};
//             for (const item of uniField) {
//                 if (req.body[item] !== undefined) {
//                     filter[item] = req.body[item];
//                 }
//             }

//             filter.status = true;

//             const existing = await Model.findOne(filter);

//             if (existing) {
//                 return res.status(400).json({
//                     message: `${RESPONSE_MESSAGE.UNIQUE_FIELDS}: ${Object.keys(filter)
//                         .filter(key => key !== 'status')
//                         .map(key => `${key}='${filter[key]}'`)
//                         .join(', ')}`,
//                 });
//             }
//         }

//         const newData = new Model(req.body);
//         const savedData = await newData.save();

//         res.status(HTTP_STATUS.CREATED).json({
//             message: RESPONSE_MESSAGE.CREATED,
//             data: savedData,
//         });
//     } catch (err) {
//         res.status(HTTP_STATUS.SERVER_ERROR).json({ message: err.message });
//     }
// };

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

        await data.save();

        return res.status(HTTP_STATUS.UPDATED).json(RESPONSE_MESSAGE.UPDATED);
    } catch (err) {
        res.status(HTTP_STATUS.SERVER_ERROR).json({ message: err.message });
    }
};


module.exports = {
    findAllGeneric,
    createGeneric,
    updateGeneric,
    deletedSoftGeneric
};
