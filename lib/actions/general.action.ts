"use server";

import { generateObject } from "ai";
import { ollama } from "ollama-ai-provider";
import { google } from "@ai-sdk/google";

import { supabase } from "@/lib/supabase";
import { feedbackSchema } from "@/constants";

export async function createFeedback(params: CreateFeedbackParams) {
  const { interviewId, userId, transcript, feedbackId } = params;

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
    const modelProvider = isGemini
      ? google(aiModel || "gemini-2.5-flash")
      : ollama(aiModel || "tinyllama");

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
          - **Cultural & Role Fit**: Alignment with company values and job role.
          - **Confidence & Clarity**: Confidence in responses, engagement, and clarity.
          `,
        system:
          "You are a professional interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories",
      });
      

    const feedback = {
      interview_id: interviewId,
      user_id: userId,
      total_score: object.totalScore,
      category_scores: object.categoryScores,
      strengths: object.strengths,
      areas_for_improvement: object.areasForImprovement,
      final_assessment: object.finalAssessment,
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

  try {
    const { data, error } = await supabase
      .from("feedback")
      .select("*")
      .eq("interview_id", interviewId)
      .eq("user_id", userId)
      .limit(1)
      .single();

    if (error || !data) return null;

    return { id: data.id, ...data } as Feedback;
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
