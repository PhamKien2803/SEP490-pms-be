const mongoose = require("mongoose");
const SchoolYear = require("./schoolYearModel");
const TopicSchema = new mongoose.Schema(
    {
        topicCode: { type: String, required: true, unique: true },
        topicName: { type: String, required: true },
        month: { type: String, required: true },
        schoolYear: { type: mongoose.Types.ObjectId, ref: "SchoolYear" },
        age: { type: String, required: true },
        activitiFix: [
            {
                activity: { type: mongoose.Schema.Types.ObjectId, ref: "Activity" },
            }
        ],
        activitiCore: [
            {
                activity: { type: mongoose.Schema.Types.ObjectId, ref: "Activity" },
                sessionsPerWeek: { type: Number, default: 1 },
            }
        ],
        activitiEvent: [
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

TopicSchema.pre("save", async function (next) {
    if (!this.schoolYear) {
        try {
            const activeYear = await SchoolYear.findOne({ active: true, state: "Đang hoạt động" });
            if (activeYear) {
                this.schoolYear = activeYear._id;
            }
        } catch (err) {
            return next(err);
        }
    }
    next();
});


module.exports = mongoose.model("Topic", TopicSchema);
