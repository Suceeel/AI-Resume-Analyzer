"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { UploadBox } from "@/components/upload-box";
import { Sparkles, Shield, Zap, Lock } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const form = new FormData();
      form.append("resume", file);

      const res = await fetch("/api/analyze", { method: "POST", body: form });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || "Analysis failed. Please try again.");
        return;
      }

      // Store in sessionStorage to avoid URL length limits
      sessionStorage.setItem("resumeResult", JSON.stringify(json.data));
      sessionStorage.setItem("resumeFallback", json.data.fallback ? "1" : "0");

      router.push("/result");
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#080a0f] flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] rounded-full bg-[#7c3aed]/15 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[5%] w-[500px] h-[500px] rounded-full bg-[#1d4ed8]/10 blur-[100px]" />
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-[#a78bfa]/8 blur-[80px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-2xl text-center space-y-10">
        <motion.div
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-5"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#7c3aed]/40 bg-[#7c3aed]/10 text-[#c4b5fd] text-xs font-semibold tracking-widest uppercase">
            <Sparkles className="w-3 h-3" />
            AI-Powered Resume Review
          </div>

          <h1 className="text-5xl sm:text-6xl font-black text-white leading-tight tracking-tight">
            Resume{" "}
            <span className="bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] bg-clip-text text-transparent">
              Analyzer
            </span>
          </h1>

          <p className="text-white/50 text-lg max-w-md mx-auto leading-relaxed">
            Get an instant AI score, discover your strengths, and unlock
            actionable improvements tailored to your resume.
          </p>
        </motion.div>

        <UploadBox onAnalyze={handleAnalyze} isLoading={isLoading} />

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3 max-w-sm mx-auto text-left"
          >
            <span className="mt-0.5 shrink-0">⚠️</span>
            <span>{error}</span>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-3 gap-4 max-w-sm mx-auto"
        >
          {[
            { icon: Lock, label: "100% Private", sub: "Never stored" },
            { icon: Zap, label: "~10s Analysis", sub: "Powered by AI" },
            { icon: Shield, label: "10/hr Limit", sub: "Fair use policy" },
          ].map(({ icon: Icon, label, sub }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1.5 text-center"
            >
              <Icon className="w-4 h-4 text-white/30" />
              <p className="text-white/50 text-xs font-medium">{label}</p>
              <p className="text-white/25 text-xs">{sub}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </main>
  );
}
