const jwt = require("jsonwebtoken");
const _ = require("lodash")
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
          moduleId: module.moduleId._id.toString(),
          moduleName: module.moduleId.moduleName,
          functionId: f.functionId._id.toString(),
          urlFunction: f.functionId.urlFunction,
          functionName: f.functionId.functionName,
          actions: f.action.filter(a => a.allowed)
        }))
      )
    );


    const uniqueFunctionsMap = new Map();

    permissions.forEach(f => {
      if (!uniqueFunctionsMap.has(f.functionId)) {
        uniqueFunctionsMap.set(f.functionId, f);
      }
    });

    const uniquePermission = Array.from(uniqueFunctionsMap.values());
    const grouped = _(uniquePermission)
      .groupBy(item => `${item.moduleId}|${item.moduleName}`)
      .map(items => {
        const { moduleId, moduleName } = items[0];
        return {
          moduleId,
          moduleName,
          functions: items.map(f => ({
            functionId: f.functionId,
            urlFunction: f.urlFunction,
            functionName: f.functionName,
            actions: f.actions
          }))
        };
      })
      .value();

    req.user = {
      userId: user._id,
      permissionListAll: grouped,
      functionList: uniquePermission,
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
    const path = req.baseUrl
    console.log("🚀 ~ path:", path)
    console.log("🚀 ~ functionList:", functionList)

    const permissionUser = functionList.find(func =>
      path === "/api" + func.urlFunction
    );
    console.log("🚀 ~ permissionUser:", permissionUser)
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
