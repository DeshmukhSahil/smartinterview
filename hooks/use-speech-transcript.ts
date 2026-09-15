"use client";

import { useEffect, useRef, useState } from "react";

// Continuous browser speech-to-text with auto-restart, extracted from the AI-assisted
// interview Agent so it can be reused by anything that needs a live transcript — the AI
// interviewer (which pauses recognition while it's speaking) and the HR "conduct
// interview" notetaker (which has no TTS to pause for).
export function useSpeechTranscript({
  active,
  paused,
  micPermission,
}: {
  active: boolean;
  paused: boolean;
  micPermission: "prompt" | "granted" | "denied";
}) {
  const [isListening, setIsListening] = useState(false);
  const [userAnswer, setUserAnswer] = useState("");
  const [interimText, setInterimText] = useState("");

  const recognitionRef = useRef<any>(null);
  const activeRef = useRef(active);
  const pausedRef = useRef(paused);

  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech Recognition API not supported in this browser.");
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    let processedIndex = 0;

    rec.onresult = (event: any) => {
      let interim = "";
      let finalText = "";
      for (let i = processedIndex; i < event.results.length; ++i) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += chunk + " ";
        } else {
          interim += chunk;
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
      setInterimText(interim.trim());
    };

    rec.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      if (event.error !== "no-speech") setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
      processedIndex = 0;
      if (activeRef.current && !pausedRef.current) {
        try { rec.start(); setIsListening(true); } catch (e) {}
      }
    };

    recognitionRef.current = rec;
    return () => {
      try { rec.stop(); } catch (e) {}
      recognitionRef.current = null;
    };
  }, []);

  const startListening = () => {
    if (micPermission === "granted" && recognitionRef.current && active) {
      try { recognitionRef.current.start(); setIsListening(true); } catch (e) {}
    }
  };

  // Skips the micPermission gate — for the moment right after a getUserMedia prompt has
  // just resolved, when the caller already knows mic access was granted but this hook's
  // `micPermission` prop hasn't re-rendered in with the new value yet.
  const forceStartListening = () => {
    if (recognitionRef.current && active) {
      try { recognitionRef.current.start(); setIsListening(true); } catch (e) {}
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      setIsListening(false);
    }
  };

  return { isListening, userAnswer, setUserAnswer, interimText, setInterimText, startListening, forceStartListening, stopListening };
}
