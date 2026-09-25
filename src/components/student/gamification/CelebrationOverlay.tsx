"use client";

import { useEffect, useState } from "react";

interface CelebrationOverlayProps {
  /** Title shown in the toast. */
  title: string;
  /** Body shown in the toast. */
  body?: string;
  /** Auto-dismiss after this many ms (default 4000). */
  durationMs?: number;
}

/**
 * R5 §4.6 — Celebration overlay (confetti + toast).
 *
 * Uses a small canvas-based confetti emitter (~80 particles, no library)
 * to celebrate milestones (badge unlock, streak day, level up, league
 * promotion). The cooldown is enforced server-side in
 * `emitCelebration`; this client component is purely presentational.
 */
export function CelebrationOverlay({
  title,
  body,
  durationMs = 4000,
}: CelebrationOverlayProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => setVisible(false), durationMs);
    return () => window.clearTimeout(t);
  }, [durationMs]);

  useEffect(() => {
    if (!visible) return;
    const canvas = document.createElement("canvas");
    canvas.style.position = "fixed";
    canvas.style.inset = "0";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "60";
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    type Particle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      size: number;
      rot: number;
      vr: number;
    };
    const colors = ["#10b981", "#f59e0b", "#3b82f6", "#ec4899", "#8b5cf6"];
    const particles: Particle[] = Array.from({ length: 80 }).map(() => ({
      x: window.innerWidth / 2,
      y: window.innerHeight / 3,
      vx: (Math.random() - 0.5) * 8,
      vy: -Math.random() * 6 - 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 6 + 4,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.2,
    }));

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = 0;
      for (const p of particles) {
        p.vy += 0.18;
        p.x += p.vx * (dt / 16);
        p.y += p.vy * (dt / 16);
        p.rot += p.vr * (dt / 16);
        if (p.y < window.innerHeight + 20) {
          alive += 1;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();
        }
      }
      if (alive > 0) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.remove();
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 top-6 z-[60] w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-lg"
    >
      <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
        🎉 Celebration
      </p>
      <p className="mt-1 font-display text-base font-bold text-on-surface">
        {title}
      </p>
      {body ? (
        <p className="mt-1 text-xs text-secondary">{body}</p>
      ) : null}
    </div>
  );
}