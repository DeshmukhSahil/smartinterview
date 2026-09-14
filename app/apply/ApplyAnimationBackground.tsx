"use client";

import { useEffect, useRef, useState } from "react";
import "./apply-animation-background.css";

export default function ApplyAnimationBackground() {
  const frame = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);
  const [motion, setMotion] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const preference = matchMedia("(min-width: 1440px) and (prefers-reduced-motion: no-preference)");
    const update = () => { readyRef.current = false; setReady(false); setMotion(preference.matches); };
    update(); preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!motion || failed) return;
    const page = frame.current?.closest("main");
    page?.classList.add("has-scroll-animation");
    let raf = 0;
    const send = () => {
      raf = 0;
      // A stable scroll distance avoids jumps when selecting a role expands the form.
      const progress = Math.max(0, Math.min(1, scrollY / Math.max(1, innerHeight * 1.4)));
      frame.current?.contentWindow?.postMessage({ type: "chirayu:engineering", progress, active: !document.hidden }, location.origin);
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(send); };
    const receive = (event: MessageEvent) => {
      if (event.origin !== location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === "chirayu:ready") { readyRef.current = true; setReady(true); schedule(); }
      if (event.data?.type === "chirayu:error") setFailed(true);
    };
    addEventListener("message", receive);
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule);
    document.addEventListener("visibilitychange", schedule);
    const timeout = setTimeout(() => { if (!readyRef.current) setFailed(true); }, 20000);
    schedule();
    return () => {
      cancelAnimationFrame(raf); clearTimeout(timeout); page?.classList.remove("has-scroll-animation");
      removeEventListener("message", receive); removeEventListener("scroll", schedule); removeEventListener("resize", schedule);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [motion, failed]);

  return (
    <div className={`apply-animation-background ${ready && !failed ? "is-scroll-ready" : ""}`} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/engineering/poster.png" alt="" draggable={false} />
      {motion && !failed && <iframe ref={frame} src="/engineering/scene.html?scroll=1&side=1" title="Decorative solar engineering animation" tabIndex={-1} />}
    </div>
  );
}
