import React, { useEffect, useRef } from "react";

interface AdRendererProps {
  code: string;
  className?: string;
}

export default function AdRenderer({ code, className = "" }: AdRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !code) return;

    // Clear previous content
    containerRef.current.innerHTML = "";

    // Create a wrapping container
    const wrapper = document.createElement("div");
    wrapper.className = `w-full flex flex-col items-center justify-center my-4 py-3 px-2 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl max-w-full overflow-hidden text-center shadow-inner ${className}`;

    // Tiny, compliant sponsor tag
    const sponsorTag = document.createElement("span");
    sponsorTag.className = "text-[8px] text-gray-400 uppercase tracking-widest font-sans font-bold block mb-2";
    sponsorTag.innerText = "Advertisement";
    wrapper.appendChild(sponsorTag);

    // Ad element container
    const adBox = document.createElement("div");
    adBox.className = "w-full flex items-center justify-center overflow-auto min-h-[50px]";
    wrapper.appendChild(adBox);

    containerRef.current.appendChild(wrapper);

    try {
      // 1. Separate HTML content and script tags
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = code;

      // Extract all script elements
      const scripts = Array.from(tempDiv.getElementsByTagName("script"));
      
      // Clear scripts from HTML and inject pure markup
      scripts.forEach(s => s.parentNode?.removeChild(s));
      adBox.innerHTML = tempDiv.innerHTML;

      // 2. Load external scripts and run inline scripts sequentially
      scripts.forEach((oldScript) => {
        const newScript = document.createElement("script");
        
        // Copy attributes (src, async, crossorigin, etc.)
        Array.from(oldScript.attributes).forEach((attr) => {
          newScript.setAttribute(attr.name, attr.value);
        });

        // Copy inner code if present
        if (oldScript.innerHTML) {
          newScript.innerHTML = oldScript.innerHTML;
        }

        // Append to execute the script in the context of the container
        adBox.appendChild(newScript);
      });

      // Special helper for Google AdSense to push automatically if adsbygoogle exists
      if (code.includes("adsbygoogle") && window) {
        try {
          const pushScript = document.createElement("script");
          pushScript.innerHTML = "(window.adsbygoogle = window.adsbygoogle || []).push({});";
          adBox.appendChild(pushScript);
        } catch (e) {
          console.debug("AdSense autostart handled by client code");
        }
      }

    } catch (err) {
      console.error("AdRenderer script injection failed:", err);
      adBox.innerHTML = code;
    }
  }, [code, className]);

  return <div ref={containerRef} className="w-full mx-auto" />;
}
