const mongoose = require("mongoose");

const TopicSchema = new mongoose.Schema(
    {
        topicCode: { type: String, required: true, unique: true },
        topicName: { type: String, required: true },
        activities: [
            {
                activity: { type: mongoose.Schema.Types.ObjectId, ref: "Activity" },
                sessionsPerWeek: { type: Number, default: 1 }, 
            }
        ],
        active: { type: Boolean, default: true },
        createdBy: { type: String },
        updatedBy: { type: String }
    },
    { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Topic", TopicSchema);
