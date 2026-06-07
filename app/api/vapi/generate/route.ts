import { generateText, generateObject } from "ai";
import { ollama } from "ollama-ai-provider";
import { google } from "@ai-sdk/google";
import { z } from "zod";

export async function POST(request: Request) {
  const { role, jobDescription, companyKnowledge, aiModel, amount, resume } = await request.json();

  try {
    const isGemini = aiModel?.includes("gemini");
    const modelProvider = isGemini ? google(aiModel || "gemini-2.5-flash") : ollama(aiModel || "tinyllama");

    if (isGemini) {
      // Gemini is smart enough to handle structured JSON properly!
      const { object } = await generateObject({
        model: modelProvider,
        schema: z.object({
          questions: z.array(z.string()).describe("An array of interview questions."),
        }),
        prompt: `
          You are a hiring manager interviewing a candidate for the role of: ${role}.
          Based on the Job Description and the Candidate's Resume below, write exactly ${amount} interview questions to ask the candidate.
          
          JOB DESCRIPTION:
          ${jobDescription}

          CANDIDATE RESUME:
          ${resume || "No resume provided. Write general questions for the JD."}

          COMPANY CONTEXT:
          ${companyKnowledge}

          Write ONLY the questions. Make sure the questions cover technical skills, behavioral tendencies, and cultural fit.
          The questions should be specifically tailored to the candidate's background, past experience, and projects in their resume, assessing how well they fit the role.
        `,
        system: "You are a hiring manager. You only write interview questions.",
      });
      return Response.json({ success: true, questions: object.questions }, { status: 200 });
    }

    // Fallback to text parsing for Ollama models (especially tinyllama)
    const { text: questionsText } = await generateText({
      model: modelProvider as any,
      prompt: `
        You are a hiring manager interviewing a candidate for the role of: ${role}.
        Based on the Job Description and the Candidate's Resume below, write exactly ${amount} interview questions to ask the candidate.
        
        JOB DESCRIPTION:
        ${jobDescription}

        CANDIDATE RESUME:
        ${resume || "No resume provided."}

        COMPANY CONTEXT:
        ${companyKnowledge}

        Write ONLY the questions. Number them 1 to ${amount}.
        Do not write anything else. Do not explain your thought process.
        Make sure the questions are tailored to the candidate's experience in their resume where possible.
        
        Example output:
        1. Can you describe your experience with solar EPC projects?
        2. How do you handle tight project deadlines?
        
        Now, write the ${amount} questions:
      `,
      system: "You are a hiring manager. You only write interview questions. You never output conversational text.",
    });

    // Custom parsing logic to extract questions from tiny models that ignore formatting rules
    const lines = questionsText.split('\n');
    const questions: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      // Match lines that start with a number (e.g., "1. ", "1)", "- ") or just look like questions
      if (/^(\d+[\.\)]|-|\*)\s+/.test(trimmed) || trimmed.endsWith('?')) {
        // Remove the leading number/bullet
        const cleaned = trimmed.replace(/^(\d+[\.\)]|-|\*)\s*/, '').trim();
        if (cleaned.length > 5) {
          questions.push(cleaned);
        }
      }
    }

    // Fallback if the parser completely failed to find numbered items but it returned text
    if (questions.length === 0 && questionsText.length > 10) {
       // Just split by newlines and take the longest sentences
       const fallbackLines = questionsText.split('\n')
         .map(l => l.trim())
         .filter(l => l.length > 15);
       questions.push(...fallbackLines.slice(0, amount));
    }

    if (questions.length === 0) {
       throw new Error("Failed to extract questions from AI response.");
    }

    return Response.json({ success: true, questions: questions.slice(0, amount) }, { status: 200 });
  } catch (error) {
    console.error("Error generating interview:", error);
    return Response.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ success: true, data: "Thank you!" }, { status: 200 });
}
