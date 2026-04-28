"use client";

import { motion } from "framer-motion";
import {
  CheckCircle2, XCircle, Lightbulb, Code2, BookOpen, Briefcase,
  FolderOpen, User, Mail, Phone, Link2, Globe,
  Target, Zap, AlertTriangle, TrendingUp, FileText, Hash,
} from "lucide-react";
import { AnalysisResult } from "@/lib/analyzer";

interface ResultSectionsProps {
  data: AnalysisResult;
}

const cardVariants: import("framer-motion").Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full h-1.5 rounded-full bg-white/8 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="h-full rounded-full"
        style={{ background: color }}
      />
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: string | number; icon: React.ElementType; color: string; sub?: string;
}) {
  return (
    <div className="flex flex-col gap-2 p-4 rounded-xl bg-white/5 border border-white/8 hover:bg-white/8 transition-colors">
      <div className="flex items-center justify-between">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-xl font-black text-white">{value}</span>
      </div>
      <div>
        <p className="text-white/60 text-xs font-medium">{label}</p>
        {sub && <p className="text-white/30 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const sectionIcons = {
  education: BookOpen, experience: Briefcase, skills: Code2, projects: FolderOpen, summary: User,
};

const contactIcons: Record<string, React.ElementType> = {
  email: Mail, phone: Phone, linkedin: Link2, github: Link2, website: Globe,
};

export function ResultSections({ data }: ResultSectionsProps) {
  const contactEntries = Object.entries(data.contactInfo) as [keyof typeof data.contactInfo, boolean][];
  const sectionEntries = Object.entries(data.sections) as [keyof typeof data.sections, boolean][];

  return (
    <div className="grid gap-4">

      {/* Metrics Row */}
      <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Action Verbs" value={data.metrics.actionVerbCount} icon={Zap} color="#a78bfa" sub="in bullet points" />
          <StatCard label="Quantified" value={data.metrics.quantifiedAchievements} icon={TrendingUp} color="#34d399" sub="achievements" />
          <StatCard label="Bullet Points" value={data.metrics.bulletPoints} icon={Hash} color="#60a5fa" sub="detected" />
          <StatCard label="Est. Pages" value={data.metrics.pageEstimate} icon={FileText} color="#fbbf24" sub={`${data.wordCount} words`} />
        </div>
      </motion.div>

      {/* ATS + Readability */}
      <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible"
        className="grid sm:grid-cols-2 gap-3">
        <div className="p-4 rounded-xl bg-white/5 border border-white/8 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-[#60a5fa]" />
              <span className="text-xs font-semibold text-white/60 uppercase tracking-widest">ATS Score</span>
            </div>
            <span className="text-lg font-black text-[#60a5fa]">{data.atsScore}/100</span>
          </div>
          <MiniBar value={data.atsScore} color="#60a5fa" />
          <p className="text-white/30 text-xs">
            {data.atsScore >= 70 ? "Likely to pass automated filters" : data.atsScore >= 40 ? "May be filtered — improve keywords & sections" : "High risk of ATS rejection"}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/8 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#f472b6]" />
              <span className="text-xs font-semibold text-white/60 uppercase tracking-widest">Readability</span>
            </div>
            <span className="text-lg font-black text-[#f472b6]">{data.readabilityScore}/100</span>
          </div>
          <MiniBar value={data.readabilityScore} color="#f472b6" />
          <p className="text-white/30 text-xs">
            {data.readabilityScore >= 75 ? "Clear and concise writing" : data.readabilityScore >= 55 ? "Moderately readable — simplify sentences" : "Sentences are too long or complex"}
          </p>
        </div>
      </motion.div>

      {/* Industry + Contact */}
      <motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible"
        className="grid sm:grid-cols-2 gap-3">
        <div className="p-4 rounded-xl bg-white/5 border border-white/8">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Detected Industry</p>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-lg bg-[#7c3aed]/20 border border-[#7c3aed]/30 text-[#c4b5fd] text-sm font-semibold">
              {data.industry}
            </span>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/8">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Contact Info</p>
          <div className="flex flex-wrap gap-2">
            {contactEntries.map(([key, present]) => {
              const Icon = contactIcons[key];
              return (
                <div key={key} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${present ? "bg-[#34d399]/10 border-[#34d399]/30 text-[#34d399]" : "bg-white/4 border-white/8 text-white/25"}`}>
                  <Icon className="w-3 h-3" />
                  <span className="capitalize">{key}</span>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Sections */}
      <motion.div custom={3} variants={cardVariants} initial="hidden" animate="visible"
        className="p-4 rounded-xl bg-white/5 border border-white/8">
        <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Sections Detected</p>
        <div className="flex flex-wrap gap-2">
          {sectionEntries.map(([key, present]) => {
            const Icon = sectionIcons[key];
            return (
              <div key={key} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border ${present ? "bg-[#34d399]/10 border-[#34d399]/30 text-[#34d399]" : "bg-white/4 border-white/8 text-white/25"}`}>
                <Icon className="w-3.5 h-3.5" />
                <span className="capitalize">{key}</span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Strengths */}
      <motion.div custom={4} variants={cardVariants} initial="hidden" animate="visible"
        className="p-5 rounded-2xl bg-[#34d399]/8 border border-[#34d399]/20">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="w-4 h-4 text-[#34d399]" />
          <h3 className="text-xs font-semibold text-[#34d399] uppercase tracking-widest">Strengths</h3>
          <span className="ml-auto text-xs text-[#34d399]/60 font-medium">{data.strengths.length} found</span>
        </div>
        <ul className="space-y-2.5">
          {data.strengths.map((s, i) => (
            <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.06 }}
              className="flex items-start gap-3 text-sm text-white/80">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] mt-2 shrink-0" />
              {s}
            </motion.li>
          ))}
        </ul>
      </motion.div>

      {/* Weaknesses */}
      <motion.div custom={5} variants={cardVariants} initial="hidden" animate="visible"
        className="p-5 rounded-2xl bg-[#f87171]/8 border border-[#f87171]/20">
        <div className="flex items-center gap-2 mb-4">
          <XCircle className="w-4 h-4 text-[#f87171]" />
          <h3 className="text-xs font-semibold text-[#f87171] uppercase tracking-widest">Weaknesses</h3>
          <span className="ml-auto text-xs text-[#f87171]/60 font-medium">{data.weaknesses.length} found</span>
        </div>
        {data.weaknesses.length === 0 ? (
          <p className="text-sm text-white/40 italic">No major weaknesses detected 🎉</p>
        ) : (
          <ul className="space-y-2.5">
            {data.weaknesses.map((w, i) => (
              <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.06 }}
                className="flex items-start gap-3 text-sm text-white/80">
                <span className="w-1.5 h-1.5 rounded-full bg-[#f87171] mt-2 shrink-0" />
                {w}
              </motion.li>
            ))}
          </ul>
        )}
      </motion.div>

      {/* Weak Bullets */}
      {data.weakBullets.length > 0 && (
        <motion.div custom={6} variants={cardVariants} initial="hidden" animate="visible"
          className="p-5 rounded-2xl bg-[#fbbf24]/6 border border-[#fbbf24]/20">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-[#fbbf24]" />
            <h3 className="text-xs font-semibold text-[#fbbf24] uppercase tracking-widest">Weak Bullet Points</h3>
          </div>
          <ul className="space-y-2">
            {data.weakBullets.map((b, i) => (
              <li key={i} className="text-xs text-white/50 bg-white/4 rounded-lg px-3 py-2 border border-white/8 font-mono">
                {b}
              </li>
            ))}
          </ul>
          <p className="text-white/30 text-xs mt-3">Replace passive language with strong action verbs</p>
        </motion.div>
      )}

      {/* Suggestions */}
      <motion.div custom={7} variants={cardVariants} initial="hidden" animate="visible"
        className="p-5 rounded-2xl bg-white/5 border border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-4 h-4 text-[#fbbf24]" />
          <h3 className="text-xs font-semibold text-[#fbbf24] uppercase tracking-widest">Suggestions</h3>
        </div>
        <ul className="space-y-3">
          {data.suggestions.map((s, i) => (
            <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.07 }}
              className="flex items-start gap-3 text-sm text-white/80">
              <span className="text-[#fbbf24] font-black text-xs mt-0.5 shrink-0 w-5">{String(i + 1).padStart(2, "0")}</span>
              {s}
            </motion.li>
          ))}
        </ul>
      </motion.div>

      {/* Keywords */}
      {data.keywords.length > 0 && (
        <motion.div custom={8} variants={cardVariants} initial="hidden" animate="visible"
          className="p-5 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">Keywords Found · {data.keywords.length}</p>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {data.keywords.map((kw) => (
              <span key={kw} className="px-3 py-1 rounded-lg bg-[#7c3aed]/20 border border-[#7c3aed]/30 text-[#c4b5fd] text-xs font-medium">
                {kw}
              </span>
            ))}
          </div>
          {data.missingKeywords.length > 0 && (
            <>
              <p className="text-xs font-semibold text-white/25 uppercase tracking-widest mb-2">High-Value Keywords Missing</p>
              <div className="flex flex-wrap gap-2">
                {data.missingKeywords.map((kw) => (
                  <span key={kw} className="px-3 py-1 rounded-lg bg-[#f87171]/10 border border-[#f87171]/20 text-[#f87171]/70 text-xs font-medium line-through decoration-[#f87171]/40">
                    {kw}
                  </span>
                ))}
              </div>
            </>
          )}
        </motion.div>
      )}

      {/* Duplicate Words */}
      {data.duplicateWords.length >= 3 && (
        <motion.div custom={9} variants={cardVariants} initial="hidden" animate="visible"
          className="p-4 rounded-xl bg-white/4 border border-white/8">
          <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-2">Overused Words</p>
          <div className="flex flex-wrap gap-2">
            {data.duplicateWords.map((w) => (
              <span key={w} className="text-xs text-white/40 bg-white/5 px-2.5 py-1 rounded-lg border border-white/8">{w}</span>
            ))}
          </div>
        </motion.div>
      )}

    </div>
  );
}