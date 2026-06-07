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
    const modelProvider = isGemini ? google(aiModel || "gemini-2.5-flash") : ollama(aiModel || "tinyllama");

    const response = await streamText({
      model: modelProvider as any,
      system: fullSystemPrompt,
      messages,
    });

    return response.toDataStreamResponse();
  } catch (error) {
    console.error("Local chat error:", error);
    return Response.json(
      { error: "Failed to communicate with local model." },
      { status: 500 }
    );
  }
}
