"use client";

import Image from "next/image";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Video, VideoOff, Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { createFeedback } from "@/lib/actions/general.action";

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
  resume, // Added prop
}: any) => {
  const router = useRouter();
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastMessage, setLastMessage] = useState<string>("");
  const [cameraOn, setCameraOn] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // New transcript and scrolling states
  const [interimTranscript, setInterimTranscript] = useState<string>("");
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Voice Selection State
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Sync refs to prevent React stale closures in speech recognition events
  const callStatusRef = useRef(callStatus);
  const isSpeakingRef = useRef(isSpeaking);
  const handleUserSpeechRef = useRef<any>(null);

  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  // Auto-scroll transcript to bottom
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, interimTranscript]);

  // Initialize Speech Recognition & Voices
  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;

      // Load available voices
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
        if (availableVoices.length > 0 && !selectedVoiceURI) {
          // Default to the first English voice or the first voice
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
          rec.continuous = false;
          rec.interimResults = true;
          rec.lang = "en-US";

          rec.onresult = (event: any) => {
            let interimText = "";
            let finalText = "";

            for (let i = event.resultIndex; i < event.results.length; ++i) {
              const transcriptChunk = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                finalText += transcriptChunk;
              } else {
                interimText += transcriptChunk;
              }
            }

            if (interimText) {
              setInterimTranscript(interimText);
            }

            if (finalText) {
              setInterimTranscript("");
              if (handleUserSpeechRef.current) {
                handleUserSpeechRef.current(finalText);
              }
            }
          };

          rec.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);
          };

          rec.onend = () => {
            setIsListening(false);
            // Auto-restart recognition if call is still active and AI is not speaking
            if (callStatusRef.current === CallStatus.ACTIVE && !isSpeakingRef.current) {
              try {
                rec.start();
                setIsListening(true);
              } catch (e) {
                // already started
              }
            }
          };

          return rec;
        };

        recognitionRef.current = createRecognition();
      } else {
        console.warn("Speech Recognition API not supported in this browser.");
      }
    }
  }, []);

  const handleUserSpeech = async (transcript: string) => {
    const newUserMsg: SavedMessage = { role: "user", content: transcript };
    setMessages((prev) => [...prev, newUserMsg]);
    setLastMessage(transcript);

    // Send to local API
    setIsSpeaking(true);
    try {
      const formattedQuestions = questions
        ? questions.map((q: string, i: number) => `Q${i+1}: ${q}`).join("\n")
        : "";

      const systemPrompt = `
        You are a highly professional, dynamic AI interviewer.
        
        Job Description:
        ${jobDescription || "General candidate assessment."}
        
        Candidate's Resume Context:
        ${resume || "No resume provided."}
        
        Base Questions to cover:
        ${formattedQuestions}
        
        INSTRUCTIONS:
        1. DO NOT just read the next question mechanically. 
        2. Analyze the candidate's previous response. If their answer is shallow or misses the mark, ask a targeted follow-up question to assess their technical skills, cultural fit, behavioral tendencies, or communication.
        3. Reference specific projects, skills, or experiences from their Resume when relevant to personalize the questions and drill deeper.
        4. Once you are satisfied with their understanding of the topic, move on to the next Base Question.
        5. Keep your responses conversational, concise, and under 3 sentences.
      `;

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

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let aiFullResponse = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n").filter((l) => l.trim().startsWith("0:"));
          for (const line of lines) {
            try {
              const textChunk = JSON.parse(line.substring(2));
              aiFullResponse += textChunk;
            } catch (e) {
              // ignore parse errors
            }
          }
        }
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: aiFullResponse },
      ]);
      setLastMessage(aiFullResponse);

      speakText(aiFullResponse);
    } catch (error) {
      console.error("Error fetching AI response", error);
      setIsSpeaking(false);
    }
  };

  useEffect(() => {
    handleUserSpeechRef.current = handleUserSpeech;
  }, [handleUserSpeech]);

  const speakText = (text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Apply selected voice
    if (selectedVoiceURI) {
      const selectedVoice = voices.find(v => v.voiceURI === selectedVoiceURI);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }

    utterance.onend = () => {
      setIsSpeaking(false);
      startListening();
    };
    utterance.onerror = () => setIsSpeaking(false);
    
    synthRef.current.speak(utterance);
    setIsSpeaking(true);
  };

  const startListening = () => {
    if (recognitionRef.current && callStatus === CallStatus.ACTIVE) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        // Already started
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // Video handling
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const toggleCamera = () => {
    if (cameraOn) {
      stopCamera();
    } else {
      startCamera();
    }
    setCameraOn(!cameraOn);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const handleGenerateFeedback = async (msgs: SavedMessage[]) => {
    // If not authenticated, we'll bypass the DB save
    if (type !== "generate") {
      try {
        await createFeedback({
          interviewId: interviewId!,
          userId: userId || "mock-user",
          transcript: msgs,
          feedbackId,
        });
        router.push(`/interview/${interviewId}/feedback`);
      } catch (e) {
         router.push("/");
      }
    } else {
      router.push("/");
    }
  };

  const handleCall = async () => {
    if (type === "generate") {
      alert("Please create interviews through the API.");
      return;
    }

    setCallStatus(CallStatus.ACTIVE);
    const welcomeMsg = "Hello! I am ready to start the interview when you are. Please tell me when you are ready to begin.";
    setMessages([{ role: "assistant", content: welcomeMsg }]);
    setLastMessage(welcomeMsg);
    speakText(welcomeMsg);
  };

  const handleDisconnect = () => {
    setCallStatus(CallStatus.FINISHED);
    if (synthRef.current) synthRef.current.cancel();
    stopListening();
    stopCamera();
    handleGenerateFeedback(messages);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start w-full">
      {/* Left Column: Call Interface */}
      <div className="flex-1 w-full flex flex-col gap-6">
        <div className="call-view">
          {/* AI Interviewer Card */}
          <div className="card-interviewer relative">
            <div className="avatar">
              <Image
                src="/logo2.png"
                alt="AI Interviewer"
                width={65}
                height={54}
                className="object-cover"
              />
              {isSpeaking && <span className="animate-speak" />}
            </div>
            <h3>AI Interviewer</h3>
          </div>

          {/* User Profile Card with Video */}
          <div className="card-border">
            <div className="card-content relative flex flex-col items-center gap-4">
              {cameraOn ? (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="rounded-2xl object-cover size-[250px]"
                />
              ) : (
                <Image
                  src="/userProfile.jpg"
                  alt="User Profile"
                  width={600}
                  height={600}
                  className="rounded-full object-cover size-[160px]"
                />
              )}
              <h3>{userName || "Candidate"}</h3>
            </div>
          </div>
        </div>

        {/* Unified Control Bar */}
        <div className="bg-[#1f2937]/50 border border-gray-700/60 backdrop-blur-md px-6 py-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
          {/* Left: Voice Selection */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Voice:</span>
            <select
              value={selectedVoiceURI}
              onChange={(e) => setSelectedVoiceURI(e.target.value)}
              className="bg-gray-900 border border-gray-700 text-white px-3 py-1.5 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 max-w-[200px]"
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
                className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2.5 rounded-full text-xs transition shadow-lg shadow-green-600/30"
                onClick={handleCall}
              >
                {callStatus === CallStatus.INACTIVE || callStatus === CallStatus.FINISHED
                  ? "Start Call"
                  : "Connecting..."}
              </button>
            ) : (
              <button
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-full text-xs transition shadow-lg shadow-red-600/30"
                onClick={handleDisconnect}
              >
                End Call
              </button>
            )}
          </div>

          {/* Right: Mic & Camera Status / Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => (isListening ? stopListening() : startListening())}
              className={cn(
                "p-2 rounded-full text-white transition-all border",
                isListening
                  ? "bg-red-500/20 border-red-500/50 text-red-400 animate-pulse shadow-lg shadow-red-500/20"
                  : "bg-gray-800 border-gray-700 hover:bg-gray-750"
              )}
              disabled={callStatus !== CallStatus.ACTIVE}
              title={isListening ? "Mute Microphone" : "Unmute Microphone"}
            >
              {isListening ? <Mic size={16} /> : <MicOff size={16} />}
            </button>
            <button
              onClick={toggleCamera}
              className={cn(
                "p-2 rounded-full text-white transition-all border",
                cameraOn
                  ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                  : "bg-gray-800 border-gray-700 hover:bg-gray-750"
              )}
              title={cameraOn ? "Turn Camera Off" : "Turn Camera On"}
            >
              {cameraOn ? <VideoOff size={16} /> : <Video size={16} />}
            </button>
          </div>
        </div>

        {/* Subtitles */}
        {messages.length > 0 && (
          <div className="transcript-border">
            <div className="transcript">
              <p
                key={lastMessage}
                className={cn(
                  "transition-opacity duration-500 opacity-0",
                  "animate-fadeIn opacity-100"
                )}
              >
                {lastMessage}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Live Transcript Panel */}
      <div className="w-full lg:w-[380px] shrink-0 bg-[#111827] border border-gray-700 rounded-3xl p-6 flex flex-col h-[520px] shadow-xl">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
          <span>Interview Transcript</span>
          {isListening && (
            <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full animate-pulse border border-green-500/20">
              <span className="size-1.5 rounded-full bg-green-400" />
              Listening
            </span>
          )}
        </h3>

        {/* Scrolling logs container */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 flex flex-col scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 text-sm text-center p-4">
              <Mic className="size-8 mb-2 opacity-30 text-gray-400" />
              <p className="text-xs text-gray-500">
                Click &quot;Start Call&quot; to begin the interview and start transcription.
              </p>
            </div>
          ) : (
            messages
              .filter((msg) => msg.role !== "system")
              .map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed transition-all duration-300",
                    msg.role === "user"
                      ? "bg-blue-600/20 border border-blue-500/30 text-blue-100 self-end ml-auto"
                      : "bg-gray-800/60 border border-gray-700/50 text-gray-100 self-start mr-auto"
                  )}
                >
                  <div className="text-[9px] uppercase font-bold tracking-wider mb-0.5 opacity-60">
                    {msg.role === "user" ? "Candidate" : "Interviewer"}
                  </div>
                  <div className="whitespace-pre-line">{msg.content}</div>
                </div>
              ))
          )}

          {/* Live Interim Transcript Bubble */}
          {interimTranscript && (
            <div className="p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed bg-blue-600/10 border border-blue-500/20 border-dashed text-blue-300 self-end ml-auto animate-pulse">
              <div className="text-[9px] uppercase font-bold tracking-wider mb-0.5 opacity-60">
                Candidate (Speaking...)
              </div>
              <div>{interimTranscript}</div>
            </div>
          )}
          <div ref={transcriptEndRef} />
        </div>
      </div>
    </div>
  );
};

export default Agent;