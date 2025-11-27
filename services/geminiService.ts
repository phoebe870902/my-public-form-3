import { GoogleGenAI } from "@google/genai";
import { Registration } from "../types";

const apiKey = process.env.API_KEY || '';

// Initialize only if key exists to avoid immediate errors, though usage will check
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const generateClassSummary = async (
  registrations: Registration[],
  className: string,
  classDate: string
): Promise<string> => {
  if (!ai) return "請設定 API Key 以使用 AI 功能";

  const studentList = registrations
    .map(r => `- ${r.studentName} (${r.isPaid ? '已付款' : '未付款'})`)
    .join('\n');

  const prompt = `
    你是一位貼心的瑜伽老師助手。
    請根據以下報名資訊，寫一段簡短、溫暖的 Line 訊息給老師確認。
    
    課程：${className}
    時間：${new Date(classDate).toLocaleDateString()}
    
    報名學員列表：
    ${studentList}
    
    總人數：${registrations.length}
    
    請包含以下內容：
    1. 總結報名狀況。
    2. 提醒老師注意未付款的學員 (如果有)。
    3. 給老師一句鼓勵的話。
    請不要使用 Markdown 格式，直接輸出純文字。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "無法產生回應";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "發生錯誤，無法產生摘要。請確認 API Key 是否正確。";
  }
};