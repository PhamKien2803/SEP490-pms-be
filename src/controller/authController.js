const { Model } = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { HTTP_STATUS, RESPONSE_MESSAGE, USER_ROLES, VALIDATION_CONSTANTS } = require('../constants/useConstants');
const UserModel = require('../models/userModel');
const Role = require('../models/roleModel');
const Function = require('../models/functionModel');
const Module = require('../models/moduleModel');

exports.loginController = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Nhập email" });
        }
        if (!password) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Nhập password" });
        }
        if (!(email.includes("@"))) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Email nhập sai định dạng" });
        }
console.log("password.length",password.length);
        if (password.length < 8) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Mật khẩu phải có ít nhất 8 ký tự" });
        }

        let queryString;
        queryString = {
            email: email,
            active: { $eq: true }
        }
        const user = await UserModel.findOne(queryString, {
            email: 1,
            password: 1,
        })
            .populate({
                path: "roleList",
                select: "permissionList"
            })
            .lean();
        if (!user || user.length === 0) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không có user" });
        }
        const checkPassword = await bcrypt.compare(password, user.password);
        if (!checkPassword) {
            return res.status(401).json({ message: "Sai mật khẩu" });
        }

        queryString = {
            active: { $eq: true }
        }

        const permissionListId = (user.roleList).map(item => item._id);

        queryString = {
            _id: { $in: permissionListId }
        }
        const permissionListAll = await Role.find(queryString)
            .select("-_id permissionList")
            .populate({
                path: "permissionList.moduleId",
                select: "moduleName "
            })
            .populate({
                path: "permissionList.functionList.functionId",
                select: "functionName urlFunction"
            })
            .lean();

        const token = jwt.sign(
            {
                userId: user._id,
                roles: permissionListId,
            },
            process.env.JWT_SECRET || "defaultSecretKey",
            { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
        );

        return res.status(HTTP_STATUS.OK).json({
            message: "Login success",
            token,
            permissionListAll
        });

    } catch (error) {
        console.log("Error loginController", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
}

exports.getCurrentUser = async (req, res) => {
    try {
        const { permissionListAll, userId } = req.user;
        const userProfile = await UserModel.findById(userId).lean();

        return res.status(HTTP_STATUS.OK).json({
            message: "Thông tin người dùng",
            userProfile,
            permissionListAll,
        })


    } catch (error) {
        console.log("Error getCurrentUser", error);
        return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
    }
}
