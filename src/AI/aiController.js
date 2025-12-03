const fs = require("fs");
const path = require("path");
const { config } = require("dotenv");
const OpenAI = require("openai");
const { GoogleGenAI } = require("@google/genai");

config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const ai = new GoogleGenAI({
    apiKey: GEMINI_API_KEY,
});

/**
 * Gửi prompt lên Gemini và lấy kết quả trả về
 * @param {Object} data - { school_classes, preschool_schedule }
 * @returns {Promise<Object>} - Kết quả trả về từ GenAI
 */
module.exports.generateFoodWithGemini = async (data) => {
    const promptPath = path.join(__dirname, "food_prompt.md");
    const promptTemplate = fs.readFileSync(promptPath, "utf8");

    // Ghép kết quả vào cuối prompt
    const inputJson = JSON.stringify(data, null, 4);
    const fullPrompt = `${promptTemplate.trim()}

\`\`\`json
${inputJson}
\`\`\`
`;
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
            {
                parts: [{ text: fullPrompt }],
            },
        ],
        config: {
            responseMimeType: "application/json",
        },
    });

    // Lấy phần text trả về từ Gemini
    const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log("🚀 ~ text:", text)
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}