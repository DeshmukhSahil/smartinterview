"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dayjs from "dayjs";
import {
  Award, CheckCircle, AlertTriangle, ArrowLeft,
  RotateCcw, ExternalLink, Loader2, Trophy, Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createFeedback } from "@/lib/actions/general.action";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { resolveHumanizerTokens } from "@/lib/humanizerTokens";
import { useInterviewSpeech } from "@/hooks/use-interview-speech";
import InterviewRoom from "@/components/InterviewRoom";
import { toast } from "sonner";

// ─── Score Ring SVG ────────────────────────────────────────────────────────────

const ScoreRing = ({ score }: { score: number }) => {
  const r = 54;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? "#22C55E" : score >= 50 ? "#F4B400" : "#ef4444";
  const label = score >= 75 ? "Excellent" : score >= 50 ? "Good" : "Needs Work";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative size-36">
        <svg className="size-full -rotate-90" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={r} fill="none" stroke="#E2E8F0" strokeWidth="10" />
          <circle
            cx="64" cy="64" r={r} fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold text-dark-100">{score}</span>
          <span className="text-[10px] text-soft-gray font-semibold uppercase tracking-wider">/100</span>
        </div>
      </div>
      <span
        className="text-xs font-bold px-3 py-1 rounded-full border"
        style={{ color, borderColor: `${color}40`, background: `${color}10` }}
      >
        {label}
      </span>
    </div>
  );
};

// ─── Feedback Modal ────────────────────────────────────────────────────────────

interface FeedbackData {
  totalScore: number;
  categoryScores: { name: string; score: number; comment: string }[];
  strengths: string[];
  areasForImprovement: string[];
  finalAssessment: string;
  createdAt?: string;
}

const FeedbackModal = ({
  interviewId,
  role,
  feedback,
  isGenerating,
  onClose,
}: {
  interviewId: string;
  role?: string;
  feedback: FeedbackData | null;
  isGenerating: boolean;
  onClose: () => void;
}) => {
  const router = useRouter();
  const [animateIn, setAnimateIn] = useState(false);
  const [showBars, setShowBars] = useState(false);

  useEffect(() => {
    // Slight delay so the modal entrance animation is visible
    requestAnimationFrame(() => setAnimateIn(true));
    if (feedback) {
      setTimeout(() => setShowBars(true), 600);
    }
  }, [feedback]);

  // Lock body scroll when modal open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-dark-100/60 backdrop-blur-sm"
        style={{
          opacity: animateIn ? 1 : 0,
          transition: "opacity 0.4s ease",
        }}
        onClick={onClose}
      />

      {/* Modal Panel */}
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col"
        style={{
          transform: animateIn ? "translateY(0) scale(1)" : "translateY(40px) scale(0.96)",
          opacity: animateIn ? 1 : 0,
          transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease",
        }}
      >
        {/* Header Banner */}
        <div className="relative overflow-hidden rounded-t-3xl bg-gradient-to-br from-primary-blue to-[#0c6fd1] px-8 py-8 flex flex-col items-center text-white text-center gap-3">
          {/* Decorative circles */}
          <div className="absolute -top-8 -right-8 size-40 rounded-full bg-white/5" />
          <div className="absolute -bottom-10 -left-10 size-48 rounded-full bg-white/5" />

          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="size-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/20">
              <Trophy className="size-7 text-solar-yellow" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                Interview Complete!
              </h2>
              <p className="text-sm text-white/70 mt-1 capitalize">
                {role ? `${role} — Performance Assessment` : "Performance Assessment Ready"}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 md:p-8 space-y-8">
          {isGenerating ? (
            /* Generating State */
            <div className="flex flex-col items-center justify-center py-16 gap-6">
              <div className="relative size-24 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-primary-blue/20" />
                <div className="absolute inset-0 rounded-full border-4 border-primary-blue border-t-transparent animate-spin" />
                <Star className="size-8 text-primary-blue" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-base font-bold text-dark-100">Analysing Your Interview…</p>
                <p className="text-xs text-soft-gray max-w-xs">
                  Our AI is carefully reviewing your transcript and generating a personalised performance report.
                </p>
              </div>
              {/* Animated dots */}
              <div className="flex gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className="size-2 rounded-full bg-primary-blue/40 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          ) : feedback ? (
            <>
              {/* Overall Score + Date */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-gray-50 rounded-2xl border border-border-gray p-6">
                <ScoreRing score={feedback.totalScore} />
                <div className="flex-1 space-y-3 w-full">
                  <div className="flex items-center gap-2 text-sm font-semibold text-dark-100">
                    <Award size={16} className="text-solar-yellow" />
                    <span>Overall Performance Score</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: showBars ? `${feedback.totalScore}%` : "0%",
                        background: feedback.totalScore >= 75
                          ? "linear-gradient(90deg,#22C55E,#16a34a)"
                          : feedback.totalScore >= 50
                          ? "linear-gradient(90deg,#F4B400,#d97706)"
                          : "linear-gradient(90deg,#ef4444,#dc2626)",
                      }}
                    />
                  </div>
                  {feedback.createdAt && (
                    <p className="text-xs text-soft-gray">
                      Completed: {dayjs(feedback.createdAt).format("MMM D, YYYY [at] h:mm A")}
                    </p>
                  )}
                </div>
              </div>

              {/* Final Assessment */}
              <div className="bg-primary-blue/5 border border-primary-blue/15 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-primary-blue mb-2 flex items-center gap-1.5">
                  <Star size={14} />
                  AI Assessment Summary
                </h3>
                <p className="text-sm text-dark-100 leading-relaxed italic">
                  &quot;{feedback.finalAssessment}&quot;
                </p>
              </div>

              {/* Category Scores */}
              {feedback.categoryScores?.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-base font-bold text-dark-100 border-b border-border-gray pb-2">
                    Skill-by-Skill Breakdown
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {feedback.categoryScores.map((cat, i) => {
                      const barColor =
                        cat.score >= 75
                          ? "bg-success-green"
                          : cat.score >= 50
                          ? "bg-solar-yellow"
                          : "bg-red-500";
                      return (
                        <div
                          key={i}
                          className="bg-white border border-border-gray rounded-xl p-4 space-y-3 hover:shadow-sm transition-shadow"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-bold text-dark-100 leading-tight">{cat.name}</span>
                            <span className="text-xs font-extrabold text-dark-100 shrink-0 bg-gray-50 border border-border-gray px-2 py-0.5 rounded-md">
                              {cat.score}/100
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all duration-1000 ease-out", barColor)}
                              style={{ width: showBars ? `${cat.score}%` : "0%" }}
                            />
                          </div>
                          <p className="text-[11px] text-soft-gray leading-relaxed">{cat.comment}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Strengths & Improvements */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Strengths */}
                <div className="bg-green-50 border border-green-200 rounded-2xl p-5 space-y-3">
                  <h3 className="text-sm font-bold text-success-green flex items-center gap-1.5 pb-2 border-b border-green-200">
                    <CheckCircle size={15} />
                    Key Strengths
                  </h3>
                  {feedback.strengths?.length > 0 ? (
                    <ul className="space-y-2">
                      {feedback.strengths.map((item, i) => (
                        <li key={i} className="text-xs text-dark-100 flex items-start gap-2 leading-relaxed">
                          <span className="text-success-green font-bold shrink-0 mt-0.5">✓</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-soft-gray italic">No specific strengths listed.</p>
                  )}
                </div>

                {/* Areas for Improvement */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
                  <h3 className="text-sm font-bold text-amber-600 flex items-center gap-1.5 pb-2 border-b border-amber-200">
                    <AlertTriangle size={15} />
                    Areas to Improve
                  </h3>
                  {feedback.areasForImprovement?.length > 0 ? (
                    <ul className="space-y-2">
                      {feedback.areasForImprovement.map((item, i) => (
                        <li key={i} className="text-xs text-dark-100 flex items-start gap-2 leading-relaxed">
                          <span className="text-amber-500 font-bold shrink-0 mt-0.5">→</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-soft-gray italic">No improvement areas specified.</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* No feedback available */
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
              <AlertTriangle className="size-10 text-amber-400" />
              <p className="text-sm font-semibold text-dark-100">Feedback could not be generated</p>
              <p className="text-xs text-soft-gray max-w-xs">
                There was an issue generating feedback for this session. You can still view your session transcript.
              </p>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="border-t border-border-gray px-6 md:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50 rounded-b-3xl">
          <p className="text-xs text-soft-gray text-center sm:text-left font-medium">
            Your responses have been evaluated and saved.
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Link
              href="/"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-primary-blue text-primary-blue text-xs font-bold hover:bg-primary-blue/5 transition-colors"
            >
              <ArrowLeft size={13} />
              Dashboard
            </Link>
            {!isGenerating && (
              <Link
                href={`/interview/${interviewId}`}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-border-gray bg-white text-dark-100 text-xs font-bold hover:bg-gray-50 transition-colors"
              >
                <RotateCcw size={13} />
                Retake
              </Link>
            )}
            {feedback && (
              <Link
                href={`/interview/${interviewId}/feedback`}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary-blue text-white text-xs font-bold hover:bg-primary-blue/90 transition-colors shadow-sm"
              >
                <ExternalLink size={13} />
                Full Report
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Enums & Types ─────────────────────────────────────────────────────────────

enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
}

interface SavedMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

// ─── Agent Component ───────────────────────────────────────────────────────────

const Agent = ({
  userName,
  userId,
  interviewId,
  feedbackId,
  type,
  questions,
  jobDescription,
  companyKnowledge,
  aiModel,
  resume,
  role,
  systemPrompt: propSystemPrompt,
}: any) => {
  const router = useRouter();
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);


  // Voice selection
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const selectedVoiceURI = "";

  const streamRef = useRef<MediaStream | null>(null);
  const cameraRequestRef = useRef(0);
  const cameraPendingRef = useRef(false);
  const mountedRef = useRef(true);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceGeneration = useRef(0);
  const handleUserSpeechRef = useRef<any>(null);

  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [micVolume, setMicVolume] = useState<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [isThinking, setIsThinking] = useState(false);

  const language = "auto";
  const [micError, setMicError] = useState("");
  const [muted, setMuted] = useState(false);
  const [voiceRate, setVoiceRate] = useState(0.95);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const sessionActiveRef = useRef(false);
  const busyRef = useRef(false);
  const chatAbortRef = useRef<AbortController | null>(null);
  const speech = useInterviewSpeech({ stream: micStream, active: callStatus === CallStatus.ACTIVE,
    paused: isSpeaking || isThinking, muted, language,
    onAnswer: (text) => handleUserSpeechRef.current?.(text),
  });


  // Feedback modal state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [feedbackData, setFeedbackData] = useState<FeedbackData | null>(null);

  // ─── Microphone Access ───────────────────────────────────────────────────────

  const requestMicAccess = async () => {
    if (micStreamRef.current?.getAudioTracks().some(t => t.readyState === "live")) return micStreamRef.current;
    setMicError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return null; }
      micStreamRef.current?.getTracks().forEach(t => t.stop());
      micStreamRef.current = stream;
      setMicStream(stream);

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const audioContext = new AudioContextClass();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateVolume = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteTimeDomainData(dataArray);
          let maxVal = 0;
          for (let i = 0; i < bufferLength; i++) {
            const val = Math.abs(dataArray[i] - 128);
            if (val > maxVal) maxVal = val;
          }
          const normalized = maxVal / 128;
          const boosted = Math.sqrt(normalized);
          setMicVolume(Math.round(boosted * 100));
          animationFrameRef.current = requestAnimationFrame(updateVolume);
        };
        updateVolume();
      }
      return stream;
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setMicVolume(0);
      setMicError("Microphone access wasn’t granted. Allow it in your browser’s site permissions, then try again.");
      return null;
    }
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current?.state !== "closed") void audioContextRef.current?.close();
      micStreamRef.current?.getTracks().forEach(t => t.stop());
      sessionActiveRef.current = false;
      chatAbortRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  // ─── Speech Synthesis (voice) Setup ───────────────────────────────────────────

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.speechSynthesis) return;
    synthRef.current = window.speechSynthesis;

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);

    };
    loadVoices();
    window.speechSynthesis?.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", loadVoices);
  }, []);

  // ─── Markdown Stripper (prevents Q1:/Q2: and **bold** being spoken aloud) ──────

  const stripMarkdown = (text: string): string => {
    return text
      // Remove **bold** and *italic*
      .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
      // Remove __underline__ and _italic_
      .replace(/_{1,2}([^_]+)_{1,2}/g, "$1")
      // Remove leading Q1:, Q2: style labels (any variation)
      .replace(/^\s*Q\d+[.:)]?\s*/gim, "")
      // Remove # headings
      .replace(/^#{1,6}\s+/gm, "")
      // Remove [text](url) links — keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Remove bullet list prefixes
      .replace(/^[\-\*\+]\s+/gm, "")
      // Remove numbered list prefixes
      .replace(/^\d+\.\s+/gm, "")
      // Collapse multiple newlines
      .replace(/\n{2,}/g, " ")
      .replace(/\n/g, " ")
      .trim();
  };

  // ─── AI Interaction ───────────────────────────────────────────────────────────

  const handleUserSpeech = async (transcript: string) => {
    if (!sessionActiveRef.current || busyRef.current) return;
    busyRef.current = true;
    const newUserMsg: SavedMessage = { role: "user", content: transcript };
    setMessages((prev) => [...prev, newUserMsg]);

    setIsSpeaking(true);
    setIsThinking(true);

    try {
      // Format questions as topics (no Q1/Q2 labels — the AI must weave them in naturally)
      const questionTopics = questions
        ? questions.map((q: string) => `- ${q}`).join("\n")
        : "";

      let coreGuidelines = propSystemPrompt || `You are an AI interviewer conducting a professional job interview. Your name is Alex. You speak in a warm, natural, conversational way — never robotic or scripted.`;

      // Resolve 1300+ humanizer tokens dynamically
      coreGuidelines = resolveHumanizerTokens(
        coreGuidelines,
        userName || "Candidate",
        role || "the position",
        "Chirayu Power Pvt. Ltd.",
        "Intermediate",
        ""
      );

      const systemPrompt = `${coreGuidelines}

ROLE BEING INTERVIEWED FOR: ${role || "the open position"}

JOB CONTEXT:
${jobDescription || "General professional role."}

CANDIDATE BACKGROUND (use this to make questions personal):
${resume || "No resume provided."}

TOPICS YOU MUST EXPLORE (treat these as conversation themes, not a question list):
${questionTopics}

STRICT RULES YOU MUST FOLLOW:
1. NEVER say "Q1", "Q2", "Question 1" or any numbered label. NEVER.
2. Ask ONLY ONE focused question per response. Never ask multiple questions at once.
3. Sound like a real human. Use natural transitions like "That's interesting — ", "I appreciate that, ", "Makes sense. Let me ask you about...", "Tell me more about...", "Great, so..."
4. Actively LISTEN to the candidate's previous answer. Reference specific things they said before moving on.
5. If their answer is vague or incomplete, ask a specific follow-up probe before moving to the next topic.
6. Keep each response SHORT — 1 to 2 sentences max. Speak like you're in a real room together.
7. NEVER use markdown formatting. No bold, no asterisks, no bullet points. Plain conversational text only.
8. When you've covered enough topics, naturally wrap up: "I think we've covered a lot of ground today. Is there anything else you'd like to add before we close?".
10. Accept English, Hindi, Marathi and code-switched answers. Preserve their meaning, never penalize transcription artifacts. Reply in the candidate's current language or natural mixture; use Devanagari for Hindi and Marathi. Identify yourself as an AI interviewer, never claim to be human.
9. Mirror the candidate's energy — if they're detailed, appreciate it; if they're brief, probe gently.`;

      const controller = new AbortController();
      chatAbortRef.current = controller;
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/chat/local`, {
        signal: controller.signal,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, newUserMsg],
          systemPrompt,
          companyKnowledge,
          aiModel,
          resume,
        }),
      });

      if (!response.ok) {
        let errText = "";
        try {
          const errJson = await response.json();
          errText = errJson.error || errJson.message || JSON.stringify(errJson);
        } catch {
          errText = await response.text();
        }
        throw new Error(errText || `Server returned status ${response.status}`);
      }

      setIsThinking(false);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let aiFullResponse = "";
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("0:")) {
              try {
                const textChunk = JSON.parse(trimmed.substring(2));
                aiFullResponse += textChunk;
              } catch (e) {
                console.error("Failed to parse stream line:", line, e);
              }
            }
          }
        }

        if (buffer) {
          const trimmed = buffer.trim();
          if (trimmed.startsWith("0:")) {
            try {
              const textChunk = JSON.parse(trimmed.substring(2));
              aiFullResponse += textChunk;
            } catch (e) {
              console.error("Failed to parse remaining stream buffer:", buffer, e);
            }
          }
        }
      }

      // Strip any markdown the model sneaked in before storing / speaking
      if (!sessionActiveRef.current) return;
      const cleanResponse = stripMarkdown(aiFullResponse);
      if (!cleanResponse) throw new Error("The interviewer returned an empty response. Please repeat your answer.");

      setMessages((prev) => [...prev, { role: "assistant", content: cleanResponse }]);

      speakText(cleanResponse);
    } catch (error: any) {
      if (!sessionActiveRef.current) return;
      console.error("Error fetching AI response", error);
      toast.error(error?.message || "Failed to communicate with the local model.");
      setIsSpeaking(false);
      setIsThinking(false);
    } finally { busyRef.current = false; }
  };

  useEffect(() => {
    handleUserSpeechRef.current = handleUserSpeech;
  }, [handleUserSpeech]);

  // ─── Speech Synthesis ────────────────────────────────────────────────────────

  const speakText = (text: string) => {
    if (!synthRef.current) { setIsSpeaking(false); return; }
    const generation = ++utteranceGeneration.current;
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const targetLanguage = /[\u0900-\u097f]/.test(text) ? (/आहे|माझ|तुमच|मध्ये|सांगा/.test(text) ? "mr-IN" : "hi-IN") : "en-IN";
    const matching = voices.filter(v => v.lang.replace("_", "-").startsWith(targetLanguage.split("-")[0]));
    const preferred = voices.find(v => v.voiceURI === selectedVoiceURI) || matching.find(v => /natural|neural/i.test(v.name)) || matching.find(v => v.lang === targetLanguage) || matching[0];
    if (preferred) utterance.voice = preferred;
    utterance.lang = preferred?.lang || targetLanguage;
    utterance.rate = voiceRate;
    utterance.pitch = 1;
    utterance.onend = () => {
      if (generation !== utteranceGeneration.current) return;
      setIsSpeaking(false);
      if (typeof window !== "undefined") {
        window.parent.postMessage({ type: "AI_SPEAKING_STOP" }, "*");
      }
    };
    utterance.onerror = (event) => {
      if (generation !== utteranceGeneration.current) return;
      if (event.error !== "canceled" && event.error !== "interrupted") toast.error("Alex’s audio couldn’t play. You can read the question and try playing it again.");
      setIsSpeaking(false);
      if (typeof window !== "undefined") {
        window.parent.postMessage({ type: "AI_SPEAKING_STOP" }, "*");
      }
    };
    synthRef.current.speak(utterance);
    setIsSpeaking(true);
    if (typeof window !== "undefined") {
      window.parent.postMessage({ type: "AI_SPEAKING_START" }, "*");
    }
  };

  // ─── Camera ───────────────────────────────────────────────────────────────────

  const startCamera = async () => {
    if (cameraPendingRef.current) return;
    cameraPendingRef.current = true;
    const requestId = ++cameraRequestRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (!mountedRef.current || requestId !== cameraRequestRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = stream;
      setCameraStream(stream);
      setCameraOn(true);
    } catch (error) {
      toast.error("Camera access was denied or no camera is available.");
    } finally { cameraPendingRef.current = false; }
  };

  const stopCamera = () => {
    cameraRequestRef.current++;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraStream(null);
    setCameraOn(false);
  };

  const toggleCamera = () => {
    cameraOn ? stopCamera() : startCamera();

  };

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; stopCamera(); }; }, []);

  // ─── Feedback Handling ────────────────────────────────────────────────────────

  const loadFeedbackFromSupabase = async () => {
    if (!isSupabaseConfigured) return null;
    try {
      const { data, error } = await supabase
        .from("feedback")
        .select("*")
        .eq("interview_id", interviewId)
        .limit(1);
      if (error || !data || data.length === 0) return null;
      const raw = data[0];
      const analysis = raw.analysis || {};
      return {
        totalScore: analysis.totalScore || 0,
        categoryScores: analysis.categoryScores || [],
        strengths: analysis.strengths || [],
        areasForImprovement: analysis.areasForImprovement || [],
        finalAssessment: analysis.finalAssessment || "",
        createdAt: raw.created_at,
      } as FeedbackData;
    } catch {
      return null;
    }
  };

  const handleGenerateFeedback = async (msgs: SavedMessage[]) => {
    if (type === "generate") {
      router.push("/");
      return;
    }

    // Keep the candidate on a calm completion screen; feedback remains available on demand.
    setShowFeedbackModal(false);
    setIsGeneratingFeedback(true);
    setCallStatus(CallStatus.FINISHED);

    try {
      await createFeedback({
        interviewId: interviewId!,
        userId: userId || "mock-user",
        transcript: msgs,
        feedbackId,
      });

      // Load the saved feedback to display in modal
      let loaded: FeedbackData | null = null;

      if (isSupabaseConfigured) {
        loaded = await loadFeedbackFromSupabase();
      }

      setFeedbackData(loaded);
    } catch (e) {
      console.error("Error generating feedback:", e);
      setFeedbackData(null);
    } finally {
      setIsGeneratingFeedback(false);
    }
  };

  // ─── Session Control ──────────────────────────────────────────────────────────

  const handleCall = async () => {
    if (type === "generate") {
      alert("Please create interviews through the API.");
      return;
    }
    if (sessionActiveRef.current || callStatus === CallStatus.CONNECTING) return;
    setCallStatus(CallStatus.CONNECTING);
    const stream = await requestMicAccess();
    if (!stream) { setCallStatus(CallStatus.INACTIVE); toast.error("Allow microphone access to join the voice interview."); return; }
    sessionActiveRef.current = true;
    setMuted(false);
    setCallStatus(CallStatus.ACTIVE);

    // Build a warm, personal, human-sounding opening that immediately starts the conversation
    const candidateFirstName = (userName || "there").split(" ")[0];
    const roleLabel = role ? role : "this role";
    const welcomeMsg = `Hi ${candidateFirstName}, I’m Alex, your AI interviewer. Take your time — to start, what drew you to this ${roleLabel} opportunity?`;
    setMessages([{ role: "assistant", content: welcomeMsg }]);

    speakText(welcomeMsg);
  };

  const handleDisconnect = () => {
    sessionActiveRef.current = false;
    chatAbortRef.current?.abort();
    setCallStatus(CallStatus.FINISHED);
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    setMicStream(null);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current?.state !== "closed") void audioContextRef.current?.close();
    if (synthRef.current) synthRef.current.cancel();
    if (typeof window !== "undefined") {
      window.parent.postMessage({ type: "AI_SPEAKING_STOP" }, "*");
    }
    stopCamera();
    handleGenerateFeedback(messages);
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Feedback Modal (renders on top when interview ends) */}
      {showFeedbackModal && (
        <FeedbackModal
          interviewId={interviewId}
          role={role}
          feedback={feedbackData}
          isGenerating={isGeneratingFeedback}
          onClose={() => {
            setShowFeedbackModal(false);
            router.push("/");
          }}
        />
      )}

      <InterviewRoom active={callStatus === CallStatus.ACTIVE} connecting={callStatus === CallStatus.CONNECTING} finished={callStatus === CallStatus.FINISHED}
        speaking={isSpeaking} thinking={isThinking} processing={speech.processing} pending={speech.recordingPending} listening={speech.listening}
        name={userName} role={role} camera={cameraOn} muted={muted} volume={micVolume} stream={cameraStream}
        feedbackLoading={isGeneratingFeedback} feedbackAvailable={!!feedbackData} onViewFeedback={() => setShowFeedbackModal(true)}
        micReady={!!micStream} micError={micError} onCheckMic={() => { void requestMicAccess(); }}
        estimatedMinutes={Math.max(10, (questions?.length || 5) * 3)}
        onInterrupt={() => { utteranceGeneration.current++; synthRef.current?.cancel(); setIsSpeaking(false); window.parent.postMessage({ type: "AI_SPEAKING_STOP" }, "*"); }}
        rate={voiceRate} setRate={setVoiceRate} messages={messages} draft={speech.draft} error={speech.error}
        provider={speech.provider} hasRetry={speech.hasRetry} onStart={handleCall} onEnd={handleDisconnect}
        onCamera={toggleCamera} onMute={() => { const next = !muted; setMuted(next); micStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !next; }); }}
        onFinish={speech.finish} onRetry={speech.retry} onDiscard={speech.discard}
        onReplay={() => speakText(callStatus === CallStatus.ACTIVE ? ([...messages].reverse().find(m => m.role === "assistant")?.content || "Could you tell me more?") : "Hi, I’m Alex. It’s lovely to meet you. If you can hear me clearly, you’re ready for our conversation.")}
      />
    </>
  );
};

export default Agent;
