"use server";

import { generateObject } from "ai";
import { createOllama } from "ollama-ai-provider";
import { google } from "@ai-sdk/google";

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { feedbackSchema } from "@/constants";

export async function createFeedback(params: CreateFeedbackParams) {
  const { interviewId, userId, transcript, feedbackId } = params;

  if (!isSupabaseConfigured || interviewId === "preview-session") {
    return { success: true, feedbackId: "mock-feedback-id" };
  }

  try {
    const formattedTranscript = transcript
      .map(
        (sentence: { role: string; content: string }) =>
          `- ${sentence.role}: ${sentence.content}\n`
      )
      .join("");

    const interview = await getInterviewById(interviewId);
    const hasGoogleKey = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const aiModel = interview?.ai_model || (hasGoogleKey ? "gemini-2.5-flash" : "tinyllama");

    const isGemini = aiModel?.includes("gemini");
    const customOllama = createOllama({
      baseURL: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434/api",
    });
    
    const modelProvider = isGemini
      ? google(aiModel || "gemini-2.5-flash")
      : customOllama(aiModel || "tinyllama");

    const { object } = await generateObject({
      model: modelProvider as any, 
      schema: feedbackSchema,
      prompt: `
        You are an AI interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories. Be thorough and detailed in your analysis. Don't be lenient with the candidate. If there are mistakes or areas for improvement, point them out.Change the questions everytime
        Transcript:
        ${formattedTranscript}
    
        Please score the candidate from 0 to 100 in the following areas. Do not add categories other than the ones provided:
        - **Communication Skills**: Clarity, articulation, structured responses.
        - **Technical Knowledge**: Understanding of key concepts for the role.
        - **Problem-Solving**: Ability to analyze problems and propose solutions.
        - **Cultural Fit**: Alignment with company values and job role.
        - **Confidence and Clarity**: Confidence in responses, engagement, and clarity.
        `,
      system:
        "You are a professional interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories",
    });

    const feedback = {
      interview_id: interviewId,
      user_id: userId,
      transcript: formattedTranscript,
      analysis: {
        totalScore: object.totalScore,
        categoryScores: object.categoryScores,
        strengths: object.strengths,
        areasForImprovement: object.areasForImprovement,
        finalAssessment: object.finalAssessment,
      }
    };

    if (feedbackId) {
      const { data, error } = await supabase
        .from("feedback")
        .update(feedback)
        .eq("id", feedbackId)
        .select()
        .single();
        
      if (error) throw error;
      return { success: true, feedbackId: data.id };
    } else {
      const { data, error } = await supabase
        .from("feedback")
        .insert([feedback])
        .select()
        .single();
        
      if (error) throw error;
      return { success: true, feedbackId: data.id };
    }
  } catch (error) {
    console.error("Error saving feedback:", error);
    return { success: false };
  }
}

export async function getInterview(
  interviewId: string
): Promise<Interview | null> {
  if (!interviewId) return null;

  if (!isSupabaseConfigured) {
    return {
      id: interviewId,
      user_id: "mock-user-id",
      role: "Solar Design Engineer",
      type: "Technical",
      techstack: ["PVsyst", "AutoCAD", "SketchUp"],
      job_description: "Solar EPC project engineering",
      company_knowledge: "Chirayu Power Pvt. Ltd. solar EPC services",
      ai_model: "gemini-2.5-flash",
      questions: ["What is your experience designing solar arrays?"],
      resume: "Mock candidate resume",
      finalized: true,
      createdAt: new Date().toISOString()
    } as any;
  }

  try {
    const { data, error } = await supabase
      .from("interviews")
      .select("*")
      .eq("id", interviewId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      ...data,
    } as Interview;
  } catch (error) {
    console.log("Database not configured, returning mock data");
    return null;
  }
}

export async function getInterviewById(id: string): Promise<Interview | null> {
  if (id === "preview-session") {
    return {
      id: id,
      user_id: "mock-user-id",
      role: "Preview Engineer",
      type: "Technical",
      techstack: ["React", "TypeScript"],
      job_description: "Preview session",
      company_knowledge: "Preview session",
      ai_model: "gemini-2.5-flash",
      questions: ["Question 1"],
      resume: "Preview resume",
      finalized: true,
      createdAt: new Date().toISOString()
    } as any;
  }

  if (!isSupabaseConfigured) {
    return {
      id: id,
      user_id: "mock-user-id",
      role: "Solar Design Engineer",
      type: "Technical",
      techstack: ["PVsyst", "AutoCAD", "SketchUp"],
      job_description: "Solar EPC Engineering project designer",
      company_knowledge: "Chirayu Power Pvt. Ltd. solar EPC services",
      ai_model: "gemini-2.5-flash",
      questions: [
        "What is your experience designing solar arrays?",
        "Explain how to minimize shading losses in a PV array.",
        "How do you configure solar strings for string inverters?"
      ],
      resume: "Mock candidate resume details",
      finalized: true,
      createdAt: new Date().toISOString()
    } as any;
  }

  try {
    const { data, error } = await supabase
      .from("interviews")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return null;
    return data as Interview | null;
  } catch (error) {
    console.log("Database not configured, returning mock data");
    return null;
  }
}

export async function getFeedbackByInterviewId(
  params: GetFeedbackByInterviewIdParams
): Promise<Feedback | null> {
  const { interviewId, userId } = params;

  if (!isSupabaseConfigured) {
    return {
      id: "mock-feedback-id",
      interview_id: interviewId,
      user_id: userId,
      totalScore: 85,
      categoryScores: [
        { name: "Communication Skills", score: 80, comment: "Clear, articulated replies with logical structure." },
        { name: "Technical Knowledge", score: 90, comment: "Demonstrated strong grasp of solar engineering principles." },
        { name: "Problem-Solving", score: 85, comment: "Able to outline a structured sizing approach." },
        { name: "Cultural Fit", score: 85, comment: "Aligns well with Chirayu's engineering precision focus." },
        { name: "Confidence and Clarity", score: 85, comment: "Maintained a professional, positive tone." }
      ],
      strengths: [
        "Excellent comprehension of shading reduction techniques",
        "Solid understanding of PVsyst sizing simulation workflows",
        "Great communication structure"
      ],
      areasForImprovement: [
        "Could elaborate more on electrical safety standards (e.g. IEC)",
        "Mention more details on inverter sizing ratio limits"
      ],
      finalAssessment: "Overall, the candidate is a strong fit for a project designer role at Chirayu Power.",
      createdAt: new Date().toISOString()
    } as any;
  }

  try {
    const { data, error } = await supabase
      .from("feedback")
      .select("*")
      .eq("interview_id", interviewId)
      .eq("user_id", userId)
      .limit(1)
      .single();

    if (error || !data) return null;

    const analysis = data.analysis || {};
    return {
      id: data.id,
      interviewId: data.interview_id,
      totalScore: analysis.totalScore || 0,
      categoryScores: analysis.categoryScores || [],
      strengths: analysis.strengths || [],
      areasForImprovement: analysis.areasForImprovement || [],
      finalAssessment: analysis.finalAssessment || "",
      createdAt: data.created_at,
    } as Feedback;
  } catch (error) {
    console.log("Database not configured, returning mock data");
    return null;
  }
}

export async function getLatestInterviews(
  params: GetLatestInterviewsParams
): Promise<Interview[] | null> {
  const { userId, limit = 20 } = params;
  if (!userId) return null;

  if (!isSupabaseConfigured) {
    return [
      {
        id: "1",
        user_id: "mock-user-id",
        role: "Solar Design Engineer",
        type: "Technical",
        techstack: ["PVsyst", "AutoCAD", "SketchUp"],
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: "2",
        user_id: "mock-user-id",
        role: "Operations & Maintenance Head",
        type: "Behavioral",
        techstack: ["O&M Management", "Grid Safety", "SCADA"],
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      }
    ] as any[];
  }

  try {
    const { data, error } = await supabase
      .from("interviews")
      .select("*")
      .eq("finalized", true)
      .neq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return [];
    
    return data.map((doc: any) => ({
      id: doc.id,
      ...doc,
    })) as Interview[];
  } catch (error) {
    console.log("Database not configured, returning mock data");
    return [];
  }
}

export async function getInterviewsByUserId(
  userId: string
): Promise<Interview[] | null> {
  if (!userId) return null;

  if (!isSupabaseConfigured) {
    return [
      {
        id: "1",
        user_id: "mock-user-id",
        role: "Solar Design Engineer",
        type: "Technical",
        techstack: ["PVsyst", "AutoCAD", "SketchUp"],
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: "2",
        user_id: "mock-user-id",
        role: "Operations & Maintenance Head",
        type: "Behavioral",
        techstack: ["O&M Management", "Grid Safety", "SCADA"],
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      }
    ] as any[];
  }

  try {
    const { data, error } = await supabase
      .from("interviews")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) return [];

    return data.map((doc: any) => ({
      id: doc.id,
      ...doc,
    })) as Interview[];
  } catch (error) {
    console.log("Database not configured, returning mock data");
    return [];
  }
}
