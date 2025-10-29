
const Menu = require('../models/menuModel');
const Food = require('../models/foodModel');
const mongoose = require("mongoose");
const { HTTP_STATUS } = require('../constants/useConstants');

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

exports.getMenuById = async (req, res) => {
  try {
    const { id } = req.params;
    const menu = await Menu.findById(id).populate({
      path: "days.meals.foods.food",
      select: "foodName ageGroup totalCalories calo ingredients",
    });
    if (!menu) {
      return res.status(404).json({ message: "Không tìm thấy thực đơn." });
    }
    res.status(200).json(menu);
  } catch (error) {
    console.error("Error getMenuByDateFromTo:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

exports.createMenu = async (req, res) => {
  try {
    const menuData = req.body;

    const existing = await Menu.findOne({
      weekStart: new Date(menuData.weekStart),
      ageGroup: menuData.ageGroup,
      active: true,
    });

    if (existing) {
      return res.status(400).json({
        message: "Thực đơn tuần này đã tồn tại cho nhóm tuổi này.",
      });
    }

    const normalizedDays = [];

    for (const day of menuData.days || []) {
      let dayTotals = { calo: 0, protein: 0, lipid: 0, carb: 0 };
      const meals = [];

      for (const meal of day.meals || []) {
        let mealTotals = { calo: 0, protein: 0, lipid: 0, carb: 0 };
        const foods = [];

        for (const foodId of meal.foods || []) {
          const foodObjectId = new mongoose.Types.ObjectId(foodId);

          const foodObj = await Food.findById(foodObjectId).lean();
          if (!foodObj) {
            return res.status(400).json({ message: `Food ${foodId} không tồn tại` });
          }

          const calo = foodObj.ingredients.reduce((sum, ing) => sum + (ing.calories || 0), 0);
          const protein = foodObj.ingredients.reduce((sum, ing) => sum + (ing.protein || 0), 0);
          const lipid = foodObj.ingredients.reduce((sum, ing) => sum + (ing.lipid || 0), 0);
          const carb = foodObj.ingredients.reduce((sum, ing) => sum + (ing.carb || 0), 0);

          mealTotals.calo += calo;
          mealTotals.protein += protein;
          mealTotals.lipid += lipid;
          mealTotals.carb += carb;

          foods.push({ food: foodObjectId });
        }

        dayTotals.calo += mealTotals.calo;
        dayTotals.protein += mealTotals.protein;
        dayTotals.lipid += mealTotals.lipid;
        dayTotals.carb += mealTotals.carb;

        meals.push({
          mealType: meal.mealType,
          foods,
          totalCalo: mealTotals.calo,
          totalProtein: mealTotals.protein,
          totalLipid: mealTotals.lipid,
          totalCarb: mealTotals.carb,
        });
      }

      normalizedDays.push({
        date: day.date,
        meals,
        totalCalo: dayTotals.calo,
        totalProtein: dayTotals.protein,
        totalLipid: dayTotals.lipid,
        totalCarb: dayTotals.carb,
      });
    }

    const weekTotals = normalizedDays.reduce(
      (acc, day) => {
        acc.calo += day.totalCalo;
        acc.protein += day.totalProtein;
        acc.lipid += day.totalLipid;
        acc.carb += day.totalCarb;
        return acc;
      },
      { calo: 0, protein: 0, lipid: 0, carb: 0 }
    );

    const menu = new Menu({
      weekStart: new Date(menuData.weekStart),
      weekEnd: new Date(menuData.weekEnd),
      weekNumber: menuData.weekNumber,
      ageGroup: menuData.ageGroup,
      days: normalizedDays,
      totalCalo: weekTotals.calo,
      totalProtein: weekTotals.protein,
      totalLipid: weekTotals.lipid,
      totalCarb: weekTotals.carb,
      notes: menuData.notes || "",
      createdBy: menuData.createdBy || "system",
      updatedBy: menuData.createdBy || "system",
    });

    await menu.save();

    const populatedMenu = await Menu.findById(menu._id).populate({
      path: "days.meals.foods.food",
      select: "foodName ingredients",
    });

    res.status(201).json({
      message: "Tạo thực đơn thành công!",
      data: populatedMenu,
    });

  } catch (error) {
    console.error("❌ Error createMenu:", error);
    res.status(500).json({
      message: "Lỗi server",
      error: error.message,
    });
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
        active: true,
      });

      if (existing) {
        return res.status(400).json({ message: "Thực đơn tuần này đã tồn tại cho nhóm tuổi này." });
      }
    }

    if (updatedData.days && Array.isArray(updatedData.days)) {
      const normalizedDays = [];

      for (const day of updatedData.days) {
        let dayTotals = { calo: 0, protein: 0, lipid: 0, carb: 0 };
        const meals = [];

        for (const meal of day.meals || []) {
          let mealTotals = { calo: 0, protein: 0, lipid: 0, carb: 0 };
          const foods = [];

          for (const foodItem of meal.foods || []) {
            let foodObjectId;
            try {
              foodObjectId = new mongoose.Types.ObjectId(foodItem);
            } catch (err) {
              return res.status(400).json({ message: `Food ID không hợp lệ: ${foodItem}` });
            }

            const foodObj = await Food.findById(foodObjectId).lean();
            if (!foodObj) {
              return res.status(400).json({ message: `Food ${foodObjectId} không tồn tại` });
            }

            const calo = foodObj.ingredients.reduce((sum, ing) => sum + (ing.calories || 0), 0);
            const protein = foodObj.ingredients.reduce((sum, ing) => sum + (ing.protein || 0), 0);
            const lipid = foodObj.ingredients.reduce((sum, ing) => sum + (ing.lipid || 0), 0);
            const carb = foodObj.ingredients.reduce((sum, ing) => sum + (ing.carb || 0), 0);

            mealTotals.calo += calo;
            mealTotals.protein += protein;
            mealTotals.lipid += lipid;
            mealTotals.carb += carb;

            foods.push({ food: foodObjectId });
          }

          dayTotals.calo += mealTotals.calo;
          dayTotals.protein += mealTotals.protein;
          dayTotals.lipid += mealTotals.lipid;
          dayTotals.carb += mealTotals.carb;

          meals.push({
            mealType: meal.mealType,
            foods,
            totalCalo: mealTotals.calo,
            totalProtein: mealTotals.protein,
            totalLipid: mealTotals.lipid,
            totalCarb: mealTotals.carb,
          });
        }

        normalizedDays.push({
          date: day.date,
          meals,
          totalCalo: dayTotals.calo,
          totalProtein: dayTotals.protein,
          totalLipid: dayTotals.lipid,
          totalCarb: dayTotals.carb,
        });
      }

      updatedData.days = normalizedDays;

      const weekTotals = normalizedDays.reduce(
        (acc, day) => {
          acc.calo += day.totalCalo;
          acc.protein += day.totalProtein;
          acc.lipid += day.totalLipid;
          acc.carb += day.totalCarb;
          return acc;
        },
        { calo: 0, protein: 0, lipid: 0, carb: 0 }
      );

      updatedData.totalCalo = weekTotals.calo;
      updatedData.totalProtein = weekTotals.protein;
      updatedData.totalLipid = weekTotals.lipid;
      updatedData.totalCarb = weekTotals.carb;
    }

    updatedData.updatedBy = updatedData.updatedBy || "system";

    const updatedMenu = await Menu.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    }).populate({
      path: "days.meals.foods.food",
      select: "foodName ingredients",
    });

    res.status(200).json({
      message: "Cập nhật thực đơn thành công!",
      data: updatedMenu,
    });

  } catch (error) {
    console.error("❌ Error updateMenu:", error);
    res.status(500).json({
      message: "Lỗi server",
      error: error.message,
    });
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

exports.approveMenuById = async (req, res) => {
  try {
    const { id } = req.params;
    const menu = await Menu.findById(id);
    if (!menu) {
      return res.status(404).json({ message: "Không tìm thấy thực đơn." });
    }
    menu.state = "Đã duyệt";
    await menu.save();
    res.status(200).json({ message: "Duyệt thực đơn thành công.", menu });
  } catch (error) {
    console.error("Error approveMenuById:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

exports.rejectMenuById = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Lý do là bắt buộc" });
    }
    const menu = await Menu.findById(id);

    if (!menu) {
      return res.status(404).json({ message: "Không tìm thấy thực đơn." });
    }

    menu.reason = reason;
    menu.state = "Từ chối";
    await menu.save();
    res.status(200).json({ message: "Từ chối thực đơn thành công.", menu });
  }
  catch (error) {
    console.error("Error rejectMenuById:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

exports.getMenuByQuery = async (req, res) => {
  try {
    let { ageGroup, state, weekStart, weekEnd, active, limit, page } = req.query;
    active = true;

    limit = parseInt(limit) || 30;
    page = parseInt(page) || 1;
    const offset = (page - 1) * limit;

    const query = {};
    query.active = active;

    if (ageGroup) query.ageGroup = ageGroup;
    if (state) query.state = state;
    // if (active !== undefined) query.active = active === 'true';

    if (weekStart && weekEnd) {
      query.weekStart = { $gte: new Date(weekStart) };
      query.weekEnd = { $lte: new Date(weekEnd) };
    } else if (weekStart) {
      query.weekStart = { $gte: new Date(weekStart) };
    } else if (weekEnd) {
      query.weekEnd = { $lte: new Date(weekEnd) };
    }

    const totalCount = await Menu.countDocuments(query);

    const data = await Menu.find(query)
      .populate({
        path: "days.meals.foods.food",
        select: "foodName ageGroup totalCalories calo ingredients",
      })
      .sort({ weekStart: -1 })
      .skip(offset)
      .limit(limit);

    if (!data || data.length === 0) {
      return res.status(400).json({ message: "Không tìm thấy dữ liệu." });
    }

    return res.status(200).json({
      data,
      page: {
        totalCount,
        limit,
        page,
      },
    });
  } catch (error) {
    console.error("Error getMenuByQuery:", error);
    return res.status(500).json({
      message: "Lỗi server",
      error: error.message,
    });
  }
};

exports.getMenuByAgeGroupAndWeekNumber = async (req, res) => {
  try {
    let { ageGroup, weekNumber } = req.query;

    if (!ageGroup || !weekNumber) {
      return res.status(400).json({
        message: "Thiếu tham số ageGroup hoặc weekNumber",
      });
    }

    const menu = await Menu.findOne({
      ageGroup: ageGroup,
      weekNumber: weekNumber,
      active: true,
    }).populate({
      path: "days.meals.foods.food", // 🔥 populate sâu tới food
      model: "Food", // Tên model món ăn
      select: "foodName totalCalories ingredients", // Chọn các trường cần thiết
    });

    if (!menu) {
      return res.status(404).json({
        message: "Không tìm thấy thực đơn cho nhóm tuổi và tuần này",
      });
    }

    return res.status(200).json(menu);
  } catch (error) {
    console.error("❌ Lỗi khi lấy menu:", error);
    return res.status(500).json({
      message: "Đã xảy ra lỗi khi lấy dữ liệu menu",
      error: error.message,
    });
  }
};