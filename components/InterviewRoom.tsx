"use client";
import { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  PhoneOff,
  Captions,
  Settings2,
  Volume2,
  ArrowRight,
  Loader2,
  RotateCcw,
  Download,
  Maximize2,
  X,
  ChevronDown,
  ChevronUp,
  Check,
  Wifi,
  WifiOff,
  Clock3,
  Headphones,
  ArrowUpRight,
  Hand,
} from "lucide-react";
import styles from "./InterviewRoom.module.css";
import { ChirayuLogo } from "@/components/ui/chirayu-logo";

type Props = {
  feedbackLoading: boolean;
  feedbackAvailable: boolean;
  onViewFeedback: () => void;
  active: boolean;
  connecting: boolean;
  finished: boolean;
  speaking: boolean;
  thinking: boolean;
  processing: boolean;
  pending: boolean;
  listening: boolean;
  micReady: boolean;
  micError: string;
  name: string;
  role: string;
  camera: boolean;
  muted: boolean;
  volume: number;
  stream: MediaStream | null;
  rate: number;
  setRate: (value: number) => void;
  estimatedMinutes: number;
  messages: { role: string; content: string }[];
  draft: string;
  error: string;
  provider: string;
  hasRetry: boolean;
  onStart: () => void;
  onEnd: () => void;
  onCamera: () => void;
  onMute: () => void;
  onCheckMic: () => void;
  onFinish: () => void;
  onRetry: () => void;
  onDiscard: () => void;
  onReplay: () => void;
  onInterrupt: () => void;
};

function Presence({
  speaking,
  small = false,
}: {
  speaking: boolean;
  small?: boolean;
}) {
  return (
    <div
      className={`${styles.presence} ${small ? styles.smallPresence : ""} ${speaking ? styles.speaking : ""}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 160 160" fill="none">
        <circle
          cx="80"
          cy="80"
          r="77"
          stroke="currentColor"
          strokeOpacity=".13"
        />
        <circle
          cx="80"
          cy="80"
          r="66"
          stroke="currentColor"
          strokeOpacity=".12"
        />
        <path
          d="M48 105c-6-34 7-59 32-59s38 25 32 59M62 105c-4-25 3-43 18-43s22 18 18 43M76 105V81c0-8 8-8 8 0v24"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export default function InterviewRoom(p: Props) {
  const [settings, setSettings] = useState(false);
  const [transcript, setTranscript] = useState(false);
  const [leave, setLeave] = useState(false);
  const [cameraCollapsed, setCameraCollapsed] = useState(false);
  const [screen, setScreen] = useState<MediaStream | null>(null);
  const [screenError, setScreenError] = useState("");
  const [online, setOnline] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [speakerTested, setSpeakerTested] = useState(false);
  const screenRef = useRef<MediaStream | null>(null);
  const cameraVideo = useRef<HTMLVideoElement>(null);
  const screenVideo = useRef<HTMLVideoElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const room = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const mounted = useRef(true);
  const activeRef = useRef(p.active);
  activeRef.current = p.active;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      screenRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  useEffect(() => {
    if (cameraVideo.current) cameraVideo.current.srcObject = p.stream;
  }, [p.stream, p.camera, cameraCollapsed, p.active]);
  useEffect(() => {
    if (screenVideo.current) screenVideo.current.srcObject = screen;
  }, [screen]);
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [p.messages, p.draft, transcript]);
  useEffect(() => {
    if (!p.active) return;
    setSeconds(0);
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [p.active]);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    if (settings || leave) dialog.current?.showModal();
    else dialog.current?.close();
  }, [settings, leave]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    if (p.active) window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [p.active]);
  const stopShare = () => {
    screenRef.current?.getTracks().forEach((t) => t.stop());
    screenRef.current = null;
    setScreen(null);
  };
  useEffect(() => {
    if (!p.active) {
      screenRef.current?.getTracks().forEach((t) => t.stop());
      screenRef.current = null;
      setScreen(null);
    }
  }, [p.active]);
  const share = async () => {
    if (screen) {
      stopShare();
      return;
    }
    setScreenError("");
    try {
      if (!navigator.mediaDevices?.getDisplayMedia)
        throw new Error("Screen sharing is unavailable in this browser.");
      const media = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      if (!mounted.current || !activeRef.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      screenRef.current = media;
      setScreen(media);
      media.getVideoTracks()[0].onended = stopShare;
    } catch {
      setScreenError(
        "Your screen wasn’t shared. Choose a window or tab to try again.",
      );
    }
  };
  const download = () => {
    const text = p.messages
      .filter((m) => m.role !== "system")
      .map((m) => `${m.role === "assistant" ? "Alex" : p.name}: ${m.content}`)
      .join("\n\n");
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/plain;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "interview-transcript.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const latest = [...p.messages]
    .reverse()
    .find((m) => m.role === "assistant")?.content;
  const answers = p.messages.filter((m) => m.role === "user").length;
  const status = p.thinking
    ? "Taking a moment with your answer"
    : p.speaking
      ? "Alex is speaking"
      : p.processing
        ? "Capturing your answer"
        : p.muted
          ? "Your microphone is muted"
          : p.listening
            ? "Alex is listening"
            : "Getting ready to listen";
  const testSpeaker = () => {
    setSpeakerTested(true);
    p.onReplay();
  };
  const camera = (
    <div
      className={`${styles.camera} ${cameraCollapsed && p.active ? styles.collapsed : ""}`}
    >
      {!(cameraCollapsed && p.active) && (
        <>
          <video
            ref={cameraVideo}
            autoPlay
            muted
            playsInline
            className={!p.camera ? styles.hidden : ""}
          />
          {!p.camera && (
            <div className={styles.cameraEmpty}>
              <span>
                {(p.name || "You")
                  .split(" ")
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join("")}
              </span>
              <p>Your camera is off</p>
            </div>
          )}
        </>
      )}
      <div className={styles.cameraCaption}>
        <span>
          {p.name || "You"} <span className={styles.you}>(you)</span>
        </span>
        <span>
          {p.muted ? <MicOff size={13} /> : <Mic size={13} />}
          {p.active && (
            <button
              onClick={() => setCameraCollapsed(!cameraCollapsed)}
              aria-label={
                cameraCollapsed
                  ? "Expand camera preview"
                  : "Collapse camera preview"
              }
            >
              {cameraCollapsed ? (
                <ChevronUp size={14} />
              ) : (
                <ChevronDown size={14} />
              )}
            </button>
          )}
        </span>
      </div>
    </div>
  );
  return (
    <div className={styles.room} ref={room} data-interview-room data-candidate-portal>
      <header className={styles.header} data-room-header>
        <a
          href={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/`}
          onClick={(e) => {
            if (p.active) {
              e.preventDefault();
              setLeave(true);
            }
          }}
          className={styles.brand}
        >
          <ChirayuLogo height={32} />
        </a>
        <div className={styles.headerContext}>{p.role || "Your interview"}</div>
        <div className={styles.headerStatus}>
          {p.active ? (
            <>
              <span className={styles.liveDot} />
              Live interview
              <span className={styles.timer}>
                {Math.floor(seconds / 60)
                  .toString()
                  .padStart(2, "0")}
                :{(seconds % 60).toString().padStart(2, "0")}
              </span>
            </>
          ) : (
            <span>Candidate experience</span>
          )}
        </div>
      </header>
      {!p.active && !p.finished ? (
        <main className={styles.lobby}>
          <section className={styles.welcome}>
            <p className={styles.eyebrow}>A conversation about what’s next</p>
            <h1>
              A little preparation.
              <br />
              <em>A great conversation.</em>
            </h1>
            <p className={styles.intro}>
              Welcome{p.name ? `, ${p.name.split(" ")[0]}` : ""}. Take a moment
              to settle in. We’ll check your devices, then you’ll meet Alex.
            </p>
            <div className={styles.interviewDetails}>
              <div>
                <span>YOUR INTERVIEW</span>
                <h2>{p.role || "Career conversation"}</h2>
              </div>
              <p>
                <Clock3 size={15} />
                About {p.estimatedMinutes} minutes <span>· estimated</span>
              </p>
            </div>
            <div className={styles.meet}>
              <Presence speaking={p.speaking} small />
              <div>
                <strong>Meet Alex</strong>
                <p>
                  Your AI interviewer. One question at a time,
                  <br />
                  with room to think and speak naturally.
                </p>
              </div>
            </div>
            <p className={styles.languageNote}>
              English, हिंदी, मराठी — speak in your own words.
              <br />
              You won’t need to type your answers.
            </p>
            <div className={styles.journey}>
              <span className={styles.currentStep}>
                01 <b>Get comfortable</b>
              </span>
              <span>
                02 <b>Have a conversation</b>
              </span>
              <span>
                03 <b>Wrap up</b>
              </span>
            </div>
          </section>
          <section
            className={styles.deviceCheck}
            aria-label="Pre-interview device check"
          >
            {camera}
            <div className={styles.deviceHeading}>
              <h2>Your space, ready.</h2>
              <span>
                <span
                  className={`${styles.liveDot} ${!online ? styles.offlineDot : ""}`}
                />
                {online ? "Online" : "Offline"}
              </span>
            </div>
            <div className={styles.deviceRow}>
              <Mic size={18} />
              <div>
                <strong>Microphone</strong>
                <span>
                  {p.micReady
                    ? "Connected. Say a few words to check."
                    : "Allow access so Alex can hear you."}
                </span>
              </div>
              {p.micReady ? (
                <div className={styles.meter} aria-label="Microphone activity">
                  {[0.4, 0.8, 1, 0.6, 0.9].map((v, i) => (
                    <i
                      key={i}
                      style={{ height: Math.max(3, (p.volume * v) / 4) }}
                    />
                  ))}
                </div>
              ) : (
                <button onClick={p.onCheckMic}>
                  Enable <ArrowUpRight size={13} />
                </button>
              )}
            </div>
            <div className={styles.deviceRow}>
              <Video size={18} />
              <div>
                <strong>
                  Camera <small>optional</small>
                </strong>
                <span>
                  {p.camera
                    ? "You’re looking good. Preview is mirrored."
                    : "Join with your camera on or off."}
                </span>
              </div>
              <button onClick={p.onCamera}>
                {p.camera ? "Turn off" : "Turn on"}
              </button>
            </div>
            <div className={styles.deviceRow}>
              <Headphones size={18} />
              <div>
                <strong>Speakers</strong>
                <span>
                  {p.speaking
                    ? "Playing a short greeting…"
                    : speakerTested
                      ? "If you heard Alex, you’re ready."
                      : "Make sure you can hear Alex."}
                </span>
              </div>
              <button disabled={p.speaking} onClick={testSpeaker}>
                {p.speaking ? (
                  <Loader2 size={16} className={styles.spin} />
                ) : (
                  <>
                    <Volume2 size={14} />
                    Test
                  </>
                )}
              </button>
            </div>
            {p.micError && (
              <p role="alert" className={styles.inlineError}>
                {p.micError}
              </p>
            )}
            <button
              className={styles.primary}
              disabled={
                p.connecting ||
                p.speaking ||
                !online ||
                p.provider === "loading"
              }
              onClick={p.onStart}
            >
              {p.connecting ? (
                <>
                  <Loader2 size={17} className={styles.spin} /> Connecting…
                </>
              ) : (
                <>
                  Start interview <ArrowRight size={18} />
                </>
              )}
            </button>
            <p className={styles.permissionNote}>
              {p.micReady ? <Check size={13} /> : <Mic size={13} />}{" "}
              {p.micReady
                ? "Microphone permission granted"
                : "Your browser will ask for microphone permission"}
            </p>
            <p className={styles.privacyNote}>
              Your spoken answers are transcribed for this interview. Use a
              quiet space and headphones if you can.
            </p>
          </section>
        </main>
      ) : p.finished ? (
        <main className={styles.completion}>
          <Check size={28} />
          <p className={styles.eyebrow}>Interview complete</p>
          <h1>
            Thank you for
            <br />
            the conversation.
          </h1>
          <p>
            You’ve completed your session with Alex.
            <br />
            {p.feedbackLoading
              ? "Your interview feedback is being prepared."
              : p.feedbackAvailable
                  ? "Your session has ended. You can now review your feedback."
                  : "Your session is complete. Feedback couldn’t be prepared just now."}
          </p>
          <button
            className={styles.secondary}
            disabled={p.feedbackLoading}
            onClick={p.onViewFeedback}
          >
            {p.feedbackLoading ? (
              <>
                <Loader2 size={15} className={styles.spin} />
                Preparing feedback
              </>
            ) : (
              <>
                {p.feedbackAvailable ? "View interview feedback" : "View session details"}
                <ArrowRight size={15} />
              </>
            )}
          </button>
          <button onClick={download} className={styles.secondary}>
            <Download size={16} />
            Download conversation
          </button>
        </main>
      ) : (
        <main className={styles.live}>
          <div className={styles.sessionTop}>
            <span>
              <span className={styles.liveDot} /> {status}
            </span>
            <span>
              {answers
                ? `${answers} ${answers === 1 ? "answer" : "answers"} shared`
                : "Getting to know you"}
              <button
                aria-label="Full screen"
                onClick={() => {
                  const result = document.fullscreenElement
                    ? document.exitFullscreen()
                    : room.current?.requestFullscreen();
                  result?.catch(() =>
                    setScreenError("Full screen isn’t available in this view."),
                  );
                }}
              >
                <Maximize2 size={15} />
              </button>
            </span>
          </div>
          <section
            className={`${styles.stage} ${screen ? styles.sharing : ""}`}
            aria-label="Interview canvas"
          >
            {screen && (
              <div className={styles.sharedScreen}>
                <video ref={screenVideo} autoPlay muted playsInline />
                <div>
                  <MonitorUp size={14} />
                  <span>
                    Your shared screen{" "}
                    <small>
                      Local preview · describe what you’re showing to Alex
                    </small>
                  </span>
                  <button onClick={stopShare}>Stop sharing</button>
                </div>
              </div>
            )}
            <div
              className={`${styles.interviewer} ${screen ? styles.floatingInterviewer : ""}`}
            >
              <Presence speaking={p.speaking && !p.thinking} small={!!screen} />
              <div className={styles.identity}>
                <h2>Alex</h2>
                <span>Your AI interviewer</span>
              </div>
              <div className={styles.wave} aria-hidden="true">
                {[7, 15, 23, 12, 20, 9, 15].map((v, i) => (
                  <i
                    key={i}
                    className={
                      p.speaking && !p.thinking ? styles.waveActive : ""
                    }
                    style={{
                      height: p.speaking && !p.thinking ? v : 3,
                      animationDelay: `${i * 110}ms`,
                    }}
                  />
                ))}
              </div>
            </div>
            <div className={styles.selfPreview}>{camera}</div>
            {!screen && (
              <div className={styles.question}>
                <p className={styles.eyebrow}>
                  {p.thinking ? "A moment to reflect" : "The conversation"}
                </p>
                <h1>{latest || "Let’s get to know each other."}</h1>
                {p.speaking && !p.thinking && (
                  <button className={styles.interrupt} onClick={p.onInterrupt}>
                    <Hand size={14} /> I’d like to respond
                  </button>
                )}
              </div>
            )}
          </section>
          {screen && (
            <div className={styles.sharedQuestion}>
              <span>Alex</span>
              <p>{latest}</p>
              {p.speaking && !p.thinking && (
                <button onClick={p.onInterrupt}>Speak now</button>
              )}
            </div>
          )}
          <div className={styles.liveCaption} aria-live="polite">
            {p.draft ? (
              <>
                <span>You</span>
                <p>{p.draft}</p>
              </>
            ) : (
              <p>
                {p.processing
                  ? "Finishing your transcript…"
                  : p.muted
                    ? "Unmute when you’re ready to continue."
                    : p.listening
                      ? "Take your time. A short pause sends your answer."
                      : p.thinking
                        ? "Alex is considering what you shared."
                        : "Listen, take a breath, and respond in your own words."}
              </p>
            )}
            {p.listening && (p.draft || p.pending) && (
              <button onClick={p.onFinish}>
                Done speaking <ArrowRight size={13} />
              </button>
            )}
          </div>
          {(p.error || screenError || !online) && (
            <div className={styles.error} role="alert">
              <span>
                {!online
                  ? "You’re offline. Reconnect to continue your conversation."
                  : p.error || screenError}
              </span>
              {p.hasRetry ? (
                <>
                  <button onClick={p.onRetry}>Try again</button>
                  <button onClick={p.onDiscard}>Record again</button>
                </>
              ) : p.error ? (
                <button onClick={p.onDiscard}>Reconnect microphone</button>
              ) : (
                <button
                  aria-label="Dismiss notification"
                  onClick={() => setScreenError("")}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}
          <footer className={styles.controlDock}>
            <div className={styles.dockInfo}>
              <span className={styles.liveDot} />
              <span>
                {p.muted
                  ? "Mic off"
                  : p.listening
                    ? "Listening"
                    : "In conversation"}
              </span>
            </div>
            <div className={styles.controls}>
              <button
                onClick={p.onMute}
                aria-pressed={p.muted}
                aria-label={p.muted ? "Unmute microphone" : "Mute microphone"}
                className={p.muted ? styles.toggled : ""}
              >
                {p.muted ? <MicOff /> : <Mic />}
                <span>Microphone</span>
              </button>
              <button
                onClick={p.onCamera}
                aria-pressed={p.camera}
                aria-label={p.camera ? "Turn camera off" : "Turn camera on"}
              >
                {p.camera ? <Video /> : <VideoOff />}
                <span>Camera</span>
              </button>
              <button
                onClick={share}
                aria-pressed={!!screen}
                className={screen ? styles.toggled : ""}
              >
                <MonitorUp />
                <span>{screen ? "Stop sharing" : "Share screen"}</span>
              </button>
              <i className={styles.divider} />
              <button
                onClick={() => setTranscript(!transcript)}
                aria-expanded={transcript}
                aria-controls="interview-transcript"
                className={transcript ? styles.toggled : ""}
              >
                <Captions />
                <span>Transcript</span>
              </button>
              <button onClick={() => setSettings(true)}>
                <Settings2 />
                <span>Settings</span>
              </button>
              <i className={styles.divider} />
              <button className={styles.leave} onClick={() => setLeave(true)}>
                <PhoneOff />
                <span>End interview</span>
              </button>
            </div>
            <div className={styles.dockInfo}>
              <span>{online ? <Wifi size={14} /> : <WifiOff size={14} />}</span>
            </div>
          </footer>
        </main>
      )}
      {transcript && p.active && (
        <aside
          id="interview-transcript"
          className={styles.transcript}
          aria-label="Conversation transcript"
        >
          <header>
            <div>
              <h2>Conversation</h2>
              <p>In your own words.</p>
            </div>
            <button onClick={download} aria-label="Download transcript">
              <Download size={16} />
            </button>
            <button
              onClick={() => setTranscript(false)}
              aria-label="Close transcript"
            >
              <X size={18} />
            </button>
          </header>
          <div ref={log} className={styles.transcriptLog} role="log">
            {p.messages
              .filter((m) => m.role !== "system")
              .map((m, i) => (
                <article key={i}>
                  <span>
                    {m.role === "assistant" ? "Alex" : p.name || "You"}
                    <small>
                      {m.role === "assistant" ? "Interviewer" : "Candidate"}
                    </small>
                  </span>
                  <p>{m.content}</p>
                </article>
              ))}
            {p.draft && (
              <article className={styles.draft}>
                <span>
                  You <small>Speaking</small>
                </span>
                <p>{p.draft}</p>
              </article>
            )}
          </div>
          <footer>
            <span className={styles.liveDot} />
            {p.listening
              ? "Listening to your answer"
              : p.processing
                ? "Finishing your transcript"
                : "Following the conversation"}
          </footer>
        </aside>
      )}
      <dialog
        ref={dialog}
        className={styles.dialog}
        onCancel={() => {
          setSettings(false);
          setLeave(false);
        }}
      >
        <button
          className={styles.closeDialog}
          aria-label="Close dialog"
          onClick={() => {
            setSettings(false);
            setLeave(false);
          }}
        >
          <X size={19} />
        </button>
        {leave ? (
          <>
            <p className={styles.eyebrow}>Before you go</p>
            <h2>Finish your interview?</h2>
            <p>
              Your completed answers will be used to prepare your feedback.
              {p.pending || p.draft || p.processing
                ? " Your current unfinished answer may not be included. You can return to the conversation to finish it."
                : " You can’t continue this conversation after ending it."}
            </p>
            <div className={styles.dialogActions}>
              <button
                className={styles.secondary}
                onClick={() => setLeave(false)}
              >
                Keep talking
              </button>
              <button
                className={styles.endButton}
                onClick={() => {
                  setLeave(false);
                  stopShare();
                  p.onEnd();
                }}
              >
                End interview
              </button>
            </div>
          </>
        ) : (
          <>
            <p className={styles.eyebrow}>Make yourself comfortable</p>
            <h2>Conversation settings</h2>
            <label className={styles.pace}>
              Alex’s speaking pace{" "}
              <span>
                {p.rate < 0.9 ? "Unhurried" : p.rate > 1 ? "Brisk" : "Natural"}
              </span>
              <input
                aria-label="Speaking pace"
                type="range"
                min=".75"
                max="1.15"
                step=".05"
                value={p.rate}
                onChange={(e) => p.setRate(Number(e.target.value))}
              />
            </label>
            <button
              className={styles.secondary}
              disabled={
                p.thinking ||
                p.processing ||
                p.speaking ||
                p.pending ||
                !!p.draft
              }
              onClick={p.onReplay}
            >
              <RotateCcw size={16} />
              Hear the question again
            </button>
            <p>
              You can change your microphone, camera or speaker in your
              browser’s site controls. Headphones can help keep your voice
              clear.
            </p>
          </>
        )}
      </dialog>
      <footer className={styles.pageFooter}>
        <span>Chirayu Power · People & possibilities</span>
        <span>Made for a good conversation.</span>
      </footer>
    </div>
  );
}
