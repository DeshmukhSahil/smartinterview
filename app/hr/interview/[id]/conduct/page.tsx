"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, ExternalLink, ArrowRight, Sparkles, Laptop } from "lucide-react";
import { useHrSession } from "@/hooks/use-hr-session";
import { hrFetch } from "@/lib/hrApi";
import { cn } from "@/lib/utils";
import { ROUND_LABELS, roundSchema, type Round } from "@/lib/hiring/schema";

// Read-only live status, not a capture control. Notes are now captured
// automatically by AI-Transcribe on the interviewer's machine (auto-launched
// off the ERP's interview schedule, transcript_source "desktop_app"), relayed
// through the ERP into round_notes -- see lib/hiring/server.ts
// ingestRoundTranscript() and app/api/hiring/interview/[id]/notes/ingest.
// This page just polls round_notes so HR can see unattended capture is
// actually working, with no start/stop button to forget to press.
const POLL_INTERVAL_MS = 10000;

const SOURCE_LABELS: Record<string, string> = {
  desktop_app: "AI Transcribe (desktop)",
  mic: "Browser microphone",
  graph_transcript: "Teams transcript",
  manual_upload: "Manually uploaded",
};

function timeAgo(iso: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

export default function HrConductInterviewPage() {
  const params = useParams();
  const id = params.id as string;
  const searchParams = useSearchParams();
  const round: Round = roundSchema.safeParse(searchParams.get("round")).data ?? "screening";
  const router = useRouter();
  const { session, loading, accessToken } = useHrSession();

  const [interview, setInterview] = useState<any | null>(null);
  const [fetching, setFetching] = useState(true);
  const [roundRow, setRoundRow] = useState<any | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!loading && !session) router.replace("/hr/login");
  }, [loading, session, router]);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    async function load() {
      try {
        const json = await hrFetch(accessToken!, `/api/hiring/interview/${id}`);
        if (cancelled) return;
        setInterview(json.interview);
        setRoundRow((json.round_notes || []).find((rn: any) => rn.round === round) || null);
      } catch (e: any) {
        if (!cancelled) toast.error(e.message || "Failed to load interview");
      } finally {
        if (!cancelled) setFetching(false);
      }
    }
    load();
    const poll = setInterval(load, POLL_INTERVAL_MS);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => { cancelled = true; clearInterval(poll); clearInterval(clock); };
  }, [accessToken, id, round]);

  const transcriptLog = roundRow?.live_transcript || [];
  const notes = roundRow?.ai_draft || null;
  const hasCapture = !!roundRow?.updated_at;
  const staleSeconds = roundRow?.updated_at ? Math.floor((now - Date.parse(roundRow.updated_at)) / 1000) : null;

  if (loading || (session && fetching)) {
    return (
      <div className="flex justify-center py-40">
        <Loader2 className="animate-spin text-primary-blue size-8" />
      </div>
    );
  }
  if (!session || !interview) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-dark-100">Interview status — {ROUND_LABELS[round]}</h1>
        <p className="text-xs text-soft-gray">{interview.role} · {interview.candidate_name}</p>
      </div>

      <div className="bg-white border border-border-gray rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {interview.teams_join_url ? (
            <a
              href={interview.teams_join_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#5059C9] hover:bg-[#444ab3] text-white font-bold px-5 py-2.5 rounded-xl text-sm transition"
            >
              Open Teams meeting <ExternalLink size={14} />
            </a>
          ) : (
            <p className="text-xs text-soft-gray">No Teams link on this interview yet.</p>
          )}
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border",
            hasCapture && staleSeconds !== null && staleSeconds < 90
              ? "bg-green-50 border-green-200 text-success-green"
              : "bg-gray-50 border-border-gray text-soft-gray"
          )}
        >
          <Laptop size={14} />
          {hasCapture
            ? staleSeconds !== null && staleSeconds < 90
              ? "Capturing now"
              : `Last update ${timeAgo(roundRow.updated_at)}`
            : "Waiting for capture to start"}
        </span>
      </div>

      <p className="text-xs text-soft-gray bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        Notes are captured automatically by AI Transcribe on the interviewer&apos;s machine, launched from the scheduled interview time — there is nothing to start here. This page just shows that capture is happening; review and edit the notes on the report page before submitting.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white border border-border-gray rounded-2xl p-5 h-80 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-dark-100">Live transcript</h2>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border bg-gray-50 border-border-gray text-soft-gray">
              {SOURCE_LABELS[roundRow?.transcript_source] || "Not started"}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 text-xs text-dark-100">
            {transcriptLog.map((t: { content: string }, i: number) => <p key={i} className="leading-relaxed">{t.content}</p>)}
            {transcriptLog.length === 0 && (
              <p className="text-soft-gray">No transcript yet -- this fills in automatically once the scheduled interview starts.</p>
            )}
          </div>
        </div>

        <div className="bg-white border border-border-gray rounded-2xl p-5 h-80 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-dark-100 flex items-center gap-1.5"><Sparkles size={14} className="text-primary-blue" /> AI draft notes</h2>
          </div>
          {notes ? (
            <div className="flex-1 overflow-y-auto space-y-3 text-xs text-dark-100">
              <p>{notes.summary}</p>
              {notes.keyPoints?.length > 0 && (
                <div><span className="font-semibold">Key points:</span> {notes.keyPoints.join(" · ")}</div>
              )}
            </div>
          ) : (
            <p className="text-xs text-soft-gray">Notes will appear here shortly after capture starts.</p>
          )}
        </div>
      </div>

      <Link
        href={`/hr/interview/${id}/report?round=${round}`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-blue"
      >
        Go to report <ArrowRight size={14} />
      </Link>
    </div>
  );
}
