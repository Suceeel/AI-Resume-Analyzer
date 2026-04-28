"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadBoxProps {
  onAnalyze: (file: File) => void;
  isLoading: boolean;
}

export function UploadBox({ onAnalyze, isLoading }: UploadBoxProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validate = (f: File): string | null => {
    if (f.type !== "application/pdf") return "Only PDF files are accepted";
    if (f.size > 5 * 1024 * 1024) return "File must be under 5MB";
    return null;
  };

  const handleFile = useCallback((f: File) => {
    const err = validate(f);
    if (err) {
      setError(err);
      setFile(null);
      return;
    }
    setError(null);
    setFile(f);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFile(dropped);
    },
    [handleFile]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) handleFile(selected);
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <label
          htmlFor="resume-upload"
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          className={cn(
            "relative flex flex-col items-center justify-center gap-4 h-64 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300",
            "bg-white/5 backdrop-blur-sm hover:bg-white/8",
            isDragging
              ? "border-[#a78bfa] bg-[#a78bfa]/10 scale-[1.02]"
              : file
              ? "border-[#34d399] bg-[#34d399]/5"
              : "border-white/20 hover:border-white/40"
          )}
        >
          <AnimatePresence mode="wait">
            {file ? (
              <motion.div
                key="file"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-col items-center gap-3 text-center px-6"
              >
                <div className="w-14 h-14 rounded-xl bg-[#34d399]/20 flex items-center justify-center">
                  <FileText className="w-7 h-7 text-[#34d399]" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm truncate max-w-[240px]">{file.name}</p>
                  <p className="text-white/40 text-xs mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setFile(null); }}
                  className="text-white/40 hover:text-white/70 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-3 text-center px-6"
              >
                <motion.div
                  animate={{ y: isDragging ? -8 : 0 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center"
                >
                  <Upload className="w-7 h-7 text-white/50" />
                </motion.div>
                <div>
                  <p className="text-white/80 font-medium">Drop your resume here</p>
                  <p className="text-white/40 text-sm mt-1">or click to browse · PDF only · Max 5MB</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <input
            id="resume-upload"
            type="file"
            accept="application/pdf"
            className="sr-only"
            onChange={onInputChange}
            disabled={isLoading}
          />
        </label>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        whileHover={{ scale: file && !isLoading ? 1.02 : 1 }}
        whileTap={{ scale: file && !isLoading ? 0.98 : 1 }}
        onClick={() => file && onAnalyze(file)}
        disabled={!file || isLoading}
        className={cn(
          "w-full py-4 rounded-2xl font-semibold text-sm tracking-wide transition-all duration-300",
          "relative overflow-hidden",
          file && !isLoading
            ? "bg-gradient-to-r from-[#7c3aed] to-[#a78bfa] text-white shadow-lg shadow-[#7c3aed]/30 hover:shadow-[#7c3aed]/50"
            : "bg-white/5 text-white/30 cursor-not-allowed"
        )}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full inline-block"
            />
            Analyzing Resume…
          </span>
        ) : (
          "Analyze Resume →"
        )}
      </motion.button>
    </div>
  );
}
