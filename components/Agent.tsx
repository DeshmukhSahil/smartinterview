"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dayjs from "dayjs";
import {
  Video, VideoOff, Mic, MicOff, HelpCircle,
  Award, CheckCircle, AlertTriangle, ArrowLeft,
  RotateCcw, ExternalLink, Loader2, Trophy, Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createFeedback } from "@/lib/actions/general.action";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { resolveHumanizerTokens } from "@/lib/humanizerTokens";
import { toast } from "sonner";

// ─── Audio Visualizer ─────────────────────────────────────────────────────────

const AudioVisualizer = ({ volume, isActive }: { volume: number; isActive: boolean }) => {
  const barCount = 5;
  return (
    <div className="flex items-center gap-0.5 h-4 px-1" title="Real-time Microphone Level Indicator">
      {[...Array(barCount)].map((_, i) => {
        const scaleFactor = [0.4, 0.7, 1.0, 0.8, 0.5][i];
        const height = isActive ? Math.max(3, Math.round((volume * scaleFactor) / 4)) : 3;
        return (
          <span
            key={i}
            className={cn(
              "w-[3px] rounded-full transition-all duration-75",
              isActive && volume > 3 ? "bg-success-green" : "bg-soft-gray/40"
            )}
            style={{ height: `${height}px` }}
          />
        );
      })}
    </div>
  );
};

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
  const [lastMessage, setLastMessage] = useState<string>("");
  const [cameraOn, setCameraOn] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Transcript & scrolling
  const [interimTranscript, setInterimTranscript] = useState<string>("");
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Voice selection
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  const callStatusRef = useRef(callStatus);
  const isSpeakingRef = useRef(isSpeaking);
  const handleUserSpeechRef = useRef<any>(null);

  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [micVolume, setMicVolume] = useState<number>(0);
  const [micPermission, setMicPermission] = useState<"prompt" | "granted" | "denied">("prompt");
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [userAnswer, setUserAnswer] = useState<string>("");
  const [interimText, setInterimText] = useState<string>("");

  // Feedback modal state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [feedbackData, setFeedbackData] = useState<FeedbackData | null>(null);

  // ─── Sync Refs ───────────────────────────────────────────────────────────────

  useEffect(() => { callStatusRef.current = callStatus; }, [callStatus]);
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, interimTranscript]);

  // ─── Microphone Access ───────────────────────────────────────────────────────

  const requestMicAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      setMicStream(stream);
      setMicPermission("granted");

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
      setMicPermission("denied");
      setMicVolume(0);
      return null;
    }
  };

  useEffect(() => {
    // requestMicAccess();
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  // ─── Speech Recognition & Synthesis Setup ────────────────────────────────────

  useEffect(() => {
    if (typeof window === "undefined") return;
    synthRef.current = window.speechSynthesis;

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      if (availableVoices.length > 0 && !selectedVoiceURI) {
        const enVoice = availableVoices.find((v) => v.lang.startsWith("en"));
        setSelectedVoiceURI(enVoice ? enVoice.voiceURI : availableVoices[0].voiceURI);
      }
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const createRecognition = () => {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "en-US";

        let processedIndex = 0;

        rec.onresult = (event: any) => {
          let interimText = "";
          let finalText = "";
          for (let i = processedIndex; i < event.results.length; ++i) {
            const chunk = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalText += chunk + " ";
            } else {
              interimText += chunk;
            }
          }
          const newSpeech = finalText.trim();
          if (newSpeech) {
            setUserAnswer((prev) => {
              const space = prev && !prev.endsWith(" ") ? " " : "";
              return prev + space + newSpeech;
            });
            processedIndex = event.results.length;
          }
          setInterimText(interimText.trim());
        };

        rec.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          if (event.error !== "no-speech") setIsListening(false);
        };

        rec.onend = () => {
          setIsListening(false);
          processedIndex = 0;
          if (callStatusRef.current === CallStatus.ACTIVE && !isSpeakingRef.current) {
            try { rec.start(); setIsListening(true); } catch (e) {}
          }
        };
        return rec;
      };
      recognitionRef.current = createRecognition();
    } else {
      console.warn("Speech Recognition API not supported in this browser.");
    }
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
    const newUserMsg: SavedMessage = { role: "user", content: transcript };
    setMessages((prev) => [...prev, newUserMsg]);
    setLastMessage(transcript);
    setIsSpeaking(true);
    setIsThinking(true);
    stopListening();

    try {
      // Format questions as topics (no Q1/Q2 labels — the AI must weave them in naturally)
      const questionTopics = questions
        ? questions.map((q: string) => `- ${q}`).join("\n")
        : "";

      let coreGuidelines = propSystemPrompt || `You are an experienced human interviewer conducting a real job interview. Your name is Alex. You speak in a warm, natural, conversational way — never robotic or scripted.`;

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
9. Mirror the candidate's energy — if they're detailed, appreciate it; if they're brief, probe gently.`;

      const response = await fetch("/api/chat/local", {
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
      const cleanResponse = stripMarkdown(aiFullResponse);

      setMessages((prev) => [...prev, { role: "assistant", content: cleanResponse }]);
      setLastMessage(cleanResponse);
      speakText(cleanResponse);
    } catch (error: any) {
      console.error("Error fetching AI response", error);
      toast.error(error?.message || "Failed to communicate with the local model.");
      setIsSpeaking(false);
      setIsThinking(false);
      startListening();
    }
  };

  const submitAnswer = () => {
    if (!userAnswer.trim()) return;
    const textToSend = userAnswer.trim();
    setUserAnswer("");
    setInterimText("");
    handleUserSpeech(textToSend);
  };

  useEffect(() => {
    handleUserSpeechRef.current = handleUserSpeech;
  }, [handleUserSpeech]);

  // ─── Speech Synthesis ────────────────────────────────────────────────────────

  const speakText = (text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    stopListening();

    const utterance = new SpeechSynthesisUtterance(text);
    if (selectedVoiceURI) {
      const selectedVoice = voices.find((v) => v.voiceURI === selectedVoiceURI);
      if (selectedVoice) utterance.voice = selectedVoice;
    }
    utterance.onend = () => { 
      setIsSpeaking(false); 
      if (typeof window !== "undefined") {
        window.parent.postMessage({ type: "AI_SPEAKING_STOP" }, "*");
      }
      startListening(); 
    };
    utterance.onerror = () => { 
      setIsSpeaking(false); 
      if (typeof window !== "undefined") {
        window.parent.postMessage({ type: "AI_SPEAKING_STOP" }, "*");
      }
      startListening(); 
    };
    synthRef.current.speak(utterance);
    setIsSpeaking(true);
    if (typeof window !== "undefined") {
      window.parent.postMessage({ type: "AI_SPEAKING_START" }, "*");
    }
  };

  const startListening = () => {
    if (micPermission === "granted" && recognitionRef.current && callStatus === CallStatus.ACTIVE) {
      try { recognitionRef.current.start(); setIsListening(true); } catch (e) {}
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      setIsListening(false);
    }
  };

  // ─── Camera ───────────────────────────────────────────────────────────────────

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (error) {
      console.error("Error accessing camera:", error);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const toggleCamera = () => {
    cameraOn ? stopCamera() : startCamera();
    setCameraOn(!cameraOn);
  };

  useEffect(() => { return () => stopCamera(); }, []);

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

    // Show modal immediately in generating state
    setShowFeedbackModal(true);
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
      } else {
        // Mock feedback for local dev
        loaded = {
          totalScore: 85,
          categoryScores: [
            { name: "Communication Skills", score: 80, comment: "Clear, articulated replies with logical structure." },
            { name: "Technical Knowledge", score: 90, comment: "Demonstrated strong grasp of concepts." },
            { name: "Problem-Solving", score: 85, comment: "Able to outline a structured approach." },
            { name: "Cultural Fit", score: 85, comment: "Aligns well with company values." },
            { name: "Confidence & Clarity", score: 85, comment: "Maintained a professional, positive tone." },
          ],
          strengths: ["Strong analytical thinking", "Clear communication", "Good problem decomposition"],
          areasForImprovement: ["Could elaborate on edge cases", "More depth on technical specifics"],
          finalAssessment: "A strong candidate who demonstrates clear potential and good foundational skills.",
          createdAt: new Date().toISOString(),
        };
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
    // Microphone access is now optional and not requested or required to launch a session
    setCallStatus(CallStatus.ACTIVE);

    // Build a warm, personal, human-sounding opening that immediately starts the conversation
    const candidateFirstName = (userName || "there").split(" ")[0];
    const roleLabel = role ? role : "this role";
    const openingLines = [
      `Hi ${candidateFirstName}, welcome! I'm Alex. Thanks so much for taking the time today — really appreciate it. So, to kick things off, I'd love to hear a little about yourself and what drew you to this ${roleLabel} opportunity.`,
      `Hey ${candidateFirstName}, great to have you here. I'm Alex, and I'll be chatting with you today. Before we dive into the specifics, could you just walk me through your background and what's been exciting you most in your career lately?`,
      `Hi ${candidateFirstName}! I'm Alex — thanks for joining. Let's keep this conversational and relaxed. To start, I'd love to hear a bit about your journey so far and what specifically attracted you to the ${roleLabel} position.`,
    ];
    const welcomeMsg = openingLines[Math.floor(Math.random() * openingLines.length)];
    setMessages([{ role: "assistant", content: welcomeMsg }]);
    setLastMessage(welcomeMsg);
    speakText(welcomeMsg);
  };

  const handleDisconnect = () => {
    if (synthRef.current) synthRef.current.cancel();
    if (typeof window !== "undefined") {
      window.parent.postMessage({ type: "AI_SPEAKING_STOP" }, "*");
    }
    stopListening();
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

      <div className="flex flex-col gap-4 w-full">


        <div className="flex flex-col lg:flex-row gap-8 items-start w-full">
          {/* Left Column: Call Interface */}
          <div className="flex-1 w-full flex flex-col gap-6">
            <div className="call-view">
              {/* AI Interviewer Card */}
              <div className="card-interviewer relative bg-white border border-border-gray rounded-2xl shadow-sm p-6 flex flex-col justify-center items-center">
                <div className="avatar size-32 rounded-full border border-border-gray bg-gray-50 flex items-center justify-center relative">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary-blue">
                    <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
                    <path d="M4 10H20M4 15H20M10 4V20M15 4V20" stroke="currentColor" strokeWidth="1" />
                    <circle cx="12" cy="12" r="2" fill="#F4B400" />
                  </svg>
                  {isSpeaking && <span className="animate-speak" />}
                </div>
                <h3 className="text-dark-100 font-bold text-base mt-4">AI Panel Interviewer</h3>
                <span className="text-xs text-soft-gray">Chirayu Power Assistant</span>
              </div>

              {/* User Profile Card with Video */}
              <div className="card-border bg-white border border-border-gray rounded-2xl shadow-sm p-1">
                <div className="card-content relative flex flex-col items-center justify-center p-6 h-[310px]">
                  {cameraOn ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="rounded-xl object-cover size-[190px] border border-border-gray shadow-inner"
                    />
                  ) : (
                    <div className="size-[190px] rounded-full border border-border-gray bg-gray-50 flex items-center justify-center shadow-inner relative overflow-hidden">
                      <Image src="/userProfile.jpg" alt="User Profile" fill className="object-cover" />
                    </div>
                  )}
                  <h3 className="text-dark-100 font-bold text-base mt-4">{userName || "Candidate"}</h3>
                  <span className="text-xs text-soft-gray">Interview Participant</span>

                  {/* Mic Activity Visualizer */}
                  <div className="mt-4 flex flex-col items-center gap-1">
                    <div className="flex items-center gap-2 bg-gray-50 border border-border-gray px-3 py-1.5 rounded-full shadow-2xs">
                      <button
                        onClick={micPermission === "denied" ? requestMicAccess : undefined}
                        className={cn(
                          "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border transition-all duration-200",
                          micPermission === "denied"
                            ? "bg-red-50 border-red-200 text-red-500 hover:bg-red-100 cursor-pointer"
                            : isListening && micVolume > 3
                            ? "bg-green-50 border-green-200 text-success-green animate-pulse"
                            : "bg-gray-50 border-gray-200 text-soft-gray"
                        )}
                        title={micPermission === "denied" ? "Click to request microphone access again" : undefined}
                      >
                        {micPermission === "denied"
                          ? "Mic Blocked"
                          : !isListening
                          ? "Mic Muted"
                          : micVolume > 3
                          ? "Speaking"
                          : "Mic Working"}
                      </button>
                      {isListening && micPermission === "granted" && (
                        <AudioVisualizer volume={micVolume} isActive={isListening} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Unified Control Bar */}
            <div className="bg-white border border-border-gray shadow-sm px-6 py-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
              {/* Left: Voice Selection */}
              <div className="flex items-center gap-2">
                <span className="text-soft-gray text-[10px] font-bold uppercase tracking-wider">Voice Profile:</span>
                <select
                  value={selectedVoiceURI}
                  onChange={(e) => setSelectedVoiceURI(e.target.value)}
                  className="bg-gray-50 border border-border-gray text-dark-100 px-3 py-1.5 rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary-blue max-w-[180px] font-semibold"
                >
                  {voices.map((voice) => (
                    <option key={voice.voiceURI} value={voice.voiceURI}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))}
                </select>
              </div>

              {/* Center: Call Actions */}
              <div className="flex items-center justify-center">
                {callStatus !== CallStatus.ACTIVE ? (
                  <button
                    className="bg-success-green hover:bg-success-green/90 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition shadow-xs cursor-pointer uppercase tracking-wider"
                    onClick={handleCall}
                    disabled={callStatus === CallStatus.FINISHED}
                  >
                    {callStatus === CallStatus.INACTIVE ? "Launch Session" : callStatus === CallStatus.FINISHED ? "Session Ended" : "Connecting..."}
                  </button>
                ) : (
                  <button
                    className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition shadow-xs cursor-pointer uppercase tracking-wider"
                    onClick={handleDisconnect}
                  >
                    End Session
                  </button>
                )}
              </div>

              {/* Right: Mic & Camera Toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    if (isListening) {
                      stopListening();
                    } else {
                      if (micPermission !== "granted") {
                        const stream = await requestMicAccess();
                        if (stream) {
                          if (recognitionRef.current && callStatus === CallStatus.ACTIVE) {
                            try { recognitionRef.current.start(); setIsListening(true); } catch (e) {}
                          }
                        }
                      } else {
                        startListening();
                      }
                    }
                  }}
                  className={cn(
                    "p-2.5 rounded-xl text-soft-gray transition-all border cursor-pointer",
                    isListening
                      ? "bg-red-50 border-red-200 text-red-500 shadow-xs"
                      : "bg-gray-50 border-border-gray hover:bg-gray-100 text-soft-gray"
                  )}
                  disabled={callStatus !== CallStatus.ACTIVE}
                  title={isListening ? "Mute Microphone" : "Unmute Microphone"}
                >
                  {isListening ? <Mic size={16} /> : <MicOff size={16} />}
                </button>
                <button
                  onClick={toggleCamera}
                  className={cn(
                    "p-2.5 rounded-xl transition-all border cursor-pointer",
                    cameraOn
                      ? "bg-blue-50 border-blue-200 text-primary-blue"
                      : "bg-gray-50 border-border-gray hover:bg-gray-100 text-soft-gray"
                  )}
                  title={cameraOn ? "Turn Camera Off" : "Turn Camera On"}
                >
                  {cameraOn ? <VideoOff size={16} /> : <Video size={16} />}
                </button>
              </div>
            </div>

            {/* Subtitles (when not active) */}
            {callStatus !== CallStatus.ACTIVE && messages.length > 0 && !isThinking && (
              <div className="transcript-border">
                <div className="transcript bg-gray-50">
                  <p className="animate-fadeIn text-dark-100 font-medium">{lastMessage}</p>
                </div>
              </div>
            )}

            {/* Active Session Panel */}
            {callStatus === CallStatus.ACTIVE && (
              <div className="bg-white border border-border-gray rounded-2xl p-5 shadow-xs space-y-4 w-full">
                {/* Current Question */}
                {lastMessage && !isThinking && (
                  <div className="bg-gray-50 border border-border-gray p-4 rounded-xl">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-soft-gray block mb-1">
                      Current Question
                    </span>
                    <p className="text-sm font-semibold text-dark-100 leading-relaxed">{lastMessage}</p>
                  </div>
                )}

                {/* AI Thinking */}
                {isThinking && (
                  <div className="bg-gray-50 border border-border-gray p-4 rounded-xl flex items-center gap-2 animate-pulse">
                    <span className="size-2 bg-soft-gray rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="size-2 bg-soft-gray rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="size-2 bg-soft-gray rounded-full animate-bounce" />
                    <span className="text-xs font-semibold text-soft-gray">AI is generating next response...</span>
                  </div>
                )}

                {/* Answer Input */}
                {!isThinking && !isSpeaking && (
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-soft-gray pl-1 block">
                      Your Answer (Review & Submit)
                    </span>
                    <div className="relative border border-border-gray focus-within:border-primary-blue focus-within:ring-2 focus-within:ring-primary-blue/10 rounded-xl transition-all bg-white p-3">
                      <textarea
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            submitAnswer();
                          }
                        }}
                        placeholder="Speak your answer (we'll transcribe it here) or type directly..."
                        className="w-full min-h-[90px] bg-transparent text-sm outline-none resize-none text-dark-100 font-medium placeholder-soft-gray/50"
                      />

                      {/* Interim speech */}
                      {interimText && (
                        <div className="text-xs text-primary-blue italic animate-pulse pb-2 mb-2 border-b border-gray-100 flex items-center gap-1.5 font-medium">
                          <span className="size-1.5 rounded-full bg-primary-blue animate-ping" />
                          Listening: &quot;{interimText}&quot;
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-2 pt-2.5 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          <span className={cn("size-2 rounded-full", isListening ? "bg-success-green animate-pulse" : "bg-soft-gray/60")} />
                          <span className="text-xs text-soft-gray font-semibold">
                            {isListening ? "Speech Recognition active (Speak now)" : "Microphone paused"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {userAnswer && (
                            <button
                              onClick={() => setUserAnswer("")}
                              className="px-3 py-1.5 hover:bg-gray-50 text-soft-gray rounded-xl text-xs font-semibold border border-border-gray transition cursor-pointer"
                            >
                              Clear
                            </button>
                          )}
                          <button
                            onClick={submitAnswer}
                            disabled={!userAnswer.trim()}
                            className="bg-primary-blue hover:bg-primary-blue/90 disabled:bg-gray-100 disabled:text-soft-gray/50 disabled:cursor-not-allowed text-white font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider flex items-center transition shadow-xs cursor-pointer gap-1.5"
                          >
                            <svg className="size-3.5 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                            Submit Answer
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Speaking */}
                {isSpeaking && !isThinking && (
                  <div className="bg-blue-50/50 border border-blue-200/50 p-4 rounded-xl flex items-center gap-3 animate-fadeIn">
                    <div className="size-8 rounded-full bg-primary-blue/10 flex items-center justify-center text-primary-blue shrink-0">
                      <svg className="size-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-primary-blue leading-relaxed">
                      AI Interviewer is speaking: &quot;{lastMessage}&quot;
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Live Transcript */}
          <div className="w-full lg:w-[380px] shrink-0 bg-white border border-border-gray rounded-2xl p-6 flex flex-col h-[520px] shadow-sm">
            <h3 className="text-base font-bold text-dark-100 mb-4 flex items-center justify-between pb-3 border-b border-border-gray">
              <span>Live Session Log</span>
              {isListening && (
                <span className="flex items-center gap-1.5 text-[10px] text-success-green bg-green-50 px-2.5 py-0.5 rounded-full border border-green-200 font-bold uppercase tracking-wider">
                  <span className="size-1.5 rounded-full bg-success-green animate-pulse" />
                  Active
                </span>
              )}
            </h3>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 flex flex-col scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-soft-gray text-center p-6 space-y-2">
                  <HelpCircle className="size-8 opacity-40 text-soft-gray" />
                  <p className="text-xs text-soft-gray leading-relaxed font-medium">
                    Click &quot;Launch Session&quot; to initiate candidate conversation and live logging stream.
                  </p>
                </div>
              ) : (
                messages
                  .filter((msg) => msg.role !== "system")
                  .map((msg, i) => (
                    <div
                      key={i}
                      className={cn(
                        "p-3.5 rounded-2xl max-w-[85%] text-xs leading-relaxed transition-all duration-300",
                        msg.role === "user"
                          ? "bg-blue-50 border border-blue-200/50 text-dark-100 self-end ml-auto"
                          : "bg-gray-50 border border-border-gray text-dark-100 self-start mr-auto"
                      )}
                    >
                      <div className="text-[9px] uppercase font-bold tracking-wider mb-1 text-soft-gray opacity-80">
                        {msg.role === "user" ? "Candidate" : "Interviewer"}
                      </div>
                      <div className="whitespace-pre-line font-medium">{msg.content}</div>
                    </div>
                  ))
              )}

              {/* Interim Transcript Bubble */}
              {interimTranscript && (
                <div className="p-3.5 rounded-2xl max-w-[85%] text-xs leading-relaxed bg-blue-50/50 border border-blue-200 border-dashed text-dark-100 self-end ml-auto animate-pulse">
                  <div className="text-[9px] uppercase font-bold tracking-wider mb-1 text-primary-blue">
                    Candidate (Speaking...)
                  </div>
                  <div className="font-medium">{interimTranscript}</div>
                </div>
              )}

              {/* AI Thinking Bubble */}
              {isThinking && (
                <div className="p-3.5 rounded-2xl max-w-[85%] text-xs leading-relaxed bg-gray-50 border border-border-gray text-soft-gray self-start mr-auto animate-pulse flex items-center gap-1.5 font-medium">
                  <span className="size-1.5 rounded-full bg-soft-gray animate-bounce [animation-delay:-0.3s]" />
                  <span className="size-1.5 rounded-full bg-soft-gray animate-bounce [animation-delay:-0.15s]" />
                  <span className="size-1.5 rounded-full bg-soft-gray animate-bounce" />
                  <span>Interviewer is thinking...</span>
                </div>
              )}
              <div ref={transcriptEndRef} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Agent;