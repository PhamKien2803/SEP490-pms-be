const { SEQUENCE_CODE } = require('../constants/useConstants');
const sequencePattern = async (modelName) => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const key = modelName.toUpperCase();

    const sequenceCode = SEQUENCE_CODE[key];

    if (!sequenceCode) {
        throw new Error(`Không tìm thấy SEQUENCE_CODE cho modelName: ${modelName}`);
    }

    return `${sequenceCode}${year}${month}${day}`;
};


module.exports = {
    sequencePattern,
};
