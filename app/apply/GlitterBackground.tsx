"use client";
import { useEffect, useRef } from "react";

// A "starfield" background, inverted for a white page: sparse silver/gold
// specks that scatter away from the cursor and spring back to their seeded
// home position when left alone -- the interactive equivalent of the static
// SVG tile this replaced. Canvas-based (not per-dot DOM elements) so a
// couple thousand particles animate smoothly. Deliberately its own
// component so the physics loop is fully isolated from React re-renders --
// everything below is refs and imperative canvas calls, never state.

type Particle = {
  homeX: number; homeY: number;
  x: number; y: number;
  vx: number; vy: number;
  r: number;
  color: string;
  alpha: number;
};

const GRAY_COLORS = ["#9fb0c9", "#aebedd", "#c3cee2"];
const GOLD_COLOR = "#e8b84b";
const GOLD_CHANCE = 0.14;
const DENSITY = 1 / 900; // particles per CSS px^2
const MAX_PARTICLES = 2200;
const REPEL_RADIUS = 110;
const REPEL_STRENGTH = 9;
const SPRING = 0.02;
const DAMPING = 0.9;
const VIEW_BUFFER = 80;

function mulberry32(seed: number) {
  return function rnd() {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function GlitterBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let cssW = 0;
    let cssH = 0;
    let particles: Particle[] = [];

    function buildParticles(w: number, h: number) {
      const rnd = mulberry32(4242);
      const count = Math.min(MAX_PARTICLES, Math.round(w * h * DENSITY));
      const next: Particle[] = [];
      for (let i = 0; i < count; i++) {
        const isGold = rnd() < GOLD_CHANCE;
        const x = rnd() * w;
        const y = rnd() * h;
        next.push({
          homeX: x, homeY: y, x, y, vx: 0, vy: 0,
          r: isGold ? 1.4 + rnd() * 1.1 : 1.0 + rnd() * 2.2,
          color: isGold ? GOLD_COLOR : GRAY_COLORS[Math.floor(rnd() * GRAY_COLORS.length)],
          alpha: isGold ? 0.75 + rnd() * 0.2 : 0.55 + rnd() * 0.35,
        });
      }
      particles = next;
    }

    function applySize(w: number, h: number) {
      cssW = w;
      cssH = h;
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const mouse = { x: -9999, y: -9999 };
    function onPointerMove(e: PointerEvent) {
      mouse.x = e.clientX + window.scrollX;
      mouse.y = e.clientY + window.scrollY;
    }
    function onPointerLeave() {
      mouse.x = -9999;
      mouse.y = -9999;
    }
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave);

    let resizeTimer = 0;
    const ro = new ResizeObserver(entries => {
      const entry = entries[0];
      if (!entry) return;
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        const { width, height } = entry.contentRect;
        if (Math.round(width) === Math.round(cssW) && Math.round(height) === Math.round(cssH)) return;
        applySize(width, height);
        buildParticles(width, height);
      }, 150);
    });
    ro.observe(canvas);

    const initRect = canvas.getBoundingClientRect();
    applySize(initRect.width, initRect.height);
    buildParticles(initRect.width, initRect.height);

    if (reduceMotion) {
      drawStatic();
      return () => {
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerleave", onPointerLeave);
        ro.disconnect();
        window.clearTimeout(resizeTimer);
      };
    }

    function drawStatic() {
      ctx!.clearRect(0, 0, cssW, cssH);
      for (const p of particles) {
        ctx!.globalAlpha = p.alpha;
        ctx!.fillStyle = p.color;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;
    }

    let raf = 0;
    function tick() {
      const scrollY = window.scrollY;
      const viewTop = scrollY - VIEW_BUFFER;
      const viewBottom = scrollY + window.innerHeight + VIEW_BUFFER;
      ctx!.clearRect(0, Math.max(0, viewTop), cssW, viewBottom - viewTop);

      for (const p of particles) {
        if (p.y < viewTop || p.y > viewBottom) continue;

        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < REPEL_RADIUS && dist > 0.01) {
          const falloff = 1 - dist / REPEL_RADIUS;
          const force = REPEL_STRENGTH * falloff * falloff;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }

        p.vx += (p.homeX - p.x) * SPRING;
        p.vy += (p.homeY - p.y) * SPRING;
        p.vx *= DAMPING;
        p.vy *= DAMPING;
        p.x += p.vx;
        p.y += p.vy;

        ctx!.globalAlpha = p.alpha;
        ctx!.fillStyle = p.color;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      ro.disconnect();
      window.clearTimeout(resizeTimer);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="glitter-canvas" />;
}
