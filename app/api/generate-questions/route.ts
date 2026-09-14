import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOllama } from "ollama-ai-provider";
import { z } from "zod";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, ngrok-skip-browser-warning",
};

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { role, resume, jobDescription, companyKnowledge, numberOfQuestions, aiModel, difficultyLevel, existingQuestions } = body;

    const selectedModel = aiModel || "gemini-2.5-flash";
    const count = parseInt(numberOfQuestions) || 5;

    // Set up model provider
    const isGemini = selectedModel.toLowerCase().includes("gemini");
    let modelProvider: any;

    if (isGemini) {
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "";
      if (!apiKey) {
        return Response.json(
          { error: "Google Generative AI key (GOOGLE_GENERATIVE_AI_API_KEY or GEMINI_API_KEY) is not configured in environment." },
          { status: 500, headers: corsHeaders }
        );
      }
      const googleProvider = createGoogleGenerativeAI({ apiKey });
      modelProvider = googleProvider(selectedModel);
    } else {
      // Use local Ollama provider
      const customOllama = createOllama({
        baseURL: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434/api",
      });
      modelProvider = customOllama(selectedModel);
    }

    const { object } = await generateObject({
      model: modelProvider,
      schema: z.object({
        questions: z.array(z.string()).describe(`A list of exactly ${count} role-specific technical interview questions.`),
      }),
      prompt: `
        You are an expert technical interviewer and HR manager. Your task is to generate EXACTLY ${count} technical and behavioral interview questions for a candidate.

        CONTEXT:
        Target Role: ${role || "Not specified"}
        
        Candidate Resume Summary:
        ${resume || "Not provided"}

        Job Description:
        ${jobDescription || "Not provided"}

        Company Knowledge & Values:
        ${companyKnowledge || "Not provided"}

        Difficulty Level:
        ${difficultyLevel || "Intermediate"}

        Existing Questions (DO NOT REPEAT THESE):
        ${existingQuestions && existingQuestions.length > 0 ? existingQuestions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n') : "None"}

        INSTRUCTIONS:
        1. Generate exactly ${count} highly relevant interview questions.
        2. Questions should assess the skills needed for the Target Role and Job Description.
        3. Tailor questions to the candidate's experience listed in the Resume Summary.
        4. Include elements that test alignment with the Company Knowledge & Values.
        5. The difficulty of these questions MUST target an ${difficultyLevel || "Intermediate"} level candidate.
        6. DO NOT generate questions that are identical or overly similar to the "Existing Questions" listed above.
        7. Ensure the questions are clear, professional, and challenging.
        8. You MUST return ONLY valid JSON matching the exact schema requested. Do not include markdown formatting like \`\`\`json or any other text outside the JSON object.
      `,
    });

    return Response.json(
      { success: true, data: object.questions },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Question generation error:", error);
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
