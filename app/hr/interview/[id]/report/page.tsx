"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Sparkles, Send, CheckCircle2 } from "lucide-react";
import { useHrSession } from "@/hooks/use-hr-session";
import { hrFetch } from "@/lib/hrApi";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const RECOMMENDATIONS = [
  { value: "strong_yes", label: "Strong yes" },
  { value: "yes", label: "Yes" },
  { value: "needs_review", label: "Needs review" },
  { value: "no", label: "No" },
];

type NotesForm = {
  summary: string;
  keyPoints: string;
  strengths: string;
  concerns: string;
  followUps: string;
  recommendation: string;
};

const toLines = (items?: string[]) => (items || []).join("\n");
const fromLines = (text: string) => text.split("\n").map(s => s.trim()).filter(Boolean);

export default function HrInterviewReportPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { session, loading, accessToken } = useHrSession();

  const [interview, setInterview] = useState<any | null>(null);
  const [fetching, setFetching] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<NotesForm>({ summary: "", keyPoints: "", strengths: "", concerns: "", followUps: "", recommendation: "needs_review" });

  useEffect(() => {
    if (!loading && !session) router.replace("/hr/login");
  }, [loading, session, router]);

  useEffect(() => {
    if (!accessToken) return;
    (async () => {
      try {
        const json = await hrFetch(accessToken, `/api/hiring/interview/${id}`);
        setInterview(json.interview);
        const base = json.interview.hr_notes || json.interview.ai_notes;
        if (base) {
          setForm({
            summary: base.summary || "",
            keyPoints: toLines(base.keyPoints),
            strengths: toLines(base.strengths),
            concerns: toLines(base.concerns),
            followUps: toLines(base.followUps),
            recommendation: base.recommendation || "needs_review",
          });
        }
      } catch (e: any) {
        toast.error(e.message || "Failed to load interview");
      } finally {
        setFetching(false);
      }
    })();
  }, [accessToken, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setSubmitting(true);
    try {
      const hr_notes = {
        summary: form.summary.trim(),
        keyPoints: fromLines(form.keyPoints),
        strengths: fromLines(form.strengths),
        concerns: fromLines(form.concerns),
        followUps: fromLines(form.followUps),
        recommendation: form.recommendation,
      };
      const json = await hrFetch(accessToken, `/api/hiring/interview/${id}/notes/submit`, {
        method: "POST",
        body: JSON.stringify({ hr_notes }),
      });
      if (json.success) {
        toast.success("Report submitted and emailed to HR and the candidate.");
        setInterview((prev: any) => ({ ...prev, hr_notes, interview_status: "completed" }));
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || (session && fetching)) {
    return (
      <div className="flex justify-center py-40">
        <Loader2 className="animate-spin text-primary-blue size-8" />
      </div>
    );
  }
  if (!session || !interview) return null;

  const alreadySubmitted = interview.interview_status === "completed";

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-dark-100">Interview report</h1>
        <p className="text-xs text-soft-gray">{interview.role} · {interview.candidate_name}</p>
      </div>

      {alreadySubmitted && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-success-green text-xs font-semibold px-4 py-3 rounded-xl">
          <CheckCircle2 size={15} />
          Submitted {interview.notes_submitted_at ? new Date(interview.notes_submitted_at).toLocaleString() : ""} — editing and resubmitting sends an updated report email.
        </div>
      )}

      {interview.ai_notes && (
        <div className="bg-blue-50/60 border border-primary-blue/20 rounded-2xl p-5 space-y-2">
          <h2 className="text-sm font-bold text-primary-blue flex items-center gap-1.5"><Sparkles size={14} /> AI-drafted notes (captured live)</h2>
          <p className="text-xs text-dark-100">{interview.ai_notes.summary}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-border-gray rounded-2xl p-6 space-y-5">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-dark-100">Summary</Label>
          <textarea
            required
            value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
            className="w-full min-h-[90px] border border-border-gray rounded-xl p-3 text-sm outline-none focus:ring-1 focus:ring-primary-blue"
          />
        </div>
        {([
          ["keyPoints", "Key points"],
          ["strengths", "Strengths"],
          ["concerns", "Areas of concern"],
          ["followUps", "Suggested follow-ups"],
        ] as const).map(([field, label]) => (
          <div key={field} className="space-y-1.5">
            <Label className="text-xs font-semibold text-dark-100">{label} <span className="text-soft-gray font-normal">(one per line)</span></Label>
            <textarea
              value={form[field]}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              className="w-full min-h-[70px] border border-border-gray rounded-xl p-3 text-sm outline-none focus:ring-1 focus:ring-primary-blue"
            />
          </div>
        ))}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-dark-100">Recommendation</Label>
          <select
            value={form.recommendation}
            onChange={(e) => setForm({ ...form, recommendation: e.target.value })}
            className="w-full border border-border-gray rounded-xl p-2.5 text-sm outline-none focus:ring-1 focus:ring-primary-blue"
          >
            {RECOMMENDATIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <Button type="submit" disabled={submitting} className="w-full inline-flex items-center justify-center gap-2">
          <Send size={14} />
          {submitting ? "Submitting..." : alreadySubmitted ? "Resubmit & re-send email" : "Submit report & email candidate + HR"}
        </Button>
      </form>
    </div>
  );
}
