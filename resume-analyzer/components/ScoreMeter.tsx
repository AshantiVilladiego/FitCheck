"use client";

import { useEffect, useState } from "react";

interface ScoreMeterProps {
  score: number; // 0-100
  verdict: string;
}

function scoreColor(score: number) {
  if (score >= 70) return "#C6F135"; // neon green — strong fit
  if (score >= 50) return "#FFE347"; // neon yellow — partial fit
  return "#FF2EC4"; // neon pink — weak fit
}

export default function ScoreMeter({ score, verdict }: ScoreMeterProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    setAnimatedScore(0);
    const timeout = setTimeout(() => {
      const duration = 900;
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setAnimatedScore(Math.round(eased * score));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, 100);
    return () => clearTimeout(timeout);
  }, [score]);

  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const progress = (animatedScore / 100) * circumference;
  const color = scoreColor(score);

  // Tick marks around the dial, every 10%
  const ticks = Array.from({ length: 20 }, (_, i) => i * 18);

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative h-[220px] w-[220px]">
        <svg viewBox="0 0 220 220" className="h-full w-full -rotate-90">
          {/* tick marks */}
          {ticks.map((angle, i) => (
            <line
              key={i}
              x1="110"
              y1="8"
              x2="110"
              y2={i % 5 === 0 ? "18" : "14"}
              stroke="#1B1F3B"
              strokeOpacity={i % 5 === 0 ? 0.35 : 0.15}
              strokeWidth={i % 5 === 0 ? 2 : 1}
              transform={`rotate(${angle} 110 110)`}
            />
          ))}
          {/* track */}
          <circle
            cx="110"
            cy="110"
            r={radius}
            fill="none"
            stroke="#E4E1D8"
            strokeWidth="14"
          />
          {/* progress */}
          <circle
            cx="110"
            cy="110"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${progress} ${circumference}`}
            style={{ transition: "stroke 0.3s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-5xl font-semibold text-ink">
            {animatedScore}
            <span className="text-2xl text-slate">%</span>
          </span>
          <span className="mt-1 font-mono text-[10px] uppercase tracking-widest text-slate">
            fit score
          </span>
        </div>
      </div>
      <div
        className="mt-3 -rotate-2 border-2 border-ink bg-paper px-4 py-1 font-display text-sm font-semibold uppercase tracking-wide text-ink"
        style={{ boxShadow: "3px 3px 0 #1B1F3B" }}
      >
        {verdict}
      </div>
    </div>
  );
}
