import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AIResponse } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    polished: {
      type: Type.STRING,
      description: "A corrected, slightly more articulate version of the thought, preserving the original meaning and tone.",
    },
    tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Up to 3 short, relevant topic tags (lowercase).",
    },
  },
  required: ["polished", "tags"],
};

export const enhanceThought = async (text: string): Promise<AIResponse> => {
  if (!apiKey) {
    console.warn("No API Key found, skipping AI enhancement.");
    return { polished: text, tags: [] };
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze this thought, polish the grammar/flow slightly without changing the vibe, and generate tags: "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        systemInstruction: "You are a helpful journaling assistant. Keep improvements subtle.",
      },
    });

    const textResponse = response.text;
    if (!textResponse) throw new Error("No response from AI");

    return JSON.parse(textResponse) as AIResponse;
  } catch (error) {
    console.error("Gemini interaction failed:", error);
    // Fallback to original text if AI fails
    return { polished: text, tags: [] };
  }
};
