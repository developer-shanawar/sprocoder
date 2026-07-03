import React from "react";
import { BookOpen, Bookmark, Sparkles, Flame, Eye } from "lucide-react";
import { motion } from "motion/react";

interface FloatingNavbarProps {
  activeTab: "all" | "bookmarks";
  setActiveTab: (tab: "all" | "bookmarks") => void;
  onOpenAiWriter: () => void;
  bookmarkCount: number;
  glowColor: string;
}

export default function FloatingNavbar({
  activeTab,
  setActiveTab,
  onOpenAiWriter,
  bookmarkCount,
  glowColor
}: FloatingNavbarProps) {
  return (
    <header className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <motion.nav
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
        className="w-full max-w-3xl flex items-center justify-between px-4 sm:px-6 py-3 rounded-full border border-white/10 bg-black/60 backdrop-blur-xl shadow-2xl pointer-events-auto relative"
        style={{
          boxShadow: `0 8px 32px 0 rgba(0, 0, 0, 0.37), 0 0 16px -2px ${glowColor}33`
        }}
        id="floating-nav-bar"
      >
        {/* Glow Light Behind Navbar */}
        <div 
          className="absolute inset-0 rounded-full opacity-20 filter blur-md pointer-events-none transition-all duration-500"
          style={{ background: `radial-gradient(circle, ${glowColor} 0%, transparent 80%)` }}
        />

        {/* Brand Logo */}
        <div className="flex items-center gap-2.5 relative z-10">
          <div className="relative">
            <div 
              className="w-3.5 h-3.5 rounded-full animate-ping absolute opacity-70"
              style={{ backgroundColor: glowColor }}
            />
            <div 
              className="w-3.5 h-3.5 rounded-full relative shadow-md transition-all duration-500"
              style={{ backgroundColor: glowColor, boxShadow: `0 0 10px ${glowColor}` }}
            />
          </div>
          <span className="font-sans font-bold tracking-wider text-sm sm:text-base text-white flex items-center gap-1.5 select-none">
            GLOW <span className="text-white/50 font-normal">BLOG</span>
          </span>
        </div>

        {/* Tab Selection Navigation */}
        <div className="flex items-center gap-1.5 relative z-10 bg-white/5 p-1 rounded-full border border-white/5">
          <button
            onClick={() => setActiveTab("all")}
            className={`relative flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ${
              activeTab === "all" ? "text-white" : "text-white/60 hover:text-white/90"
            }`}
            id="nav-tab-all"
          >
            {activeTab === "all" && (
              <motion.div
                layoutId="active-nav-pill"
                className="absolute inset-0 bg-white/10 rounded-full border border-white/10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Articles</span>
          </button>

          <button
            onClick={() => setActiveTab("bookmarks")}
            className={`relative flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ${
              activeTab === "bookmarks" ? "text-white" : "text-white/60 hover:text-white/90"
            }`}
            id="nav-tab-bookmarks"
          >
            {activeTab === "bookmarks" && (
              <motion.div
                layoutId="active-nav-pill"
                className="absolute inset-0 bg-white/10 rounded-full border border-white/10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <Bookmark className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Saved</span>
            {bookmarkCount > 0 && (
              <span 
                className="text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold leading-none text-black transition-all duration-500"
                style={{ backgroundColor: glowColor }}
              >
                {bookmarkCount}
              </span>
            )}
          </button>
        </div>

        {/* Action Button: AI Post Generator */}
        <div className="relative z-10">
          <button
            onClick={onOpenAiWriter}
            className="group flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-bold bg-white text-black hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_4px_20px_rgba(255,255,255,0.25)] hover:shadow-white/30 cursor-pointer"
            id="nav-btn-ai-writer"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600 animate-pulse group-hover:rotate-12 transition-transform duration-300" />
            <span>AI Writer</span>
          </button>
        </div>
      </motion.nav>
    </header>
  );
}
