"use client";

import { motion } from "framer-motion";

function Shimmer({ className }: { className: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-white/5 ${className}`}>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        animate={{ x: ["-100%", "100%"] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
      />
    </div>
  );
}

export function LoadingSkeleton() {
  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 pt-8">
      <div className="flex flex-col items-center gap-4">
        <Shimmer className="w-44 h-44 rounded-full" />
        <Shimmer className="w-28 h-8 rounded-full" />
      </div>
      <Shimmer className="h-20 w-full rounded-2xl" />
      <Shimmer className="h-40 w-full rounded-2xl" />
      <Shimmer className="h-32 w-full rounded-2xl" />
      <Shimmer className="h-36 w-full rounded-2xl" />
    </div>
  );
}
