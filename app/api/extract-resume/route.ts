import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { ollama } from "ollama-ai-provider";
import { z } from "zod";
// @ts-ignore
import { PDFParse } from "pdf-parse";

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
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const selectedModel = (formData.get("model") as string) || "gemini-2.5-flash";

    if (!file) {
      return Response.json(
        { error: "No file provided" },
        { status: 400, headers: corsHeaders }
      );
    }

    const mimeType = file.type || "application/pdf";
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text content from PDF or plain text
    let textContent = "";
    if (mimeType.includes("pdf") || file.name.toLowerCase().endsWith(".pdf")) {
      const parser = new PDFParse({ data: buffer });
      try {
        const parsed = await parser.getText();
        textContent = parsed.text;
      } catch (err: any) {
        console.error("pdf-parse failed, falling back to basic buffer read:", err);
        textContent = buffer.toString("utf-8"); // fallback
      } finally {
        await parser.destroy().catch(() => {});
      }
    } else {
      textContent = buffer.toString("utf-8");
    }

    if (!textContent || !textContent.trim()) {
      return Response.json(
        { error: "Could not extract readable text from the uploaded file." },
        { status: 400, headers: corsHeaders }
      );
    }

    // Handle Local Text Extraction (No LLM Model)
    if (selectedModel.toLowerCase() === "local" || selectedModel.toLowerCase() === "none") {
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const emails = textContent.match(emailRegex);
      const candidateEmail = emails ? emails[0] : "";

      const lines = textContent.split("\n").map((l) => l.trim()).filter(Boolean);
      let candidateName = "";
      for (const line of lines.slice(0, 5)) {
        const words = line.split(/\s+/).filter(Boolean);
        if (
          words.length >= 2 &&
          words.length <= 4 &&
          !line.includes("@") &&
          !line.toLowerCase().includes("resume") &&
          !line.toLowerCase().includes("cv")
        ) {
          candidateName = line;
          break;
        }
      }
      if (!candidateName && lines.length > 0) {
        candidateName = lines[0];
      }

      let targetRole = "";
      for (const line of lines.slice(1, 10)) {
        if (
          line.toLowerCase().includes("engineer") ||
          line.toLowerCase().includes("developer") ||
          line.toLowerCase().includes("manager") ||
          line.toLowerCase().includes("lead") ||
          line.toLowerCase().includes("specialist")
        ) {
          targetRole = line;
          break;
        }
      }

      const localData = {
        candidateName,
        candidateEmail,
        targetRole,
        techStack: "",
        resumeSummary: textContent,
        questions: [],
      };

      return Response.json(
        { success: true, data: localData },
        { status: 200, headers: corsHeaders }
      );
    }

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
      modelProvider = ollama(selectedModel);
    }

    const { object } = await generateObject({
      model: modelProvider,
      schema: z.object({
        candidateName: z.string().describe("The candidate's full name"),
        candidateEmail: z.string().optional().describe("The candidate's email address if found in the resume"),
        targetRole: z.string().describe("A professional title or target role based on their resume"),
        techStack: z.string().describe("A comma-separated list of key technical skills, languages, frameworks, or tools"),
        resumeSummary: z.string().describe("A detailed text summary of the candidate's professional background, projects, and key experience, suitable for resume context"),
      }),
      prompt: `
        Analyze the following candidate's resume text:
        ---
        ${textContent}
        ---
        Extract candidate details (name, email, role, tech stack, and summary).
      `,
    });

    return Response.json(
      { success: true, data: object },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Resume extraction error:", error);
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
