import React, { useEffect, useState } from "react";
import { Award, CheckCircle2, Star } from "lucide-react";

interface SprinkleConfettiProps {
  show: boolean;
  onClose?: () => void;
  courseTitle?: string;
}

export default function SprinkleConfetti({ show, onClose, courseTitle }: SprinkleConfettiProps) {
  const [particles, setParticles] = useState<Array<{ id: number; left: number; size: number; delay: number; color: string; duration: number; type: string }>>([]);

  useEffect(() => {
    if (!show) return;

    const colors = ["#a855f7", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4"];
    const types = ["circle", "star", "pill", "rect"];
    
    const generated = Array.from({ length: 45 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100, // percentage
      size: Math.floor(Math.random() * 12) + 8, // px
      delay: Math.random() * 2, // seconds
      color: colors[Math.floor(Math.random() * colors.length)],
      duration: Math.random() * 3 + 2, // seconds
      type: types[Math.floor(Math.random() * types.length)]
    }));

    setParticles(generated);
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[10000] pointer-events-none flex items-center justify-center p-4 overflow-hidden">
      {/* Background Soft Glow */}
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm pointer-events-auto transition-opacity" onClick={onClose} />

      {/* Animated Sprinkle Particle Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p) => (
          <div
            key={p.id}
            style={{
              left: `${p.left}%`,
              top: `-5%`,
              animation: `sprinkleFall ${p.duration}s cubic-bezier(0.25, 1, 0.5, 1) ${p.delay}s infinite`,
              backgroundColor: p.type !== "star" ? p.color : "transparent",
              width: `${p.size}px`,
              height: p.type === "pill" ? `${p.size * 2.5}px` : `${p.size}px`,
              borderRadius: p.type === "circle" ? "50%" : p.type === "pill" ? "999px" : "3px",
              boxShadow: `0 0 10px ${p.color}`
            }}
            className="absolute transform opacity-90"
          >
            {p.type === "star" && (
              <Star style={{ color: p.color, width: `${p.size * 1.5}px`, height: `${p.size * 1.5}px` }} className="animate-spin" />
            )}
          </div>
        ))}
      </div>

      {/* Center Celebration Banner Card */}
      <div className="relative z-10 pointer-events-auto max-w-md w-full bg-slate-900 border-2 border-amber-400/90 text-white p-8 rounded-[36px] shadow-2xl text-center space-y-5 animate-in zoom-in duration-300">
        <div className="flex justify-center items-center gap-2">
          <Star className="w-5 h-5 text-amber-300 fill-amber-300" />
          <span className="px-3.5 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-widest shadow-md">
            Course Passed
          </span>
          <Star className="w-5 h-5 text-amber-300 fill-amber-300" />
        </div>

        <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-amber-400 via-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-purple-950/80">
          <Award className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            🎉 Course Complete!
          </h3>
          <p className="text-xs text-slate-300 font-medium leading-relaxed">
            Congratulations! You have mastered <strong>{courseTitle || "this course"}</strong> on the Sprinkle learning platform of <strong>sprocoder.online</strong>.
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg active:scale-95 flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4.5 h-4.5 text-slate-950" />
            <span>Continue Coder Journey</span>
          </button>
        </div>
      </div>

      {/* Global Sprinkle Falling CSS Animation */}
      <style>{`
        @keyframes sprinkleFall {
          0% {
            transform: translateY(0) rotate(0deg) scale(0.8);
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(720deg) scale(1.2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
