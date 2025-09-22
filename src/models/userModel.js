const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const UserSchema = new mongoose.Schema(
    {
        username: { type: String, required: true },
        password: { type: String, required: true },
        roleList: { type: mongoose.Types.ObjectId, ref: "Role", required: true },
        isAdmin: { type: Boolean },
        active: { type: Boolean },
        staff: { type: mongoose.Types.ObjectId, ref: "Staff", required: true },
        parent: { type: mongoose.Types.ObjectId, ref: "Parent", required: true },
    },
    { timestamps: true, versionKey: false },
);

UserSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});


module.exports = mongoose.model("User", UserSchema);
