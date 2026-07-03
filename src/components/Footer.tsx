import React from "react";
import { Youtube, Github, Linkedin, Twitter, Sparkles } from "lucide-react";

interface FooterProps {
  currentTab: "home" | "articles" | "about" | "privacy" | "terms" | "contact" | "admin-auth" | "admin" | "profile";
  setCurrentTab: (tab: "home" | "articles" | "about" | "privacy" | "terms" | "contact" | "admin-auth" | "admin" | "profile") => void;
  isAdminAuthenticated: boolean;
}

export default function Footer({ currentTab, setCurrentTab, isAdminAuthenticated }: FooterProps) {
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
                  onClick={() => setCurrentTab("privacy")} 
                  className={`text-slate-300 hover:text-white transition-all text-left block cursor-pointer ${
                    currentTab === "privacy" ? "text-purple-400 font-bold font-mono" : ""
                  }`}
                >
                  Privacy Policy Guidelines
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setCurrentTab("terms")} 
                  className={`text-slate-300 hover:text-white transition-all text-left block cursor-pointer ${
                    currentTab === "terms" ? "text-purple-400 font-bold font-mono" : ""
                  }`}
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

        {/* Bottom copyright line without highlighted 2026 */}
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-4">
          <p>
            © 2023 - 2026 S pro coder. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5 font-mono text-[9px] bg-white/5 px-3 py-1 rounded-full border border-white/5">
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span>POWERED BY CLOUD ENGINE</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
