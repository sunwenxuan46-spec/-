
import { GoogleGenAI, Type } from "@google/genai";

const MODEL_NAME = 'gemini-3-flash-preview';

export interface ExtractedEvent {
  title: string;
  startDate: string; // YYYY-MM-DD
  deadline: string;  // YYYY-MM-DD
}

export interface AiResponse {
  summary: string;
  events: ExtractedEvent[];
}

export const getGeminiAdvice = async (prompt: string): Promise<AiResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: `你是一个资深游戏活动分析师。你的任务是分析用户提供的游戏公告文本。
        1. 总结核心奖励和必须要做的任务（简练文字）。
        2. 提取出所有具体的活动名称及其开始日期和截止日期。
        3. 必须严格按照指定的 JSON 格式返回。
        4. 日期格式必须是 YYYY-MM-DD。如果公告中没有年份，假设为 2025 年。
        5. 如果只有截止日期而没有明确开始日期，请将开始日期设定为今天 (${new Date().toISOString().split('T')[0]})。`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "给用户的简练总结建议" },
            events: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "活动或赛季名称" },
                  startDate: { type: Type.STRING, description: "开始日期，格式为 YYYY-MM-DD" },
                  deadline: { type: Type.STRING, description: "截止日期，格式为 YYYY-MM-DD" }
                },
                required: ["title", "startDate", "deadline"]
              }
            }
          },
          required: ["summary", "events"]
        },
        temperature: 0.2,
      },
    });

    const result = JSON.parse(response.text || '{}');
    return {
      summary: result.summary || "AI 无法解析总结。",
      events: result.events || []
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return { summary: "咨询 AI 助手时出错。", events: [] };
  }
};
