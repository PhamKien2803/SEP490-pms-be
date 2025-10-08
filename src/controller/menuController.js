
const { Model } = require("mongoose");
const { HTTP_STATUS, RESPONSE_MESSAGE, USER_ROLES, VALIDATION_CONSTANTS } = require('../constants/useConstants');
const UserModel = require('../models/userModel');
const Role = require('../models/roleModel');
const Function = require('../models/functionModel');
const Menu = require('../models/menuModel');

exports.getMenuByDateFromTo = async (req, res) => {
  try {
    const { from, to, ageGroup } = req.query;

    if (!from || !to || !ageGroup) {
      return res.status(400).json({ message: "Thiếu tham số from/to/ageGroup" });
    }

    const menus = await Menu.find({
      weekStart: { $gte: new Date(from) },
      weekEnd: { $lte: new Date(to) },
      ageGroup: ageGroup,
    }).sort({ weekStart: 1 });

    res.status(200).json(menus);
  } catch (error) {
    console.error("Error getMenuByDateFromTo:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

exports.createMenu = async (req, res) => {
  try {
    const menuData = req.body;
    console.log("🚀 ~ menuData:", menuData)

    const existing = await Menu.findOne({
      weekStart: new Date(menuData.weekStart),
      ageGroup: menuData.ageGroup,

    });

    if (existing) {
      return res
        .status(400)
        .json({ message: "Thực đơn tuần này đã tồn tại cho nhóm tuổi này." });
    }

    const normalizedDays = (menuData.days || []).map((day) => ({
      ...day,
      totalCalo: 0,
      totalProtein: 0,
      totalLipid: 0,
      totalCarb: 0,
      meals: (day.meals || []).map((meal) => ({
        ...meal,
        totalCalo: 0,
        totalProtein: 0,
        totalLipid: 0,
        totalCarb: 0,
        foods: (meal.foods || []).map((food) => ({
          name: food.name,
          weight: food.weight,
          calo: food.calo || 0,
          protein: food.protein || 0,
          lipid: food.lipid || 0,
          carb: food.carb || 0,
        })),
      })),
    }));

    const menu = new Menu({
      weekStart: new Date(menuData.weekStart),
      weekEnd: new Date(menuData.weekEnd),
      weekNumber: menuData.weekNumber,
      ageGroup: menuData.ageGroup,
      days: normalizedDays,
      totalCalo: 0,
      totalProtein: 0,
      totalLipid: 0,
      totalCarb: 0,
      notes: menuData.notes || "",
      createdBy: menuData.createdBy || "system",
    });

    await menu.save();
    res.status(201).json(menu);
  } catch (error) {
    console.error("Error createMenu:", error);
    res
      .status(500)
      .json({ message: "Lỗi server", error: error.message });
  }
};

exports.updateMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const currentMenu = await Menu.findById(id);
    if (!currentMenu) {
      return res.status(404).json({ message: "Không tìm thấy thực đơn để cập nhật." });
    }

    if (updatedData.weekStart && updatedData.ageGroup) {
      const existing = await Menu.findOne({
        _id: { $ne: id }, 
        weekStart: new Date(updatedData.weekStart),
        ageGroup: updatedData.ageGroup,
      });

      if (existing) {
        return res
          .status(400)
          .json({ message: "Thực đơn tuần này đã tồn tại cho nhóm tuổi này." });
      }
    }

    if (updatedData.days && Array.isArray(updatedData.days)) {
      updatedData.days = updatedData.days.map((day) => ({
        ...day,
        totalCalo: 0,
        totalProtein: 0,
        totalLipid: 0,
        totalCarb: 0,
        meals: (day.meals || []).map((meal) => ({
          ...meal,
          totalCalo: 0,
          totalProtein: 0,
          totalLipid: 0,
          totalCarb: 0,
          foods: (meal.foods || []).map((food) => ({
            name: food.name,
            weight: food.weight,
            calo: food.calo || 0,
            protein: food.protein || 0,
            lipid: food.lipid || 0,
            carb: food.carb || 0,
          })),
        })),
      }));
    }

    updatedData.totalCalo = 0;
    updatedData.totalProtein = 0;
    updatedData.totalLipid = 0;
    updatedData.totalCarb = 0;
    updatedData.updatedBy = updatedData.updatedBy || "system";

    const updatedMenu = await Menu.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json(updatedMenu);
  } catch (error) {
    console.error("Error updateMenu:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

exports.getMenuTotalCaloIsNo = async (req, res) => {
  try {
    const menus = await Menu.find({ totalCalo: { $ne: 0 } }).sort({ weekStart: 1 });
    res.status(200).json(menus);
  } catch (error) {
    console.error("Error getMenuTotalCaloIsNot:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

exports.deleteMenuById = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedMenu = await Menu.findByIdAndDelete(id);
    if (!deletedMenu) {
      return res.status(404).json({ message: "Không tìm thấy thực đơn để xóa." });
    }
    res.status(200).json({ message: "Xóa thực đơn thành công.", menu: deletedMenu });
  } catch (error) {
    console.error("Error deleteMenuById:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};
