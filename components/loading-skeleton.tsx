"use client";

import { motion } from "framer-motion";

function Pulse({ className }: { className: string }) {
  return (
    <motion.div
      animate={{ opacity: [0.3, 0.6, 0.3] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      className={`rounded-lg bg-white/8 ${className}`}
    />
  );
}

export function LoadingSkeleton() {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-12 space-y-6">
      {/* Back button */}
      <Pulse className="h-4 w-36" />

      {/* Title */}
      <div className="text-center space-y-3 py-4">
        <Pulse className="h-8 w-56 mx-auto" />
        <Pulse className="h-3 w-72 mx-auto" />
      </div>

      {/* Score circle */}
      <div className="flex justify-center py-4">
        <Pulse className="w-40 h-40 rounded-full" />
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Pulse key={i} className="h-24" />
        ))}
      </div>

      {/* ATS + Readability */}
      <div className="grid sm:grid-cols-2 gap-3">
        <Pulse className="h-28" />
        <Pulse className="h-28" />
      </div>

      {/* Strengths */}
      <Pulse className="h-48" />

      {/* Weaknesses */}
      <Pulse className="h-40" />

      {/* Suggestions */}
      <Pulse className="h-52" />
    </div>
  );
}