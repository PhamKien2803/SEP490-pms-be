
const Menu = require('../models/menuModel');
const { generateMenuWithChatGPT } = require("../AI/aiController");

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

exports.getMenuById= async (req, res) => {
  try {
    const { id } = req.params;
    const menu = await Menu.findById(id);
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
    const menus = await Menu.find({ totalCalo: { $eq: 0 } }).sort({ weekStart: 1 });
    res.status(200).json(menus);
  } catch (error) {
    console.error("Error getMenuTotalCaloIsNot:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

exports.getMenusWithZeroTotalCalo = async () => {
  try {
    const menus = await Menu.find({ totalCalo: { $eq: 0 } }).sort({ weekStart: 1 });
    return menus;
  } catch (error) {
    console.error("Error fetching menus with zero totalCalo:", error);
    throw new Error("Failed to fetch menus from database.");
  }
};

exports.genAICaculateMenuNutrition = async (req, res) => {
  try {
    const menusToProcess = await exports.getMenusWithZeroTotalCalo();

    if (!menusToProcess || menusToProcess.length === 0) {
      return res.status(200).json({ message: "Không có menu nào cần tính calo." });
    }

    console.log(`Đang gửi ${menusToProcess.length} menu đến Gemini để tính toán...`);
    let genAIResult = await generateMenuWithChatGPT(menusToProcess);
    if (typeof genAIResult === 'string') {
      let cleanText = genAIResult.trim();
      if (cleanText.startsWith("```json")) {
        cleanText = cleanText.substring("```json".length);
      }
      if (cleanText.endsWith("```")) {
        cleanText = cleanText.substring(0, cleanText.length - "```".length);
      }
      cleanText = cleanText.trim();

      genAIResult = JSON.parse(cleanText);
    }
    
    // console.log("🚀 ~ genAIResult:", genAIResult)
    // console.log("🚀 ~ Array.isArray(genAIResult):", Array.isArray(genAIResult))
    // console.log("🚀 ~ menusToProcess.length:", menusToProcess.length)

    if (genAIResult && Array.isArray(genAIResult) && genAIResult.length === menusToProcess.length) {
      for (let i = 0; i < menusToProcess.length; i++) {
        const originalMenu = menusToProcess[i];
        const aiMenu = genAIResult[i];
        if (originalMenu._id.toString() == aiMenu._id) {
          Menu.findByIdAndUpdate(originalMenu._id, {
            days: aiMenu.days,
            totalCalo: aiMenu.totalCalo,
            totalProtein: aiMenu.totalProtein,
            totalLipid: aiMenu.totalLipid,
            totalCarb: aiMenu.totalCarb,
            updatedBy: "system (AI)",
            state: "Đã lấy calo",
          }, { new: true, runValidators: true })
            .then(updated => {
              console.log(`Cập nhật menu ${updated._id} thành công.`);
            })
            .catch(err => {
              console.error(`Lỗi khi cập nhật menu ${originalMenu._id}:`, err);
            });
        } else {
          console.warn(`ID menu không khớp: original ${originalMenu._id} vs AI ${aiMenu._id}`);
        }
      }
    } else {
      console.error("Kết quả từ AI không hợp lệ hoặc không khớp với số lượng menu.");
      return res.status(500).json({ message: "Kết quả từ AI không hợp lệ." });
    }
    res.status(200).json({
      message: `Đã tính calo cho ${menusToProcess.length} menu thành công.`,
      ai_output: genAIResult
    });

  } catch (error) {
    console.error("Lỗi khi chạy genAICaculateMenuNutrition:", error);
    const statusCode = (error.message && error.message.includes('503')) ? 503 : 500;
    res.status(statusCode).json({
      message: "Lỗi xử lý tính toán dinh dưỡng.",
      error: error.message
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
    const menu = await Menu.findById(id);
    if (!menu) {
      return res.status(404).json({ message: "Không tìm thấy thực đơn." });
    }
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
    let { ageGroup, state, weekStart, weekEnd, limit, page } = req.query;

    limit = parseInt(limit) || 30;
    page = parseInt(page) || 1;
    const offset = (page - 1) * limit;

    // Tạo điều kiện query động
    const query = {};

    if (ageGroup) query.ageGroup = ageGroup;
    if (state) query.state = state;

    // Gộp logic ngày (nếu có)
    if (weekStart && weekEnd) {
      query.weekStart = { $gte: new Date(weekStart) };
      query.weekEnd = { $lte: new Date(weekEnd) };
    } else if (weekStart) {
      query.weekStart = { $gte: new Date(weekStart) };
    } else if (weekEnd) {
      query.weekEnd = { $lte: new Date(weekEnd) };
    }

    // Đếm tổng số kết quả
    const totalCount = await Menu.countDocuments(query);

    // Lấy dữ liệu có phân trang
    const data = await Menu.find(query)
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
