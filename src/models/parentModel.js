const mongoose = require("mongoose");

const ParentSchema = new mongoose.Schema(
    {
        parentCode: { type: String },
        fullName: {
            type: String,
            trim: true,
            minlength: [2, "Full name must be at least 2 characters"],
            maxlength: [100, "Full name must be less than 100 characters"]
        },
        dob: {
            type: Date,
            validate: {
                validator: function (v) {
                    return v <= new Date();
                },
                message: "Date of birth cannot be in the future"
            }
        },
        phoneNumber: {
            type: String,
            match: [/^[0-9]{9,11}$/, "Phone number must be 9-15 digits"],
        },
        email: {
            type: String,
            match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
        },
        IDCard: {
            type: String,
            required: [true, "ID Card is required"],
            unique: true,
            match: [/^[0-9]{9,12}$/, "ID Card must be 9-12 digits"]
        },
        gender: {
            type: String,
            enum: ["Nam", "Nữ", "Khác"],
            required: true
        },
        students: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student"
        }],
        address: { type: String },
        job: { type: String },
        isPreview: {type: Boolean, default: false},
        createdBy: { type: String },
        updatedBy: { type: String },
        active: { type: Boolean, default: true }
    },
    { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Parent", ParentSchema);