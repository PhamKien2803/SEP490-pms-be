const mongoose = require("mongoose");

const RoleSchema = new mongoose.Schema(
    {
        roleCode: { type: String, required: true },
        roleName: { type: String, required: true },
        permissionList: [
            {
                moduleId: { type: mongoose.Schema.Types.ObjectId, ref: "Module" },
                functionList: [
                    {
                        functionId: { type: mongoose.Schema.Types.ObjectId, ref: "Function" },
                        action: [
                            {
                                name: { type: String },
                                allowed: { type: Boolean },
                            }
                        ]
                    },
                ],
            },
        ],
        createdBy: { type: String },
        updatedBy: { type: String },

        active: { type: Boolean, default: true },
    },
    { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Role", RoleSchema);
