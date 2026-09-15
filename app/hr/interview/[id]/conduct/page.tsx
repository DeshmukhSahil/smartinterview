"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, ExternalLink, Mic, MicOff, ArrowRight, Sparkles } from "lucide-react";
import { useHrSession } from "@/hooks/use-hr-session";
import { hrFetch } from "@/lib/hrApi";
import { useSpeechTranscript } from "@/hooks/use-speech-transcript";
import { cn } from "@/lib/utils";

// The AI "listens throughout" this way: this page runs continuous browser speech-to-text
// (the same mechanism the AI-assisted interview uses) on the HR side while the actual
// interview happens in Teams, periodically flushing the captured transcript to the
// server, which re-drafts AI notes shown live below. See the plan's note on why this is
// mic-pickup-dependent rather than a true Teams-side transcript.
const FLUSH_INTERVAL_MS = 25000;

export default function HrConductInterviewPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { session, loading, accessToken } = useHrSession();

  const [interview, setInterview] = useState<any | null>(null);
  const [fetching, setFetching] = useState(true);
  const [callActive, setCallActive] = useState(false);
  const [transcriptLog, setTranscriptLog] = useState<{ role: "unknown"; content: string }[]>([]);
  const [notes, setNotes] = useState<any | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { isListening, userAnswer, setUserAnswer, interimText, forceStartListening, stopListening } = useSpeechTranscript({
    active: callActive, paused: false, micPermission: "granted",
  });

  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!loading && !session) router.replace("/hr/login");
  }, [loading, session, router]);

  useEffect(() => {
    if (!accessToken) return;
    (async () => {
      try {
        const json = await hrFetch(accessToken, `/api/hiring/interview/${id}`);
        setInterview(json.interview);
        setTranscriptLog(json.interview.live_transcript || []);
        setNotes(json.interview.ai_notes || null);
      } catch (e: any) {
        toast.error(e.message || "Failed to load interview");
      } finally {
        setFetching(false);
      }
    })();
  }, [accessToken, id]);

  const flush = async (finalChunk?: string) => {
    if (!accessToken) return;
    const pending = (finalChunk ?? userAnswer).trim();
    const nextLog = pending ? [...transcriptLog, { role: "unknown" as const, content: pending }] : transcriptLog;
    if (pending) {
      setTranscriptLog(nextLog);
      setUserAnswer("");
    }
    if (nextLog.length === 0) return;
    setRefreshing(true);
    try {
      const json = await hrFetch(accessToken, `/api/hiring/interview/${id}/notes/draft`, {
        method: "POST",
        body: JSON.stringify({ transcript: nextLog }),
      });
      setNotes(json.notes);
    } catch (e: any) {
      console.error("Failed to refresh AI notes", e);
    } finally {
      setRefreshing(false);
    }
  };

  const startCapturing = () => {
    setCallActive(true);
    forceStartListening();
    flushTimerRef.current = setInterval(() => { flush(); }, FLUSH_INTERVAL_MS);
  };

  const stopCapturing = async () => {
    setCallActive(false);
    stopListening();
    if (flushTimerRef.current) clearInterval(flushTimerRef.current);
    await flush();
  };

  useEffect(() => () => { if (flushTimerRef.current) clearInterval(flushTimerRef.current); }, []);

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
        <h1 className="text-xl font-bold text-dark-100">Conduct interview</h1>
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
        <button
          onClick={callActive ? stopCapturing : startCapturing}
          className={cn(
            "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition border",
            callActive ? "bg-red-50 border-red-200 text-red-600" : "bg-success-green text-white border-transparent"
          )}
        >
          {callActive ? <><MicOff size={15} /> Stop AI note capture</> : <><Mic size={15} /> Start AI note capture</>}
        </button>
      </div>

      <p className="text-xs text-soft-gray bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        Note capture uses your browser&apos;s microphone, best picked up when your speaker/audio is on during the Teams call — it is a best-effort live draft, not an official Teams transcript. Review and edit the notes before submitting the report.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white border border-border-gray rounded-2xl p-5 h-80 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-dark-100">Live transcript</h2>
            <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border", isListening ? "bg-green-50 border-green-200 text-success-green" : "bg-gray-50 border-border-gray text-soft-gray")}>
              {isListening ? "Listening" : "Paused"}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 text-xs text-dark-100">
            {transcriptLog.map((t, i) => <p key={i} className="leading-relaxed">{t.content}</p>)}
            {(userAnswer || interimText) && (
              <p className="italic text-soft-gray">{userAnswer} {interimText}</p>
            )}
            {transcriptLog.length === 0 && !userAnswer && !interimText && (
              <p className="text-soft-gray">Start note capture to begin transcribing.</p>
            )}
          </div>
        </div>

        <div className="bg-white border border-border-gray rounded-2xl p-5 h-80 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-dark-100 flex items-center gap-1.5"><Sparkles size={14} className="text-primary-blue" /> AI draft notes</h2>
            {refreshing && <Loader2 className="animate-spin size-3.5 text-soft-gray" />}
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
        href={`/hr/interview/${id}/report`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-blue"
      >
        Go to report <ArrowRight size={14} />
      </Link>
    </div>
  );
}
