"use client";
import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type {
  CandidateInvitation,
  CandidateReport,
} from "@/lib/candidate-journey";

export function useCandidateJourney() {
  const [identity, setIdentity] = useState({ name: "Candidate", email: "" });
  const [interviews, setInterviews] = useState<CandidateInvitation[]>([]);
  const [reports, setReports] = useState<CandidateReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [error, setError] = useState("");
  const [feedbackError, setFeedbackError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    let feedbackTimer: ReturnType<typeof setTimeout> | undefined;
    const timer = setTimeout(() => controller.abort(), 10000);
    setLoading(true);
    setFeedbackLoading(false);
    setError("");
    setFeedbackError(false);
    setInterviews([]);
    setReports([]);
    void (async () => {
      try {
        const email = (localStorage.getItem("candidate_email") || "")
          .trim()
          .toLowerCase();
        setIdentity({
          name: localStorage.getItem("candidate_name") || "Candidate",
          email,
        });
        if (!email) throw new Error("Please sign in using your invitation.");
        if (!isSupabaseConfigured)
          throw new Error(
            "The interview service is unavailable. Please try again later.",
          );
        const { data, error: queryError } = await supabase
          .from("interviews")
          .select(
            "id,role,mode,type,techstack,interview_status,scheduled_at,created_at",
          )
          .eq("candidate_email", email)
          .order("created_at", { ascending: false })
          .abortSignal(controller.signal);
        if (queryError) throw queryError;
        if (disposed) return;
        const rows = (data || []) as CandidateInvitation[];
        setInterviews(rows);
        setLoading(false);
        clearTimeout(timer);
        if (!rows.length) return;
        setFeedbackLoading(true);
        feedbackTimer = setTimeout(() => controller.abort(), 8000);
        try {
          const { data: feedback, error: reportError } = await supabase
            .from("feedback")
            .select("id,interview_id,created_at,analysis")
            .in(
              "interview_id",
              rows.map((i) => i.id),
            )
            .eq("user_id", "candidate-user")
            .order("created_at", { ascending: false })
            .abortSignal(controller.signal);
          if (reportError) throw reportError;
          if (disposed) return;
          const seen = new Set<string>();
          setReports(
            ((feedback || []) as CandidateReport[])
              .filter((r) => {
                if (seen.has(r.interview_id)) return false;
                seen.add(r.interview_id);
                return true;
              })
              .map((r) => ({ ...r, analysis: r.analysis || {} })),
          );
        } catch {
          if (!disposed) setFeedbackError(true);
        } finally {
          clearTimeout(feedbackTimer);
          if (!disposed) setFeedbackLoading(false);
        }
      } catch {
        if (!disposed)
          setError(
            "We couldn’t load your invitations. Your progress hasn’t changed. Please try again.",
          );
      } finally {
        clearTimeout(timer);
        if (!disposed) setLoading(false);
      }
    })();
    return () => {
      disposed = true;
      clearTimeout(timer);
      clearTimeout(feedbackTimer);
      controller.abort();
    };
  }, [attempt]);
  return {
    ...identity,
    interviews,
    reports,
    loading,
    feedbackLoading,
    error,
    feedbackError,
    now,
    retry: () => setAttempt((a) => a + 1),
  };
}
