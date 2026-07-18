import React, { useEffect, useRef, useState } from "react";

interface AdRendererProps {
  code: string;
  className?: string;
}

// Global registry of loaded external script URLs to prevent duplicate network calls
const loadedExternalScripts = new Set<string>();

export default function AdRenderer({ code, className = "" }: AdRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !code) return;

    // Set up IntersectionObserver for lazy loading
    // Only load and render the ad slot when it comes within 200px of the viewport
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px", threshold: 0.01 }
    );

    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
    };
  }, [code]);

  useEffect(() => {
    if (!isVisible || !containerRef.current || !code) return;

    // Clear previous content
    containerRef.current.innerHTML = "";

    // Create a wrapping container
    const wrapper = document.createElement("div");
    wrapper.className = `w-full flex flex-col items-center justify-center my-4 py-3 px-2 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl max-w-full overflow-hidden text-center shadow-inner transition-all duration-300 ${className}`;

    // Tiny, compliant sponsor tag
    const sponsorTag = document.createElement("span");
    sponsorTag.className = "text-[8px] text-gray-400 uppercase tracking-widest font-sans font-bold block mb-2";
    sponsorTag.innerText = "Advertisement";
    wrapper.appendChild(sponsorTag);

    // Ad element container with minimum height to avoid layout shift (CLS optimization)
    const adBox = document.createElement("div");
    adBox.className = "w-full flex items-center justify-center overflow-auto min-h-[90px] sm:min-h-[120px] transition-all duration-300";
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
        const src = oldScript.getAttribute("src");
        if (src) {
          // If the script is already globally loaded, do not append it again
          if (loadedExternalScripts.has(src)) {
            console.debug(`[AdRenderer] Script already loaded: ${src}`);
            return;
          }
          loadedExternalScripts.add(src);
        }

        const newScript = document.createElement("script");
        
        // Copy attributes (src, async, crossorigin, etc.)
        Array.from(oldScript.attributes).forEach((attr) => {
          newScript.setAttribute(attr.name, attr.value);
        });

        // Copy inner code if present
        if (oldScript.innerHTML) {
          newScript.innerHTML = oldScript.innerHTML;
        }

        // Set as async for speed
        if (src) {
          newScript.async = true;
        }

        // Append to execute the script in the context of the container
        adBox.appendChild(newScript);
      });

      // Special helper for Google AdSense to push automatically if adsbygoogle exists
      if (code.includes("adsbygoogle") && typeof window !== "undefined") {
        try {
          const pushScript = document.createElement("script");
          pushScript.innerHTML = "(window.adsbygoogle = window.adsbygoogle || []).push({});";
          adBox.appendChild(pushScript);
        } catch (e) {
          console.debug("AdSense autostart handled by client code", e);
        }
      }

    } catch (err) {
      console.error("AdRenderer script injection failed:", err);
      adBox.innerHTML = code;
    }
  }, [isVisible, code, className]);

  return (
    <div 
      ref={containerRef} 
      className="w-full mx-auto min-h-[140px] flex items-center justify-center transition-all duration-300"
      id="optimized-ad-container-wrapper"
    >
      {!isVisible && (
        <div className="w-full flex flex-col items-center justify-center my-4 py-3 px-2 bg-slate-50/30 border border-dashed border-slate-100 rounded-2xl animate-pulse">
          <span className="text-[8px] text-gray-300 uppercase tracking-widest font-sans font-bold block mb-2">Advertisement</span>
          <div className="h-20 w-full bg-slate-100/50 rounded-xl" />
        </div>
      )}
    </div>
  );
}
