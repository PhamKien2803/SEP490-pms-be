const jwt = require("jsonwebtoken");
const UserModel = require("../models/userModel");
const Role = require('../models/roleModel');
const Function = require('../models/functionModel');
const Module = require('../models/moduleModel');
const { HTTP_STATUS } = require("../constants/useConstants");

exports.verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: "Không tìm thấy token, vui lòng đăng nhập." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "defaultSecretKey");

    const user = await UserModel.findById(decoded.userId).lean();
    if (!user) return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Người dùng không tồn tại." });

    const queryString = {
      _id: { $in: decoded.roles }
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

    const permissions = permissionListAll.flatMap(role =>
      role.permissionList.flatMap(module =>
        module.functionList.map(f => ({
          functionId: f.functionId._id.toString(),
          urlFunction: f.functionId.urlFunction,
          functionName: f.functionId.functionName,
          actions: f.action.filter(a => a.allowed)
        }))
      )
    );

    const uniqueFunctions = Array.from(new Map(permissions.map(f => [f.functionId, f])).values());

    req.user = {
      userId: user._id,
      username: user.username || user.email,
      roles: decoded.roles,
      functionList: uniqueFunctions,
      permissionListAll: permissionListAll
    };


    next();
  } catch (err) {
    console.error("Error verifyToken:", err);
    if (err.name === "TokenExpiredError") {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: "Token đã hết hạn, vui lòng đăng nhập lại." });
    }
    res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: "Token không hợp lệ." });
  }
};

exports.authorizeAction = (requiredAction) => {
  return (req, res, next) => {
    const { functionList } = req.user;
    const fullPath = req.baseUrl + req.path;

    const permissionUser = functionList.find(func =>
      fullPath.startsWith("/api" + func.urlFunction)
    );
    if (!permissionUser) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        message: "Bạn không có quyền truy cập endpoint này."
      });
    }

    const hasAction = permissionUser.actions.some(
      a => a.name === requiredAction && a.allowed === true
    );

    if (!hasAction) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        message: "Bạn không có quyền thực hiện hành động này."
      });
    }

    next();
  };
};
