"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ScoreCard } from "@/components/score-card";
import { ResultSections } from "@/components/result-sections";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { AnalysisResult } from "@/lib/analyzer";
import { ArrowLeft, FileText } from "lucide-react";

export default function ResultPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [fallback, setFallback] = useState(false);
  const [error, setError] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = sessionStorage.getItem("resumeResult");
      const fb = sessionStorage.getItem("resumeFallback");
      if (!raw) { setError(true); return; }
      setData(JSON.parse(raw));
      setFallback(fb === "1");
    } catch {
      setError(true);
    }
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#080a0f] flex items-center justify-center">
        <LoadingSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 text-center px-4 bg-[#080a0f]">
        <FileText className="w-12 h-12 text-white/20" />
        <p className="text-white/40">No analysis data found.</p>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-3 rounded-xl bg-[#7c3aed] text-white text-sm font-medium hover:bg-[#6d28d9] transition-colors"
        >
          Analyze a Resume
        </button>
      </div>
    );
  }

  const sectionsDetected = Object.values(data.sections).filter(Boolean).length;

  return (
    <main className="min-h-screen bg-[#080a0f] px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[15%] w-[500px] h-[500px] rounded-full bg-[#7c3aed]/12 blur-[100px]" />
        <div className="absolute bottom-[5%] left-[0%] w-[400px] h-[400px] rounded-full bg-[#1d4ed8]/8 blur-[90px]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto">
        <motion.button
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm transition-colors mb-10"
        >
          <ArrowLeft className="w-4 h-4" />
          Analyze another resume
        </motion.button>

        {fallback && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center gap-2 text-yellow-400/80 text-xs bg-yellow-400/8 border border-yellow-400/20 rounded-xl px-4 py-2.5"
          >
            <span>⚡</span>
            <span>Analyzed locally — AI service temporarily busy. Results are still accurate.</span>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 space-y-2"
        >
          <h1 className="text-3xl font-black text-white">Analysis Complete</h1>
          <div className="flex items-center justify-center flex-wrap gap-3 text-white/35 text-xs mt-3">
            <span>{data.wordCount} words</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>{data.keywords.length} tech keywords</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>{sectionsDetected}/5 sections</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>{data.metrics.pageEstimate} page{data.metrics.pageEstimate !== 1 ? "s" : ""} est.</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span className="text-[#c4b5fd]">{data.industry}</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center mb-8"
        >
          <ScoreCard score={data.score} />
        </motion.div>

        <ResultSections data={data} />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-8 text-center text-white/20 text-xs"
        >
          Analysis powered by Gemini AI + rule-based NLP · Results are indicative, not a guarantee
        </motion.div>
      </div>
    </main>
  );
}