const mongoose = require("mongoose");

const ParentSchema = new mongoose.Schema(
    {
        parentCode: {  type: String},
        fullName: { 
            type: String, 
            trim: true,
            minlength: [2, "Full name must be at least 2 characters"],
            maxlength: [100, "Full name must be less than 100 characters"]
        },
        dob: { 
            type: Date, 
            required: [true, "Date of birth is required"],
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
            trim: true,
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
            enum: ["male", "female", "other"], 
            required: true 
        },
        students: [{ 
            type: mongoose.Schema.Types.ObjectId, 
            ref: "Student" 
        }],
        address: { type: String, trim: true },
        nation: { type: String, trim: true },
        religion: { type: String, trim: true },
        createdBy: { type: String, trim: true },
        updatedBy: { type: String, trim: true },
        active: { type: Boolean, default: true }
    },
    { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Parent", ParentSchema);