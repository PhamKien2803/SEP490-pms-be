const mongoose = require("mongoose");
const RoomSchema = new mongoose.Schema(
    {
        roomCode: { type: String, required: true },
        roomName: { type: String, required: true },
        minimum: { type: Number },
        maximum: { type: Number },
        active: { type: Boolean },
    },
    { timestamps: true, versionKey: false },
);

module.exports = mongoose.model("Room", RoomSchema);
