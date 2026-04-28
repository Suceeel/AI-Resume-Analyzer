"use client";

import { motion } from "framer-motion";

interface ScoreCardProps {
  score: number;
}

function getScoreLabel(score: number): { label: string; color: string; ring: string } {
  if (score >= 80) return { label: "Excellent", color: "#34d399", ring: "#34d399" };
  if (score >= 65) return { label: "Good", color: "#60a5fa", ring: "#60a5fa" };
  if (score >= 45) return { label: "Fair", color: "#fbbf24", ring: "#fbbf24" };
  return { label: "Needs Work", color: "#f87171", ring: "#f87171" };
}

export function ScoreCard({ score }: ScoreCardProps) {
  const { label, color, ring } = getScoreLabel(score);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-40 h-40">
        {/* Background ring */}
        <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
          <circle
            cx="64" cy="64" r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="10"
          />
          {/* Animated score ring */}
          <motion.circle
            cx="64" cy="64" r={radius}
            fill="none"
            stroke={ring}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            style={{ filter: `drop-shadow(0 0 8px ${ring}60)` }}
          />
        </svg>

        {/* Score number */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl font-black text-white leading-none"
          >
            {score}
          </motion.span>
          <span className="text-white/30 text-xs font-medium mt-0.5">/100</span>
        </div>
      </div>

      {/* Label */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex flex-col items-center gap-1"
      >
        <span
          className="text-sm font-bold tracking-wide"
          style={{ color }}
        >
          {label}
        </span>
        <span className="text-white/25 text-xs">Overall Resume Score</span>
      </motion.div>
    </div>
  );
}