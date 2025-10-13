const mongoose = require("mongoose");
const RoomSchema = new mongoose.Schema(
    {
        roomCode: { type: String, required: true },
        roomName: { type: String, required: true },
        minimum: { type: Number },
        maximum: { type: Number },
        active: { type: Boolean },
        createdAt: { type: Date, default: Date.now},
        updatedAt: { type: Date, default: Date.now},
        createdBy: { type: String },
        updatedBy: { type: String },
    },
    { timestamps: true, versionKey: false },
);

module.exports = mongoose.model("Room", RoomSchema);
