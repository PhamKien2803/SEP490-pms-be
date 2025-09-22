const mongoose = require("mongoose");
const RoleSchema = new mongoose.Schema(
    {
        roleCode: { type: String, required: true },
        roleName: { type: String, required: true },
        functionList: { type: mongoose.Types.ObjectId, ref: "Function"},
        active: { type: Boolean },
    },
    { timestamps: true, versionKey: false },
);

module.exports = mongoose.model("Role", RoleSchema);
