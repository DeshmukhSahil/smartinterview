import { supabase } from "@/lib/supabase";
import { getRandomInterviewCover } from "@/lib/utils";

export async function POST(request: Request) {
  const { role, jobDescription, companyKnowledge, aiModel, questions, userid, resume } = await request.json();

  try {
    const interview = {
      role,
      type: "Custom JD", // Fallback, could be removed
      level: "N/A", // Fallback
      techstack: [], // Fallback
      job_description: jobDescription,
      company_knowledge: companyKnowledge,
      ai_model: aiModel || "tinyllama",
      resume,
      questions,
      user_id: userid || "mock-user",
      finalized: true,
      cover_image: getRandomInterviewCover(),
    };

    let interviewId = "mock-interview-" + Date.now();
    try {
      const { data, error } = await supabase
        .from("interviews")
        .insert([interview])
        .select()
        .single();
      
      if (error) throw error;
      interviewId = data.id;
    } catch (dbError) {
      console.log("Database not configured, skipping save and using mock interview ID", dbError);
    }

    return Response.json({ success: true, id: interviewId }, { status: 200 });
  } catch (error) {
    console.error("Error saving interview:", error);
    return Response.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
