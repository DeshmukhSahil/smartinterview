"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import InterviewCard from "@/components/InterviewCard";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Clock, Wallet, AlertTriangle, ClipboardCheck, ArrowRight, Loader2 } from "lucide-react";

export default function Home() {
  const [candidateName, setCandidateName] = useState("Candidate");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const email = localStorage.getItem("candidate_email") || "";
    const name = localStorage.getItem("candidate_name") || "Candidate";
    setCandidateName(name);
    setCandidateEmail(email);

    const fetchInterviews = async () => {
      try {
        if (!isSupabaseConfigured) {
          // Fallback mock interview for local development
          setInterviews([
            {
              id: "1",
              role: "Solar Design Engineer",
              type: "Technical",
              techstack: ["PVsyst", "AutoCAD", "SketchUp"],
              createdAt: new Date(Date.now() - 3600000).toISOString(),
            },
            {
              id: "2",
              role: "Operations & Maintenance Head",
              type: "Behavioral",
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
            .select("*")
            .eq("candidate_email", email.trim().toLowerCase())
            .order("created_at", { ascending: false });

          console.log("Supabase fetch returned:", { data, error });

          if (error) {
            console.error("Error fetching candidate interviews:", error);
          } else if (data) {
            setInterviews(data.map((doc: any) => ({
              id: doc.id,
              role: doc.role,
              type: doc.type,
              techstack: doc.techstack,
              createdAt: doc.created_at,
            })));
          }
        }

      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInterviews();
  }, []);

  const hasInterviews = interviews.length > 0;

  return (
    <div className="space-y-10">
      {/* Welcome & Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-dark-100">
            Welcome back, {candidateName}
          </h1>
          <p className="text-sm text-soft-gray mt-1">
            Access your assigned assessments, view evaluations, and prepare for your interview.
          </p>
        </div>
      </div>

      {/* Your Interviews Section */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold tracking-tight text-dark-100 border-b border-border-gray pb-3">
          Your Assigned Interviews
        </h2>
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="animate-spin text-primary-blue h-8 w-8" />
          </div>
        ) : hasInterviews ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {interviews.map((interview) => (
              <InterviewCard
                key={interview.id}
                userId="candidate-user"
                interviewId={interview.id}
                role={interview.role}
                type={interview.type}
                techstack={interview.techstack}
                createdAt={interview.createdAt}
              />
            ))}
          </div>
        ) : (
          <div className="text-center bg-white border border-border-gray p-10 rounded-2xl text-soft-gray shadow-sm font-medium">
            You don't have any interviews assigned to your email ({candidateEmail}) yet.
          </div>
        )}
      </section>

      {/* View All Interviews Navigation Button */}
      {hasInterviews && !loading && (
        <div className="flex justify-center pt-4">
          <Button asChild className="btn-secondary gap-2">
            <Link href="/allinterviews">
              <span>View All Interviews</span>
              <ArrowRight size={16} />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
