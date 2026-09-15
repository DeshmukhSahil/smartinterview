"use client";

import { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import FilterableInterviewList from "@/components/FilterableInterviewList";
import { Loader2 } from "lucide-react";

export default function AllInterviewsPage() {
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [candidateEmail, setCandidateEmail] = useState("");

  useEffect(() => {
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

          if (error) {
            console.error("Error fetching all candidate interviews:", error);
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
        console.error("Failed to load interview history:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInterviews();
  }, []);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-dark-100">All Interview Sessions</h1>
        <p className="text-sm text-soft-gray mt-1">
          Explore and filter all generated interview sheets available in your candidate portal.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-primary-blue h-8 w-8" />
        </div>
      ) : interviews.length > 0 ? (
        <FilterableInterviewList interviews={interviews} />
      ) : (
        <div className="text-center bg-white border border-border-gray p-10 rounded-2xl text-soft-gray shadow-sm font-medium">
          You don't have any interviews assigned to your email ({candidateEmail}) yet.
        </div>
      )}
    </div>
  );
}
