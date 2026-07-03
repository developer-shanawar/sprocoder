import React, { useState } from "react";
import { Youtube, Github, Linkedin, Twitter, Sparkles, KeyRound, AlertCircle, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface FooterProps {
  currentTab: "home" | "articles" | "about" | "contact";
  setCurrentTab: (tab: "home" | "articles" | "about" | "contact") => void;
  onOpenAdmin: () => void;
}

export default function Footer({ currentTab, setCurrentTab, onOpenAdmin }: FooterProps) {
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [loginError, setLoginError] = useState("");

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    const targetEmail = "shanawarali07860@gmail.com";
    const targetPassword = "Shanawarali@07860";
    const targetPin = "07860";

    if (
      adminEmail.trim() === targetEmail &&
      adminPassword === targetPassword &&
      adminPin === targetPin
    ) {
      setIsAdminLoginOpen(false);
      onOpenAdmin();
      // Clean inputs
      setAdminEmail("");
      setAdminPassword("");
      setAdminPin("");
    } else {
      setLoginError("Invalid Admin credentials or incorrect Security PIN.");
    }
  };

  return (
    <footer className="w-full bg-slate-950 text-white mt-16 rounded-t-[48px] border-t border-white/10 relative overflow-hidden" id="spro-footer">
      {/* Background Ambient glows */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-600/10 rounded-full filter blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 py-12 md:py-16 space-y-12">
        
        {/* Main Grid content */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 relative z-10">
          
          {/* Column 1: S pro coder Info */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center text-white font-extrabold text-xs shadow-md shadow-purple-500/20">
                SP
              </div>
              <h2 className="font-sans font-black text-xl tracking-tight">S pro coder</h2>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed max-w-sm">
              An advanced, cutting-edge technical hub and AI resource portal. We specialize in bringing clean developer tutorials, next-generation artificial intelligence insights, and robust software architectures straight to your browser.
            </p>

            {/* Social Media accounts */}
            <div className="flex items-center gap-2.5 pt-2">
              <a 
                href="https://youtube.com" 
                target="_blank" 
                rel="noreferrer" 
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-red-600 text-slate-300 hover:text-white flex items-center justify-center transition-all hover:scale-105"
                title="S pro coder YouTube Channel"
              >
                <Youtube className="w-4 h-4 fill-current" />
              </a>
              <a 
                href="https://github.com" 
                target="_blank" 
                rel="noreferrer" 
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-all hover:scale-105"
                title="S pro coder GitHub"
              >
                <Github className="w-4 h-4 fill-current" />
              </a>
              <a 
                href="https://linkedin.com" 
                target="_blank" 
                rel="noreferrer" 
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-blue-600 text-slate-300 hover:text-white flex items-center justify-center transition-all hover:scale-105"
                title="S pro coder LinkedIn"
              >
                <Linkedin className="w-4 h-4 fill-current" />
              </a>
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noreferrer" 
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-sky-500 text-slate-300 hover:text-white flex items-center justify-center transition-all hover:scale-105"
                title="S pro coder Twitter / X"
              >
                <Twitter className="w-4 h-4 fill-current" />
              </a>
            </div>
          </div>

          {/* Column 2: Navigation Links */}
          <div className="md:col-span-3 space-y-4">
            <h3 className="font-extrabold text-[10px] uppercase tracking-widest text-purple-400">
              Quick Navigation
            </h3>
            <ul className="space-y-2 text-xs">
              {(["home", "articles", "about", "contact"] as const).map((tab) => (
                <li key={tab}>
                  <button
                    onClick={() => setCurrentTab(tab)}
                    className={`text-slate-300 hover:text-white capitalize transition-all cursor-pointer ${
                      currentTab === tab ? "text-purple-400 font-bold" : ""
                    }`}
                  >
                    {tab}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Legal stuff */}
          <div className="md:col-span-4 space-y-4">
            <h3 className="font-extrabold text-[10px] uppercase tracking-widest text-purple-400">
              Policy & Conditions
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <button 
                  onClick={() => setCurrentTab("about")} 
                  className="text-slate-300 hover:text-white transition-all text-left block cursor-pointer"
                >
                  Privacy Policy Guidelines
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setCurrentTab("about")} 
                  className="text-slate-300 hover:text-white transition-all text-left block cursor-pointer"
                >
                  Terms and Conditions of Use
                </button>
              </li>
              <li>
                <p className="text-[10px] text-slate-400 leading-normal max-w-xs italic">
                  *Disclaimer: Realtime telemetry, content adjustments, and message dispatch are saved in standard, cloud-hosted Firebase repositories.
                </p>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom copyright line with easter-egg secret */}
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-4">
          <p>
            © 2023 -{" "}
            <span
              onClick={() => setIsAdminLoginOpen(true)}
              className="text-purple-400 font-bold hover:text-purple-300 underline cursor-pointer transition-colors"
              title="Activate Secret Admin Console"
              id="easter-egg-trigger"
            >
              2026
            </span>{" "}
            S pro coder. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5 font-mono text-[9px] bg-white/5 px-3 py-1 rounded-full border border-white/5">
            <Sparkles className="w-3 h-3 text-purple-400 animate-spin" />
            <span>POWERED BY CLOUD ENGINE</span>
          </div>
        </div>

      </div>

      {/* Secret Admin Login Popup */}
      <AnimatePresence>
        {isAdminLoginOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdminLoginOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            {/* Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-purple-500/30 rounded-[32px] w-full max-w-sm p-6 md:p-8 space-y-4 relative z-10 text-white shadow-2xl"
              id="secret-admin-popup"
            >
              <div className="text-center space-y-1">
                <div className="w-10 h-10 rounded-full bg-purple-600/10 text-purple-400 flex items-center justify-center mx-auto border border-purple-500/20 mb-2">
                  <ShieldAlert className="w-5 h-5 animate-pulse" />
                </div>
                <h3 className="font-extrabold text-base tracking-tight text-purple-300">
                  Secret Admin Gate
                </h3>
                <p className="text-[10px] text-zinc-400 leading-normal max-w-xs mx-auto">
                  You have triggered the Easter Egg gateway. Provide secure credentials to launch the live system management panels.
                </p>
              </div>

              {loginError && (
                <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-[10px] text-red-300 font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleAdminSubmit} className="space-y-3">
                <div className="space-y-1 text-left">
                  <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Admin Email</label>
                  <input
                    type="email"
                    required
                    placeholder="shanawarali07860@gmail.com"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                    id="admin-login-email"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Admin Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                    id="admin-login-password"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Security PIN Code</label>
                  <input
                    type="password"
                    required
                    maxLength={5}
                    placeholder="07860"
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 text-center font-mono tracking-widest font-black"
                    id="admin-login-pin"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                  id="admin-verify-btn"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Unlock System Deck</span>
                </button>
              </form>

              {/* Close Trigger */}
              <button
                onClick={() => setIsAdminLoginOpen(false)}
                className="absolute top-3 right-3 text-zinc-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </footer>
  );
}
