const mongoose = require("mongoose");
const FunctionSchema = new mongoose.Schema(
    {
        functionCode: { type: String, required: true, unique: true },
        functionName: { type: String, required: true, unique: true, trim: true },
        urlFunction: { type: String, required: true, unique: true, trim: true },
        active: { type: Boolean },
        createdBy: { type: String },
        updatedBy: { type: String },
    },
    { timestamps: true, versionKey: false },
);

module.exports = mongoose.model("Function", FunctionSchema);
