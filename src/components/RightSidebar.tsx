import React, { useState } from "react";
import { Search, Hash, Sparkles, Sliders, Zap, Check, Flame, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface RightSidebarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  categories: string[];
  glowColor: string;
  glowSettings: {
    intensity: number;
    color: "purple" | "cyan" | "pink" | "sunset" | "aurora";
    speed: "slow" | "medium" | "fast";
  };
  setGlowSettings: (settings: any) => void;
  onGeneratePost: (topic: string, category: string, tone: string) => Promise<void>;
  isGenerating: boolean;
}

export default function RightSidebar({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  categories,
  glowColor,
  glowSettings,
  setGlowSettings,
  onGeneratePost,
  isGenerating
}: RightSidebarProps) {
  const [quickTopic, setQuickTopic] = useState("");
  const [quickCat, setQuickCat] = useState("Technology");
  const [quickTone, setQuickTone] = useState("insightful");

  const colorOptions: { id: "purple" | "cyan" | "pink" | "sunset" | "aurora"; label: string; hex: string }[] = [
    { id: "purple", label: "Lavender", hex: "#a855f7" },
    { id: "cyan", label: "Neon Cyan", hex: "#06b6d4" },
    { id: "pink", label: "Soft Pink", hex: "#ec4899" },
    { id: "sunset", label: "Sunset Gold", hex: "#f97316" },
    { id: "aurora", label: "Aurora Green", hex: "#10b981" }
  ];

  const speedOptions: { id: "slow" | "medium" | "fast"; label: string }[] = [
    { id: "slow", label: "Whisper" },
    { id: "medium", label: "Breathe" },
    { id: "fast", label: "Pulse" }
  ];

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTopic.trim() || isGenerating) return;
    onGeneratePost(quickTopic, quickCat, quickTone);
    setQuickTopic("");
  };

  return (
    <aside className="space-y-6 lg:w-80 w-full shrink-0" id="right-side-bar">
      {/* 1. SEARCH BOX */}
      <div 
        className="p-5 rounded-3xl border border-white/5 bg-black/40 backdrop-blur-md relative overflow-hidden transition-all duration-300 hover:border-white/10"
        id="sidebar-search-container"
      >
        <h3 className="font-sans font-semibold text-white/90 text-sm mb-3 flex items-center gap-2">
          <Search className="w-4 h-4 text-white/50" />
          <span>Search Articles</span>
        </h3>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search keywords, authors..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/5 text-sm text-white placeholder-white/40 border border-white/10 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/30 transition-all duration-300"
            id="sidebar-search-input"
          />
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-white/40" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2 text-[10px] bg-white/10 hover:bg-white/20 text-white/80 px-1.5 py-1 rounded-md"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* 2. CATEGORIES FILTER */}
      <div 
        className="p-5 rounded-3xl border border-white/5 bg-black/40 backdrop-blur-md relative overflow-hidden transition-all duration-300 hover:border-white/10"
        id="sidebar-categories-container"
      >
        <h3 className="font-sans font-semibold text-white/90 text-sm mb-3 flex items-center gap-2">
          <Hash className="w-4 h-4 text-white/50" />
          <span>Categories</span>
        </h3>
        <div className="flex flex-wrap lg:flex-col gap-1.5">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-300 text-left ${
              selectedCategory === null
                ? "bg-white/10 text-white"
                : "text-white/60 hover:text-white/90 hover:bg-white/5"
            }`}
            id="cat-filter-all"
          >
            <span>All Categories</span>
            <span className="opacity-50 text-[10px] font-mono">•</span>
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-300 text-left ${
                selectedCategory === cat
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:text-white/90 hover:bg-white/5"
              }`}
              id={`cat-filter-${cat.toLowerCase()}`}
            >
              <span>{cat}</span>
              <span className="opacity-50 text-[10px] font-mono">#</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. LIGHTS & AURA CONTROLLER (CUSTOM REQ: "lights, colors like light purple, colored lights") */}
      <div 
        className="p-5 rounded-3xl border border-white/5 bg-black/40 backdrop-blur-md relative overflow-hidden transition-all duration-300 hover:border-white/10"
        id="sidebar-lights-controller"
      >
        {/* Decorative mini ambient light in top right */}
        <div 
          className="absolute -right-6 -top-6 w-16 h-16 rounded-full filter blur-xl opacity-30 animate-pulse transition-all duration-700"
          style={{ backgroundColor: glowColor }}
        />

        <h3 className="font-sans font-semibold text-white/90 text-sm mb-3.5 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-white/50" />
          <span>Ambient Lights Control</span>
        </h3>

        {/* Color Palette Choice */}
        <div className="mb-4">
          <label className="text-[11px] font-medium text-white/50 uppercase tracking-wider block mb-2">
            Aura Color Spectrum
          </label>
          <div className="grid grid-cols-5 gap-2">
            {colorOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setGlowSettings({ ...glowSettings, color: opt.id })}
                className="group relative flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all duration-200 cursor-pointer"
                title={opt.label}
                id={`light-color-${opt.id}`}
              >
                <div 
                  className="w-4.5 h-4.5 rounded-full relative transition-transform duration-300 group-hover:scale-110"
                  style={{ 
                    backgroundColor: opt.hex,
                    boxShadow: glowSettings.color === opt.id ? `0 0 12px ${opt.hex}` : "none" 
                  }}
                />
                {glowSettings.color === opt.id && (
                  <div className="absolute inset-0 border border-white/40 rounded-xl" />
                )}
                <span className="text-[9px] mt-1 text-white/40 group-hover:text-white/80 transition-colors duration-200">
                  {opt.id.slice(0, 3)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Intensity Slider */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <label className="text-[11px] font-medium text-white/50 uppercase tracking-wider">
              Luminosity Power
            </label>
            <span className="text-[11px] font-mono text-white/70">{glowSettings.intensity}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={glowSettings.intensity}
            onChange={(e) => setGlowSettings({ ...glowSettings, intensity: parseInt(e.target.value) })}
            className="w-full accent-purple-400 bg-white/10 h-1.5 rounded-lg cursor-pointer focus:outline-none"
            id="light-intensity-slider"
          />
        </div>

        {/* Speed Option Selector */}
        <div>
          <label className="text-[11px] font-medium text-white/50 uppercase tracking-wider block mb-2">
            Dynamic Wave Velocity
          </label>
          <div className="grid grid-cols-3 gap-1.5 bg-white/5 p-1 rounded-xl border border-white/5">
            {speedOptions.map((spd) => (
              <button
                key={spd.id}
                onClick={() => setGlowSettings({ ...glowSettings, speed: spd.id })}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-medium text-center transition-all duration-300 ${
                  glowSettings.speed === spd.id
                    ? "bg-white/15 text-white border border-white/10"
                    : "text-white/50 hover:text-white/80"
                }`}
                id={`light-speed-${spd.id}`}
              >
                {spd.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. QUICK AI WRITER BOX */}
      <div 
        className="p-5 rounded-3xl border border-white/5 bg-black/40 backdrop-blur-md relative overflow-hidden transition-all duration-300 hover:border-white/10"
        id="sidebar-quick-writer"
      >
        <h3 className="font-sans font-semibold text-white/90 text-sm mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
          <span>Interactive AI Writer</span>
        </h3>
        <p className="text-xs text-white/50 leading-relaxed mb-4">
          Input any topic to instantly prompt Gemini 3.5 to compose a deep, elegant blog post in our theme.
        </p>
        <form onSubmit={handleQuickSubmit} className="space-y-3">
          <div>
            <textarea
              value={quickTopic}
              onChange={(e) => setQuickTopic(e.target.value)}
              placeholder="e.g., The Zen of minimal desk setups, web development in 2030..."
              className="w-full h-20 p-3 rounded-2xl bg-white/5 text-xs text-white placeholder-white/30 border border-white/10 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/30 resize-none transition-all duration-300"
              maxLength={150}
              required
              id="quick-writer-topic"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] text-white/40 block mb-1 uppercase tracking-wider">Category</label>
              <select
                value={quickCat}
                onChange={(e) => setQuickCat(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-black border border-white/10 text-[11px] text-white/80 focus:outline-none focus:border-purple-400"
                id="quick-writer-category"
              >
                <option value="Design">Design</option>
                <option value="Technology">Technology</option>
                <option value="Philosophy">Philosophy</option>
                <option value="Future">Future</option>
                <option value="Lifestyle">Lifestyle</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] text-white/40 block mb-1 uppercase tracking-wider">Writing Tone</label>
              <select
                value={quickTone}
                onChange={(e) => setQuickTone(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-black border border-white/10 text-[11px] text-white/80 focus:outline-none focus:border-purple-400"
                id="quick-writer-tone"
              >
                <option value="insightful">Insightful</option>
                <option value="minimalist">Minimalist</option>
                <option value="futuristic">Futuristic</option>
                <option value="poetic">Poetic</option>
                <option value="technical">Technical</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={!quickTopic.trim() || isGenerating}
            className="w-full py-2 px-4 rounded-xl text-xs font-bold bg-white text-black hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100 transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer"
            id="quick-writer-submit-btn"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                <span>Compose AI Article</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* 5. USER ENGAGEMENT / READING STATS */}
      <div 
        className="p-5 rounded-3xl border border-white/5 bg-black/40 backdrop-blur-md relative overflow-hidden transition-all duration-300 hover:border-white/10"
        id="sidebar-reading-stats"
      >
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-sans font-semibold text-white/90 text-sm flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" />
            <span>Your Reading Log</span>
          </h3>
          <span className="text-[10px] bg-orange-500/10 text-orange-400 font-mono px-2 py-0.5 rounded-full">ACTIVE</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex flex-col items-center justify-center border border-orange-500/20">
            <span className="font-mono font-bold text-lg text-orange-400 leading-none">5</span>
            <span className="text-[8px] uppercase font-semibold text-orange-500/80 mt-1">Days</span>
          </div>
          <div>
            <p className="text-xs text-white/80 font-medium">Daily Streak: 5 Days</p>
            <p className="text-[10px] text-white/40 leading-normal mt-0.5">Read just 1 article tomorrow to maintain your mindfulness habit.</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
