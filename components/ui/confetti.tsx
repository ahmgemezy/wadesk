"use client";

import { useEffect, useState } from "react";

const COLORS = ["#0071E3", "#34C759", "#FF9500", "#FF3B30", "#AF52DE", "#FFD60A", "#30D158", "#FF2D55"];

interface Piece {
  id: number;
  x: number;
  color: string;
  width: number;
  height: number;
  delay: number;
  duration: number;
  initialRotation: number;
  shape: "rect" | "circle";
}

function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}

export function Confetti({ durationMs = 3500, onDone }: { durationMs?: number; onDone?: () => void }) {
  const [pieces] = useState<Piece[]>(() =>
    Array.from({ length: 70 }, (_, i) => ({
      id: i,
      x: rand(0, 100),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      width: rand(7, 14),
      height: rand(4, 9),
      delay: rand(0, 1.4),
      duration: rand(2.5, 4.2),
      initialRotation: rand(0, 360),
      shape: Math.random() > 0.45 ? "rect" : "circle",
    }))
  );

  useEffect(() => {
    const t = setTimeout(() => onDone?.(), durationMs);
    return () => clearTimeout(t);
  }, [durationMs, onDone]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 9999 }}>
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(-20px) rotate(var(--r0)); opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: translateY(105vh) rotate(calc(var(--r0) + 540deg)); opacity: 0; }
        }
      `}</style>
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: 0,
            width: p.shape === "circle" ? p.width : p.width,
            height: p.shape === "circle" ? p.width : p.height,
            borderRadius: p.shape === "circle" ? "50%" : 2,
            background: p.color,
            opacity: 0,
            ["--r0" as string]: `${p.initialRotation}deg`,
            animation: `confetti-fall ${p.duration}s ${p.delay}s ease-in forwards`,
          }}
        />
      ))}
    </div>
  );
}
