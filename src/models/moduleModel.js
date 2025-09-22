const mongoose = require("mongoose");
const ModuleSchema = new mongoose.Schema(
    {
        moduleCode: { type: String, required: true },
        moduleName: { type: String, required: true },
        active: { type: Boolean },
    },
    { timestamps: true, versionKey: false },
);

module.exports = mongoose.model("Module", ModuleSchema);
