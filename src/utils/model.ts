import { ChatOpenAI } from "@langchain/openai";
import dotenv from "dotenv";

dotenv.config();

export const getModel = (temperature: number = 0.7) => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new Error("OPENROUTER_API_KEY is not set in .env");
    }

    return new ChatOpenAI({
        modelName: "google/gemini-2.5-flash", // OpenRouter model ID
        openAIApiKey: apiKey,
        temperature: temperature,
        configuration: {
            baseURL: "https://openrouter.ai/api/v1",
        },
    });
};
