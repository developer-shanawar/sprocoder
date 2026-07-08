import React from "react";
import { Sparkles } from "lucide-react";

interface AdSenseUnitProps {
  slot?: string;
  format?: "horizontal" | "vertical" | "rectangle";
  className?: string;
}

export const AdSenseUnit: React.FC<AdSenseUnitProps> = ({ slot, format = "rectangle", className = "" }) => {
  const getFormatClasses = () => {
    switch (format) {
      case "horizontal":
        return "h-[90px] w-full";
      case "vertical":
        return "h-[600px] w-full max-w-[300px]";
      case "rectangle":
      default:
        return "h-[280px] w-full max-w-[336px]";
    }
  };

  return (
    <div 
      className={`relative border-2 border-dashed border-purple-200/80 bg-purple-50/25 rounded-3xl p-4 flex flex-col items-center justify-center text-center overflow-hidden transition-all hover:border-purple-300 hover:bg-purple-50/40 select-none mx-auto ${getFormatClasses()} ${className}`}
      id={`adsense-unit-${slot || format}`}
    >
      {/* Decorative corners */}
      <div className="absolute top-2 left-2 w-2 h-2 border-t-2 border-l-2 border-purple-300 rounded-tl" />
      <div className="absolute top-2 right-2 w-2 h-2 border-t-2 border-r-2 border-purple-300 rounded-tr" />
      <div className="absolute bottom-2 left-2 w-2 h-2 border-b-2 border-l-2 border-purple-300 rounded-bl" />
      <div className="absolute bottom-2 right-2 w-2 h-2 border-b-2 border-r-2 border-purple-300 rounded-br" />

      <div className="space-y-1.5 z-10">
        <span className="text-[9px] font-black text-purple-400 tracking-widest uppercase block font-mono">
          Advertisement
        </span>
        <div className="flex items-center justify-center gap-1.5 text-purple-950 font-bold text-xs">
          <Sparkles className="w-3.5 h-3.5 text-purple-500 shrink-0" />
          <span>Google AdSense Slot</span>
        </div>
        <p className="text-[9px] text-gray-500 max-w-[220px] leading-normal mx-auto">
          Responsive ad unit container. Fully policy-compliant and SEO ready.
        </p>
      </div>
      
      <div className="absolute bottom-2 right-3 text-[8px] text-purple-300 font-mono">
        Slot: {slot || "auto"}
      </div>
    </div>
  );
};
export default AdSenseUnit;
