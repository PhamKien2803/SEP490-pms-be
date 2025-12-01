
const Food = require('../models/foodModel');
const { generateFoodWithChatGPT } = require("../AI/aiController");

exports.getFoodsWithZeroTotalCalo = async () => {
  try {
    const foods = await Food.find({ totalCalories: { $eq: 0 } });
    return foods;
  } catch (error) {
    console.error("Error fetching foods with zero totalCalo:", error);
    throw new Error("Failed to fetch foods from database.");
  }
};

exports.genAICaculateFoodNutrition = async (req, res) => {
  try {
    const foodsToProcess = await exports.getFoodsWithZeroTotalCalo();

    if (!foodsToProcess || foodsToProcess.length === 0) {
      return res.status(200).json({ message: "Không có menu nào cần tính calo." });
    }

    let genAIResult = await generateFoodWithChatGPT(foodsToProcess);
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

    if (genAIResult && Array.isArray(genAIResult) && genAIResult.length === foodsToProcess.length) {
      for (let i = 0; i < foodsToProcess.length; i++) {
        const originalFood = foodsToProcess[i];
        const aiFood = genAIResult[i];

        if (
          originalFood.foodName.toLowerCase() === aiFood.foodName.toLowerCase() &&
          String(originalFood.ageGroup).trim() === String(aiFood.ageGroup).trim()
        ) {
          Food.findByIdAndUpdate(originalFood._id, {
            totalCalories: aiFood.totalCalories || 0,
            ingredients: aiFood.ingredients || [],
            updatedAt: new Date(),
            updatedBy: req.userId || "system"
          }, { new: true, runValidators: true })
            .then(updated => {
            })
            .catch(err => {
              console.error(`Lỗi khi cập nhật food ${originalFood._id}:`, err);
            });
        } else {
          console.warn(`Thông tin food không khớp: original ${originalFood.foodName} vs AI ${aiFood.foodName}`);
        }
      }
    } else {
      console.error("Kết quả từ AI không hợp lệ hoặc không khớp với số lượng menu.");
      return res.status(500).json({ message: "Kết quả từ AI không hợp lệ." });
    }
    res.status(200).json({
      message: `Đã tính calo cho ${foodsToProcess.length} menu thành công.`,
      ai_output: genAIResult
    });

  } catch (error) {
    console.error("Lỗi khi chạy genAICaculateFoodNutrition:", error);
    const statusCode = (error.message && error.message.includes('503')) ? 503 : 500;
    res.status(statusCode).json({
      message: "Lỗi xử lý tính toán dinh dưỡng.",
      error: error.message
    });
  }
};

exports.genAICaculateFoodNutritionById = async (req, res) => {
  try {
    const foodsToProcess = await Food.find({ _id: req.params.id });

    if (!foodsToProcess || foodsToProcess.length === 0) {
      return res.status(200).json({ message: "Không có food nào cần tính calo." });
    }

    let genAIResult = await generateFoodWithChatGPT(foodsToProcess);

    if (typeof genAIResult === 'string') {
      let cleanText = genAIResult.trim();
      if (cleanText.startsWith("```json")) cleanText = cleanText.substring("```json".length);
      if (cleanText.endsWith("```")) cleanText = cleanText.slice(0, -3);
      cleanText = cleanText.trim();
      genAIResult = JSON.parse(cleanText);
    }

    if (!Array.isArray(genAIResult)) {
      genAIResult = [genAIResult];
    }

    if (genAIResult && genAIResult.length > 0) {
      for (const originalFood of foodsToProcess) {
        const aiFood = genAIResult.find(ai =>
          ai.foodName &&
          ai.ageGroup &&
          ai.foodName.toLowerCase().trim() === originalFood.foodName.toLowerCase().trim() &&
          String(ai.ageGroup).trim() === String(originalFood.ageGroup).trim()
        );

        if (aiFood) {
          await Food.findByIdAndUpdate(
            originalFood._id,
            {
              totalCalories: aiFood.totalCalories || 0,
              ingredients: aiFood.ingredients || [],
              updatedAt: new Date(),
              updatedBy: req.userId || "system",
            },
            { new: true, runValidators: true }
          );
        } else {
          console.warn(`⚠️ Không tìm thấy food khớp với AI cho ${originalFood.foodName}`);
        }
      }
    } else {
      console.error("Kết quả từ AI không hợp lệ hoặc rỗng.");
      return res.status(500).json({ message: "Kết quả từ AI không hợp lệ." });
    }

    res.status(200).json({
      message: `Đã tính calo cho ${foodsToProcess.length} food thành công.`,
      ai_output: genAIResult,
    });

  } catch (error) {
    console.error("🔥 Lỗi khi chạy genAICaculateFoodNutritionById:", error);
    const statusCode = error.message?.includes('503') ? 503 : 500;
    res.status(statusCode).json({
      message: "Lỗi xử lý tính toán dinh dưỡng.",
      error: error.message,
    });
  }
};

exports.getFoodByQuery = async (req, res) => {
  try {
    let { foodName, ageGroup, totalCalories, active, limit, page } = req.query;
    active = true;
    limit = parseInt(limit) || 30;
    page = parseInt(page) || 1;
    const offset = (page - 1) * limit;

    const query = {};
    query.active = active;

    if (foodName) {
      query.foodName = { $regex: foodName, $options: "i" };
    }

    if (ageGroup) {
      query.ageGroup = ageGroup;
    }

    if (totalCalories) {
      query.totalCalories = { $eq: parseInt(totalCalories) };
    }

    const totalCount = await Food.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    const data = await Food.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    if (!data || data.length === 0) {
      return res.status(200).json({
        data: [],
        page: { totalCount, totalPages, limit, page },
        message: "Không có dữ liệu ở trang này.",
      });
    }

    return res.status(200).json({
      data,
      page: { totalCount, totalPages, limit, page },
    });
  } catch (error) {
    console.error("Error getFoodByQuery:", error);
    return res.status(500).json({
      message: "Lỗi server",
      error: error.message,
    });
  }
};
