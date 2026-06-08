import { streamText } from "ai";
import { ollama } from "ollama-ai-provider";
import { google } from "@ai-sdk/google";

export async function POST(req: Request) {
  try {
    const { messages, systemPrompt, companyKnowledge, aiModel, resume } = await req.json();

    const fullSystemPrompt = `
      COMPANY KNOWLEDGE:
      ${companyKnowledge || "General Company"}
      
      CANDIDATE RESUME:
      ${resume || "No resume provided."}
      
      ${systemPrompt}
    `;

    const isGemini = aiModel?.includes("gemini");
    let modelProvider;

    if (isGemini) {
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "";
      if (!apiKey) {
        return Response.json(
          { error: "Gemini API key is not configured on the backend. Please add GOOGLE_GENERATIVE_AI_API_KEY or GEMINI_API_KEY to your backend environment variables (.env.local), or select a Local Ollama Model (e.g. Qwen 2.5) in the playground dropdown." },
          { status: 400 }
        );
      }
      // Initialize provider with verified key
      modelProvider = google(aiModel || "gemini-2.5-flash");
    } else {
      // Fallback default local model is qwen2.5:7b (pulled and active on the machine) instead of tinyllama
      modelProvider = ollama(aiModel || "qwen2.5:7b");
    }

    const response = await streamText({
      model: modelProvider as any,
      system: fullSystemPrompt,
      messages,
    });

    return response.toDataStreamResponse();
  } catch (error: any) {
    console.error("Local chat error:", error);
    return Response.json(
      { error: error?.message || "Failed to communicate with local model." },
      { status: 500 }
    );
  }
}
