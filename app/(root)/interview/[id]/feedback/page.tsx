"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dayjs from "dayjs";
import { Button } from "@/components/ui/button";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Award, Calendar, CheckCircle, AlertTriangle, ArrowLeft, RotateCcw, Loader2 } from "lucide-react";

export default function FeedbackPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [interview, setInterview] = useState<any | null>(null);
  const [feedback, setFeedback] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFeedbackData = async () => {
      try {
        if (!isSupabaseConfigured) {
          // Fallback mock data for local testing
          setInterview({
            role: "Solar Design Engineer",
          });
          setFeedback({
            id: "mock-feedback-id",
            interviewId: id,
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
          });
          setLoading(false);
          return;
        }

        // Fetch interview details
        const { data: interviewData, error: interviewErr } = await supabase
          .from("interviews")
          .select("role")
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
          const raw = feedbackData[0];
          const analysis = raw.analysis || {};
          setFeedback({
            id: raw.id,
            interviewId: raw.interview_id,
            totalScore: analysis.totalScore || 0,
            categoryScores: analysis.categoryScores || [],
            strengths: analysis.strengths || [],
            areasForImprovement: analysis.areasForImprovement || [],
            finalAssessment: analysis.finalAssessment || "",
            createdAt: raw.created_at
          });
        }
      } catch (err) {
        console.error("Failed to load feedback view:", err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadFeedbackData();
    }
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-40 gap-4">
        <Loader2 className="animate-spin text-primary-blue h-8 w-8" />
        <span className="text-xs text-soft-gray font-semibold">
          Compiling Assessment Metrics...
        </span>
      </div>
    );
  }

  if (!interview) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 text-dark-100 animate-fadeIn">
      {/* Title Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-dark-100">
          Evaluation Report: <span className="capitalize text-primary-blue">{interview.role}</span>
        </h1>
        <p className="text-sm text-soft-gray">
          Completed assessment performance analytics and evaluation details.
        </p>
      </div>

      {/* Meta Score Widget */}
      <div className="bg-white border border-border-gray p-6 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-wrap justify-center md:justify-start gap-6 text-sm font-semibold">
          {/* Overall Score */}
          <div className="flex items-center gap-2 bg-green-50 border border-success-green/20 text-success-green px-4 py-2 rounded-xl">
            <Award size={18} />
            <span>
              Overall Performance: <span className="font-extrabold">{feedback?.totalScore || 0}</span>/100
            </span>
          </div>

          {/* Date Completed */}
          <div className="flex items-center gap-2 bg-gray-50 border border-border-gray text-soft-gray px-4 py-2 rounded-xl">
            <Calendar size={18} />
            <span>
              {feedback?.createdAt
                ? dayjs(feedback.createdAt).format("MMM D, YYYY h:mm A")
                : "N/A"}
            </span>
          </div>
        </div>

        {/* Score Progress Bar Meter */}
        <div className="w-full md:w-1/3 flex flex-col gap-1.5">
          <div className="flex justify-between text-xs text-soft-gray font-bold pl-1">
            <span>Progress Score</span>
            <span>{feedback?.totalScore || 0}%</span>
          </div>
          <div className="w-full h-3 bg-gray-100 border border-border-gray rounded-full overflow-hidden">
            <div
              className="h-full bg-success-green rounded-full transition-all duration-500"
              style={{ width: `${(feedback?.totalScore || 0)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Final Summary Assessment Text */}
      <div className="bg-white border border-border-gray p-6 rounded-2xl shadow-sm space-y-2">
        <h2 className="text-lg font-bold text-dark-100">Executive Summary Assessment</h2>
        <p className="text-sm text-soft-gray leading-relaxed italic">
          &quot;{feedback?.finalAssessment || "No final assessment summary is available for this session."}&quot;
        </p>
      </div>

      {/* Performance Categories Grid Breakdown */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-dark-100 border-b border-border-gray pb-2">
          Assessment Metric Breakdown
        </h2>
        {feedback?.categoryScores && feedback.categoryScores.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {feedback.categoryScores.map((category: any, index: number) => {
              const strokeColor = category.score >= 70 ? "bg-success-green" : category.score >= 50 ? "bg-solar-yellow" : "bg-red-500";
              return (
                <div
                  key={index}
                  className="bg-white border border-border-gray p-5 rounded-2xl shadow-xs flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-sm text-dark-100">
                        {category.name}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-gray-50 border border-border-gray text-soft-gray">
                        {category.score}/100
                      </span>
                    </div>
                    <p className="text-xs text-soft-gray mt-2 leading-relaxed">
                      {category.comment}
                    </p>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${strokeColor} rounded-full`}
                      style={{ width: `${category.score}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center bg-white border border-border-gray p-10 rounded-2xl text-soft-gray shadow-sm">
            Detailed category ratings are not available for this interview.
          </div>
        )}
      </div>

      {/* Strengths & Improvements Columns */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Strengths Card */}
        <div className="bg-white border border-border-gray p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-base font-bold text-success-green flex items-center gap-2 pb-2 border-b border-border-gray">
            <CheckCircle size={18} />
            Key Strengths
          </h3>
          {feedback?.strengths && feedback.strengths.length > 0 ? (
            <ul className="space-y-2.5">
              {feedback.strengths.map((item: string, i: number) => (
                <li key={i} className="text-xs text-soft-gray leading-relaxed flex items-start gap-2">
                  <span className="text-success-green font-bold select-none">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-soft-gray italic">No specific strengths listed.</p>
          )}
        </div>

        {/* Improvements Card */}
        <div className="bg-white border border-border-gray p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-base font-bold text-amber-600 flex items-center gap-2 pb-2 border-b border-border-gray">
            <AlertTriangle size={18} />
            Areas for Improvement
          </h3>
          {feedback?.areasForImprovement && feedback.areasForImprovement.length > 0 ? (
            <ul className="space-y-2.5">
              {feedback.areasForImprovement.map((item: string, i: number) => (
                <li key={i} className="text-xs text-soft-gray leading-relaxed flex items-start gap-2">
                  <span className="text-amber-500 font-bold select-none">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-soft-gray italic">No immediate areas for improvement specified.</p>
          )}
        </div>
      </div>

      {/* Retake & Action Buttons Panel */}
      <div className="bg-white border border-border-gray rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-soft-gray font-medium text-center sm:text-left leading-relaxed">
          Need to retry? You can relaunch this specific interview structure or return to the dashboard.
        </div>
        <div className="flex gap-3 w-full sm:w-auto shrink-0">
          <Button asChild className="btn-secondary !h-10 text-xs gap-1.5 flex-1 sm:flex-none">
            <Link href="/">
              <ArrowLeft size={14} />
              <span>Dashboard</span>
            </Link>
          </Button>
          <Button asChild className="btn-primary !h-10 text-xs gap-1.5 flex-1 sm:flex-none">
            <Link href={`/interview/${id}`}>
              <RotateCcw size={14} />
              <span>Retake Interview</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
