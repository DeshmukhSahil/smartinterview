"use client";

import { useState, useEffect } from "react";
import PortalLoading from "@/components/PortalLoading";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import FilterableInterviewList from "@/components/FilterableInterviewList";

export default function AllInterviewsPage() {
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [candidateEmail, setCandidateEmail] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    const timeout = setTimeout(() => controller.abort(), 10000);
    setLoading(true); setLoadError("");
    const email = localStorage.getItem("candidate_email") || "";
    setCandidateEmail(email);

    const fetchInterviews = async () => {
      try {
        if (!isSupabaseConfigured) {
          // Fallback mock interviews for local development
          setInterviews([
            {
              id: "1",
              role: "Solar Design Engineer",
              type: "Technical",
              mode: "ai_assisted",
              techstack: ["PVsyst", "AutoCAD", "SketchUp"],
              createdAt: new Date(Date.now() - 3600000).toISOString(),
            },
            {
              id: "2",
              role: "Operations & Maintenance Head",
              type: "Behavioral",
              mode: "ai_assisted",
              techstack: ["O&M Management", "Grid Safety", "SCADA"],
              createdAt: new Date(Date.now() - 86400000).toISOString(),
            }
          ]);
          setLoading(false);
          return;
        }

        if (email) {
          const { data, error } = await supabase
            .from("interviews")
            .select("id,role,type,techstack,created_at,mode,interview_status,scheduled_at")
            .eq("candidate_email", email.trim().toLowerCase())
            .order("created_at", { ascending: false }).abortSignal(controller.signal);

          if (disposed) return;
          if (error) {
            if (!disposed) setLoadError("Your invitations are taking longer than expected. Please try again.");
            console.error("Error fetching all candidate interviews:", error);
          } else if (data && !disposed) {
            setInterviews(data.map((doc: any) => ({
              id: doc.id,
              role: doc.role,
              type: doc.type,
              mode: doc.mode,
              techstack: doc.techstack,
              createdAt: doc.created_at,
              interviewStatus: doc.interview_status,
              scheduledAt: doc.scheduled_at,
            })));
          }
        }
      } catch (err) {
        if (disposed) return;
        if (!disposed) setLoadError("Couldn’t load your invitations. Please try again.");
        console.error("Failed to load interview history:", err);
      } finally {
        clearTimeout(timeout);
        if (!disposed) setLoading(false);
      }
    };

    void fetchInterviews();
    return () => { disposed = true; clearTimeout(timeout); controller.abort(); };
  }, [attempt]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-dark-100">All Interview Sessions</h1>
        <p className="text-sm text-soft-gray mt-1">
          Explore and filter all generated interview sheets available in your candidate portal.
        </p>
      </div>

      {loading ? (
        <PortalLoading variant="list"/>
      ) : loadError ? (<div role="alert" className="py-8 text-sm text-slate-500">{loadError}<button onClick={() => setAttempt(a => a + 1)} className="ml-4 text-primary-blue underline">Retry</button></div>) : interviews.length > 0 ? (
        <FilterableInterviewList interviews={interviews} />
      ) : (
        <div className="text-center bg-white border border-border-gray p-10 rounded-2xl text-soft-gray shadow-sm font-medium">
          You don't have any interviews assigned to your email ({candidateEmail}) yet.
        </div>
      )}
    </div>
  );
}
