"use client";

import { useEffect, useRef, useState } from "react";
import "./engineering-journey.css";

const chapters = [
  { at: 0, label: "Plan", title: "Every great project starts with a plan.", copy: "Explore the rooftop, map the panel grid, and see how an idea becomes a solar installation." },
  { at: .18, label: "Anchor", title: "Small details. Lasting foundations.", copy: "From mounting plates to fasteners, careful engineering supports everything that follows." },
  { at: .32, label: "Structure", title: "Build strength into every connection.", copy: "Columns, bracing and mounting rails come together as one coordinated system." },
  { at: .53, label: "Install", title: "Turn a rooftop into an opportunity.", copy: "Precision in panel placement and frame connections brings the design to life." },
  { at: .71, label: "Connect", title: "Connect the work. Create the impact.", copy: "Electrical equipment and cable routes complete the next part of the installation." },
  { at: .9, label: "Join us", title: "There’s a place for you in this story.", copy: "Bring your skills to the people designing, delivering and supporting solar projects at Chirayu Power." },
];

export default function EngineeringJourney() {
  const section = useRef<HTMLElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const [motion, setMotion] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [paused, setPaused] = useState(false);
  const [chapter, setChapter] = useState(0);

  useEffect(() => {
    const query = matchMedia("(min-width: 900px) and (prefers-reduced-motion: no-preference)");
    const sync = () => { setMotion(query.matches); setReady(false); };
    sync(); query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!motion || failed) return;
    let raf = 0;
    let visible = true;
    const send = () => {
      raf = 0;
      const node = section.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, -rect.top / Math.max(1, node.offsetHeight - innerHeight + 88)));
      const active = visible && !paused && !document.hidden;
      frame.current?.contentWindow?.postMessage({ type: "chirayu:engineering", progress, active }, location.origin);
      if (active) {
        if (bar.current) bar.current.style.transform = `scaleX(${progress})`;
        setChapter(chapters.reduce((index, item, i) => progress >= item.at ? i : index, 0));
      }
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(send); };
    const receive = (event: MessageEvent) => {
      if (event.origin !== location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === "chirayu:ready") { if (frame.current) frame.current.dataset.ready = "true"; setReady(true); schedule(); }
      if (event.data?.type === "chirayu:error") setFailed(true);
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; schedule(); });
    if (section.current) observer.observe(section.current);
    addEventListener("message", receive); addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule); document.addEventListener("visibilitychange", schedule);
    const timeout = setTimeout(() => { if (!frame.current?.dataset.ready) setFailed(true); }, 20000);
    schedule();
    return () => {
      cancelAnimationFrame(raf); clearTimeout(timeout); observer.disconnect();
      removeEventListener("message", receive); removeEventListener("scroll", schedule);
      removeEventListener("resize", schedule); document.removeEventListener("visibilitychange", schedule);
    };
  }, [motion, paused, failed]);

  function goToRoles() {
    const target = document.getElementById("opportunities");
    target?.scrollIntoView({ behavior: "auto", block: "start" });
    target?.focus({ preventScroll: true });
  }

  const animated = motion && !failed;
  const current = chapters[animated ? chapter : 5];
  return (
    <section ref={section} className={`epc-journey ${animated ? "epc-journey--motion" : ""}`} aria-label="Explore our solar engineering work">
      <div className="epc-journey__sticky">
        <div className="epc-journey__visual" aria-hidden="true">
          {/* A local poster is also the fallback when WebGL or motion is unavailable. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/engineering/poster.png" alt="" className="epc-journey__poster" />
          {animated && <iframe ref={frame} src="/engineering/scene.html" title="Solar installation illustration" tabIndex={-1} className={ready ? "is-ready" : ""} onLoad={() => { if (frame.current) frame.current.dataset.loaded = "true"; }} />}
        </div>
        <div className="epc-journey__wash" aria-hidden="true" />
        <div className="epc-journey__copy">
          <p className="epc-journey__eyebrow"><span /> CHIRAYU POWER · CAREERS</p>
          <h1>Build your future.<br /><em>Power a better one.</em></h1>
          <div className="epc-journey__chapter">
            <span className="epc-journey__number">0{(animated ? chapter : 5) + 1} / 06</span>
            <h2>{current.title}</h2><p>{current.copy}</p>
          </div>
          <button type="button" className="epc-journey__cta" onClick={goToRoles}>View open roles <span aria-hidden="true">↗</span></button>
          <p className="epc-journey__hint">{animated ? "Scroll to explore how our teams bring solar to life." : "Explore opportunities across our solar EPC teams."}</p>
        </div>
        <div className="epc-journey__bottom">
          <ol aria-label="Engineering journey stages">{chapters.map((item, i) => <li key={item.label} aria-current={i === (animated ? chapter : 5) ? "step" : undefined}><span>0{i + 1}</span> {item.label}</li>)}</ol>
          {animated && <button type="button" className="epc-journey__pause" aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? "Resume motion" : "Pause motion"}</button>}
          <div className="epc-journey__track" aria-hidden="true"><span ref={bar} /></div>
        </div>
      </div>
    </section>
  );
}
