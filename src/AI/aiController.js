const fs = require("fs");
const path = require("path");
const { config } = require("dotenv");
const OpenAI = require("openai");

config();

const GEMINI_API_KEY_CHATGPT = process.env.GEMINI_API_KEY_CHATGPT;

const client = new OpenAI({
    apiKey: GEMINI_API_KEY_CHATGPT,
});

module.exports.generateMenuWithChatGPT = async (data) => {
    const promptPath = path.join(__dirname, "menu_prompt.md");
    const promptTemplate = fs.readFileSync(promptPath, "utf8");

    const inputJson = JSON.stringify(data, null, 4);
    const fullPrompt = `${promptTemplate.trim()}

\`\`\`json
${inputJson}
\`\`\`
`;

    try {
        const response = await client.chat.completions.create({
            model: "gpt-4o-mini", // hoặc "gpt-4o-mini" nếu bạn muốn nhanh hơn
            messages: [
                {
                    role: "system",
                    content:
                        "You are an AI system that processes preschool menus to calculate and populate nutritional values based on Vietnamese food composition standards. Return only valid JSON.",
                },
                {
                    role: "user",
                    content: fullPrompt,
                },
            ],
            response_format: { type: "json_object" },
        });

        const text = response.choices?.[0]?.message?.content || "";
        try {
             const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) return parsed;
            if (Array.isArray(parsed.result)) return parsed.result;
            if (Array.isArray(parsed.menus)) return parsed.menus;
            return parsed;
        } catch {
            return text;
        }
    } catch (error) {
        console.error("Error generating menu with ChatGPT:", error);
        throw error;
    }
};
