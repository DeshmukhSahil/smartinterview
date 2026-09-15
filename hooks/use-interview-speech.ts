"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
};
type RecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  abort: () => void;
  onresult: ((event: RecognitionEvent) => void) | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => RecognitionInstance;
  webkitSpeechRecognition?: new () => RecognitionInstance;
};

// One complete audio file per turn, never partial WebM fragments. Silence ends a turn.
export function useInterviewSpeech({
  stream,
  active,
  paused,
  muted,
  language,
  onAnswer,
}: {
  stream: MediaStream | null;
  active: boolean;
  paused: boolean;
  muted: boolean;
  language: string;
  onAnswer: (text: string) => void;
}) {
  const liveRef = useRef({ active, muted });
  liveRef.current = { active, muted };
  const [provider, setProvider] = useState<
    "loading" | "browser" | "multilingual"
  >("loading");
  const [draft, setDraft] = useState("");
  const [listening, setListening] = useState(false);
  const [recordingPending, setRecordingPending] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [retryBlob, setRetryBlob] = useState<Blob | null>(null);
  const [cycle, setCycle] = useState(0);
  const finishRef = useRef<() => void>(() => {});
  const answerRef = useRef(onAnswer);
  answerRef.current = onAnswer;
  const generation = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => { controller.abort(); setProvider("browser"); }, 3000);
    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/speech/transcribe`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((r) => { if (!controller.signal.aborted) setProvider(r.available ? "multilingual" : "browser"); })
      .catch(() => {
        if (!controller.signal.aborted) setProvider("browser");
      }).finally(() => clearTimeout(timeout));
    return () => { clearTimeout(timeout); controller.abort(); };
  }, []);
  const invalidate = useCallback(() => {
    generation.current++;
    abortRef.current?.abort();
  }, []);
  useEffect(() => {
    if (!active) {
      generation.current++;
      abortRef.current?.abort();
      setProcessing(false);
      setRetryBlob(null);
    }
    return invalidate;
  }, [active, invalidate]);
  const transcribe = useCallback(
    async (blob: Blob) => {
      const id = generation.current;
      setRecordingPending(false);
      setProcessing(true);
      setError("");
      setRetryBlob(null);
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const form = new FormData();
        form.append(
          "file",
          blob,
          blob.type.includes("mp4") ? "answer.m4a" : "answer.webm",
        );
        if (language !== "auto")
          form.append("language", language.split("-")[0]);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/speech/transcribe`,
          { method: "POST", body: form, signal: controller.signal },
        );
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "Transcription failed.");
        if (id !== generation.current) return;
        if (result.text?.trim()) {
          setDraft("");
          answerRef.current(result.text.trim());
        } else setError("No clear speech detected. Please speak again.");
      } catch (err) {
        if (id === generation.current && !controller.signal.aborted) {
          setError(
            err instanceof Error ? err.message : "Transcription failed.",
          );
          setRetryBlob(blob);
        }
      } finally {
        if (id === generation.current) {
          setProcessing(false);
          setCycle((c) => c + 1);
        }
      }
    },
    [language],
  );

  useEffect(() => {
    if (
      !active ||
      paused ||
      muted ||
      !stream ||
      processing ||
      retryBlob ||
      provider === "loading"
    )
      return;
    let disposed = false;
    setError("");
    setDraft("");
    setRecordingPending(false);
    if (provider === "browser") {
      const Recognition =
        (window as SpeechWindow).SpeechRecognition ||
        (window as SpeechWindow).webkitSpeechRecognition;
      if (!Recognition) {
        setError(
          "This browser has no speech recognition. Please try a supported desktop browser or contact your recruiter.",
        );
        return;
      }
      const rec = new Recognition();
      rec.lang = language === "auto" ? navigator.language || "en-IN" : language;
      rec.continuous = true;
      rec.interimResults = true;
      let committed = "",
        current = "",
        submitted = false,
        fatal = false;
      let silence: ReturnType<typeof setTimeout>;
      const finish = () => {
        const text = `${committed} ${current}`.trim();
        if (disposed || submitted || !text) return;
        submitted = true;
        clearTimeout(silence);
        rec.abort();
        setListening(false);
        setDraft("");
        answerRef.current(text);
      };
      finishRef.current = finish;
      rec.onresult = (event) => {
        current = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal)
            committed += event.results[i][0].transcript + " ";
          else current += event.results[i][0].transcript;
        }
        setDraft(`${committed} ${current}`.trim());
        clearTimeout(silence);
        silence = setTimeout(finish, 2800);
      };
      rec.onstart = () => {
        if (!disposed) setListening(true);
      };
      rec.onerror = (event) => {
        if (
          disposed ||
          submitted ||
          event.error === "aborted" ||
          event.error === "no-speech"
        )
          return;
        fatal = true;
        setListening(false);
        setError(
          `Speech recognition stopped (${event.error}). Check microphone access and reconnect.`,
        );
      };
      rec.onend = () => {
        if (disposed || submitted) return;
        setListening(false);
        if ((committed + current).trim()) finish();
        else if (!fatal) {
          try {
            rec.start();
          } catch {
            setError("Unable to restart the microphone.");
          }
        }
      };
      try {
        rec.start();
      } catch {
        setError("Unable to start speech recognition.");
      }
      return () => {
        disposed = true;
        clearTimeout(silence);
        rec.onend = null;
        rec.abort();
        setListening(false);
        finishRef.current = () => {};
        // Muting completes the captured turn instead of silently losing its text.
        if (
          liveRef.current.active &&
          liveRef.current.muted &&
          !submitted &&
          (committed + current).trim()
        ) {
          setDraft("");
          answerRef.current(`${committed} ${current}`.trim());
        }
      };
    }
    if (!window.MediaRecorder) {
      setError("Audio recording is unavailable in this browser.");
      return;
    }
    const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find(
      (t) => MediaRecorder.isTypeSupported(t),
    );
    const CaptionRecognition =
      (window as SpeechWindow).SpeechRecognition ||
      (window as SpeechWindow).webkitSpeechRecognition;
    const caption = CaptionRecognition ? new CaptionRecognition() : null;
    if (caption) {
      caption.lang = navigator.language || "en-IN";
      caption.continuous = true;
      caption.interimResults = true;
      caption.onresult = (event) => {
        if (disposed) return;
        const words = Array.from(
          event.results,
          (result) => result[0].transcript,
        ).join(" ");
        setDraft(words);
      };
      caption.onerror = () => {}; // Final audio transcription still works without browser captions.
      caption.onend = null;
      try {
        caption.start();
      } catch {
        /* Captions are optional; audio capture continues. */
      }
    }
    const recorder = new MediaRecorder(
      stream,
      mimeType ? { mimeType } : undefined,
    );
    const chunks: Blob[] = [];
    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    const source = context.createMediaStreamSource(stream);
    source.connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    let heardSpeech = false,
      lastSpeech = Date.now();
    const started = Date.now();
    const finish = () => {
      if (recorder.state === "recording" && heardSpeech) {
        caption?.abort();
        recorder.stop();
      }
    };
    finishRef.current = finish;
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    recorder.onstop = () => {
      setListening(false);
      if (
        (!disposed || (liveRef.current.active && liveRef.current.muted)) &&
        heardSpeech
      )
        void transcribe(new Blob(chunks, { type: recorder.mimeType }));
    };
    recorder.onerror = () => {
      setError("Audio recording failed. Reconnect your microphone.");
      setListening(false);
    };
    recorder.start();
    setListening(true);
    const timer = setInterval(() => {
      analyser.getFloatTimeDomainData(samples);
      const rms = Math.sqrt(
        samples.reduce((sum, n) => sum + n * n, 0) / samples.length,
      );
      if (rms > 0.018) {
        if (!heardSpeech) setRecordingPending(true);
        heardSpeech = true;
        lastSpeech = Date.now();
      }
      if (!heardSpeech && Date.now() - started > 120000) setCycle((c) => c + 1);
      if (
        heardSpeech &&
        (Date.now() - lastSpeech > 2800 || Date.now() - started > 120000)
      )
        finish();
    }, 100);
    return () => {
      disposed = true;
      caption?.abort();
      clearInterval(timer);
      if (recorder.state !== "inactive") recorder.stop();
      source.disconnect();
      void context.close();
      setListening(false);
      finishRef.current = () => {};
    };
  }, [
    active,
    paused,
    muted,
    stream,
    language,
    provider,
    processing,
    retryBlob,
    transcribe,
    cycle,
  ]);
  return {
    provider,
    draft,
    listening,
    processing,
    recordingPending,
    error,
    hasRetry: !!retryBlob,
    finish: () => finishRef.current(),
    retry: () => {
      if (retryBlob) void transcribe(retryBlob);
    },
    discard: () => {
      setRetryBlob(null);
      setError("");
      setCycle((c) => c + 1);
    },
  };
}
