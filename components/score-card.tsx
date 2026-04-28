"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface ScoreCardProps {
  score: number;
}

function getScoreColor(score: number) {
  if (score >= 75) return { stroke: "#34d399", text: "text-[#34d399]", label: "Excellent", bg: "bg-[#34d399]/10" };
  if (score >= 50) return { stroke: "#fbbf24", text: "text-[#fbbf24]", label: "Good", bg: "bg-[#fbbf24]/10" };
  return { stroke: "#f87171", text: "text-[#f87171]", label: "Needs Work", bg: "bg-[#f87171]/10" };
}

export function ScoreCard({ score }: ScoreCardProps) {
  const [displayed, setDisplayed] = useState(0);
  const requestRef = useRef<number | undefined>(undefined);
  const color = getScoreColor(score);

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const progress = (displayed / 100) * circumference;
  const dashOffset = circumference - progress;

  useEffect(() => {
    let start: number | null = null;
    const duration = 1400;

    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const pct = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - pct, 3);
      setDisplayed(Math.round(eased * score));
      if (pct < 1) requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [score]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, type: "spring" }}
      className="flex flex-col items-center gap-4"
    >
      <div className="relative">
        <svg width="180" height="180" className="-rotate-90">
          <circle
            cx="90" cy="90" r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="10"
          />
          <circle
            cx="90" cy="90" r={radius}
            fill="none"
            stroke={color.stroke}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 0.05s linear", filter: `drop-shadow(0 0 8px ${color.stroke}60)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
          <span className={`text-4xl font-black ${color.text}`}>{displayed}</span>
          <span className="text-white/40 text-xs font-medium tracking-widest uppercase">/ 100</span>
        </div>
      </div>

      <div className={`px-5 py-2 rounded-full ${color.bg} border border-white/10`}>
        <span className={`font-semibold text-sm ${color.text}`}>{color.label}</span>
      </div>
    </motion.div>
  );
}
