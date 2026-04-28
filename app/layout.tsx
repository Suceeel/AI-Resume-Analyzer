import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resume Analyzer — Instant AI Resume Scoring",
  description: "Upload your resume and get an instant score, strengths, weaknesses, and actionable suggestions.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-[#080a0f] antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}