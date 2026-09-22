"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Sparkles, Send, CheckCircle2 } from "lucide-react";
import { useHrSession } from "@/hooks/use-hr-session";
import { hrFetch } from "@/lib/hrApi";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ROUND_LABELS, roundSchema, type Round } from "@/lib/hiring/schema";

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
  const searchParams = useSearchParams();
  const round: Round = roundSchema.safeParse(searchParams.get("round")).data ?? "screening";
  const router = useRouter();
  const { session, loading, accessToken } = useHrSession();

  const [interview, setInterview] = useState<any | null>(null);
  // The round's own row from round_notes — carries ai_draft, hr_notes, submitted_at for
  // THIS round specifically (json.interview only ever pre-fills the screening round, for
  // backward compatibility with the original one-on-one flow).
  const [roundRow, setRoundRow] = useState<any | null>(null);
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
        const row = (json.round_notes || []).find((rn: any) => rn.round === round) || null;
        setRoundRow(row);
        const base = row?.hr_notes || row?.ai_draft;
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
  }, [accessToken, id, round]);

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
        body: JSON.stringify({ hr_notes, round }),
      });
      if (json.success) {
        toast.success("Report submitted and emailed to HR and the candidate.");
        setRoundRow((prev: any) => ({ ...(prev || {}), hr_notes, submitted_at: new Date().toISOString() }));
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

  const alreadySubmitted = !!roundRow?.submitted_at;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-dark-100">Interview report — {ROUND_LABELS[round]}</h1>
        <p className="text-xs text-soft-gray">{interview.role} · {interview.candidate_name}</p>
      </div>

      {alreadySubmitted && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-success-green text-xs font-semibold px-4 py-3 rounded-xl">
          <CheckCircle2 size={15} />
          Submitted {roundRow?.submitted_at ? new Date(roundRow.submitted_at).toLocaleString() : ""} — editing and resubmitting sends an updated report email.
        </div>
      )}

      {roundRow?.ai_draft && (
        <div className="bg-blue-50/60 border border-primary-blue/20 rounded-2xl p-5 space-y-2">
          <h2 className="text-sm font-bold text-primary-blue flex items-center gap-1.5"><Sparkles size={14} /> AI-drafted notes (captured live)</h2>
          <p className="text-xs text-dark-100">{roundRow.ai_draft.summary}</p>
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
