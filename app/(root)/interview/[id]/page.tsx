"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Agent from "@/components/Agent";
import DisplayTechIcons from "@/components/DisplayTechIcons";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function InterviewDetails() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [interview, setInterview] = useState<any | null>(null);
  const [feedback, setFeedback] = useState<any | null>(null);
  const [candidateName, setCandidateName] = useState("Candidate");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const name = localStorage.getItem("candidate_name") || "Candidate";
    setCandidateName(name);

    const loadData = async () => {
      try {
        if (!isSupabaseConfigured) {
          // Mock data for local testing
          setInterview({
            id: id,
            role: "Solar Design Engineer",
            type: "Technical",
            techstack: ["PVsyst", "AutoCAD", "SketchUp"],
            questions: [
              "What is your experience designing solar arrays?",
              "Explain how to minimize shading losses in a PV array.",
              "How do you configure solar strings for string inverters?"
            ],
            job_description: "Solar EPC Engineering project designer",
            company_knowledge: "Chirayu Power Pvt. Ltd. solar EPC services",
            ai_model: "gemini-2.5-flash",
            resume: "Mock candidate resume details"
          });
          setFeedback(null);
          setLoading(false);
          return;
        }

        // Fetch interview details
        const { data: interviewData, error: interviewErr } = await supabase
          .from("interviews")
          .select("*")
          .eq("id", id)
          .single();

        if (interviewErr || !interviewData) {
          console.error("Failed to load interview:", interviewErr);
          router.replace("/");
          return;
        }

        setInterview(interviewData);

        // Fetch feedback details
        const { data: feedbackData, error: feedbackErr } = await supabase
          .from("feedback")
          .select("*")
          .eq("interview_id", id)
          .limit(1);

        if (feedbackErr) {
          console.error("Failed to load feedback:", feedbackErr);
        } else if (feedbackData && feedbackData.length > 0) {
          setFeedback(feedbackData[0]);
        }
      } catch (err) {
        console.error("Failed to load active interview details:", err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadData();
    }
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-40 gap-4">
        <Loader2 className="animate-spin text-primary-blue h-8 w-8" />
        <span className="text-xs text-soft-gray font-semibold">
          Initiating Interview Environment...
        </span>
      </div>
    );
  }

  if (!interview) {
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Interview Header Banner */}
      <div className="bg-white border border-border-gray rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 animate-fadeIn">
        <div className="flex items-center gap-5">
          {/* Rebranded Header Icon */}
          <div className="size-16 rounded-full bg-primary-blue/5 border border-primary-blue/10 flex items-center justify-center shrink-0">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-primary-blue"
            >
              <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M4 10H20M4 15H20M10 4V20M15 4V20" stroke="currentColor" strokeWidth="1" />
              <circle cx="12" cy="12" r="2" fill="#F4B400" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-dark-100 capitalize">
              {interview.role} Interview
            </h1>
            <div className="mt-1.5">
              <DisplayTechIcons techStack={interview.techstack || []} />
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-primary-blue/20 text-primary-blue text-xs font-bold px-4 py-2 rounded-full uppercase tracking-wider">
          {interview.type}
        </div>
      </div>

      {/* Active Mock Interview Session Panel */}
      <div className="bg-white border border-border-gray rounded-2xl p-6 shadow-sm">
        <Agent
          userName={candidateName}
          userId="candidate-user"
          interviewId={id}
          type="interview"
          questions={interview.questions}
          jobDescription={interview.job_description}
          companyKnowledge={interview.company_knowledge}
          aiModel={interview.ai_model}
          resume={interview.resume}
          feedbackId={feedback?.id}
          role={interview.role}
          systemPrompt={interview.system_prompt}
        />
      </div>
    </div>
  );
}
