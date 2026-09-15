"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import PortalLoading from "@/components/PortalLoading";
const Agent = dynamic(() => import("@/components/Agent"), {
  loading: () => <PortalLoading />,
});
import OneOnOneStatus from "@/components/OneOnOneStatus";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export default function InterviewDetails() {
  const params = useParams();
  const id = params.id as string;

  const [interview, setInterview] = useState<any | null>(null);
  const [feedback, setFeedback] = useState<any | null>(null);
  const [candidateName, setCandidateName] = useState("Candidate");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    const timeout = setTimeout(() => controller.abort(), 10000);
    setLoading(true);
    setError("");
    setInterview(null);
    setFeedback(null);
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
              "How do you configure solar strings for string inverters?",
            ],
            job_description: "Solar EPC Engineering project designer",
            company_knowledge: "Chirayu Power Pvt. Ltd. solar EPC services",
            ai_model: "gemini-2.5-flash",
            resume: "Mock candidate resume details",
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
          .abortSignal(controller.signal)
          .single();

        if (disposed) return;
        if (interviewErr || !interviewData) {
          console.error("Failed to load interview:", interviewErr);
          throw new Error(
            "We couldn’t load this interview. Please try again or check your invitation.",
          );
        }

        if (!disposed) {
          setInterview(interviewData);
          setLoading(false);
        }
        // Feedback is optional for entering the room. Do not put it on the critical path.
      } catch (err) {
        if (!disposed)
          setError(
            err instanceof Error
              ? err.message
              : "Couldn’t load your interview. Please try again.",
          );
      } finally {
        clearTimeout(timeout);
        if (!disposed) setLoading(false);
      }
    };

    if (id) {
      void loadData();
      if (isSupabaseConfigured) {
        void supabase
          .from("feedback")
          .select("id")
          .eq("interview_id", id)
          .limit(1)
          .abortSignal(controller.signal)
          .then(({ data }) => {
            if (!disposed && data?.[0]) setFeedback(data[0]);
          });
      }
    }
    return () => {
      disposed = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [id, attempt]);

  if (loading) return <PortalLoading />;
  if (error)
    return (
      <section className="mx-auto max-w-xl px-8 py-16" role="alert">
        <h1 className="mb-3 text-xl font-medium">Let’s try that again</h1>
        <p className="text-sm text-slate-500">{error}</p>
        <button
          onClick={() => setAttempt((a) => a + 1)}
          className="mt-6 rounded-lg bg-primary-blue px-5 py-2.5 text-sm text-white"
        >
          Retry loading
        </button>
      </section>
    );

  if (!interview) {
    return null;
  }

  if (interview.mode === "one_on_one") {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="mb-6 text-2xl">{interview.role} interview</h1>
        <OneOnOneStatus interview={interview} />
      </div>
    );
  }
  return (
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
  );
}
