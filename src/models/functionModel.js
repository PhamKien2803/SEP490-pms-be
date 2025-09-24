const mongoose = require("mongoose");
const FunctionSchema = new mongoose.Schema(
    {
        functionCode: { type: String, required: true },
        functionName: { type: String, required: true },
        urlFunction: { type: String, required: true },
        active: { type: Boolean },
    },
    { timestamps: true, versionKey: false },
);

module.exports = mongoose.model("Function", FunctionSchema);
