import React, { useEffect, useRef, useState } from "react";
import { ref, get, update } from "firebase/database";
import { db } from "../firebase";

interface AdRendererProps {
  code: string;
  className?: string;
  placementId?: "headerBanner" | "belowFeatured" | "aboveFooter" | "rightSidebar" | "articleSidebar" | "articleBody";
}

// Global registry of loaded external script URLs to prevent duplicate network calls
const loadedExternalScripts = new Set<string>();

export default function AdRenderer({ code, className = "", placementId }: AdRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const trackedImpression = useRef(false);
  const trackedClick = useRef(false);

  // Auto-collapse if no code is configured for this slot to prevent empty whitespace boxes
  if (!code || !code.trim()) {
    return null;
  }

  useEffect(() => {
    if (!containerRef.current || !code) return;

    // Set up IntersectionObserver for lazy loading with generous 450px margin
    // This pre-fetches ad resources before they enter viewport, boosting fill rates dramatically
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "450px", threshold: 0.01 }
    );

    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
    };
  }, [code]);

  const handleAdClick = () => {
    if (!placementId || trackedClick.current) return;
    trackedClick.current = true;
    
    // Prevent double clicking in under 1.5 seconds, but allow normal clicks afterwards
    setTimeout(() => {
      trackedClick.current = false;
    }, 1500);

    try {
      const statsRef = ref(db, `settings/adsStats/${placementId}`);
      get(statsRef).then((snapshot) => {
        const val = snapshot.exists() ? snapshot.val() : { impressions: 0, clicks: 0 };
        const currentClicks = val.clicks || 0;
        update(statsRef, {
          clicks: currentClicks + 1
        });
      });
    } catch (err) {
      console.error("[AdRenderer] Failed to track click:", err);
    }
  };

  // Modern iframe blur click-tracking mechanism to detect when user taps on native iframe ads
  useEffect(() => {
    if (!placementId) return;

    const handleWindowBlur = () => {
      if (document.activeElement && document.activeElement.tagName === "IFRAME") {
        if (containerRef.current && containerRef.current.contains(document.activeElement)) {
          handleAdClick();
        }
      }
    };

    window.addEventListener("blur", handleWindowBlur);
    return () => {
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [placementId]);

  useEffect(() => {
    if (!isVisible || !containerRef.current || !code) return;

    // Increment ad impression metrics in Realtime Database
    if (placementId && !trackedImpression.current) {
      trackedImpression.current = true;
      try {
        const statsRef = ref(db, `settings/adsStats/${placementId}`);
        get(statsRef).then((snapshot) => {
          const val = snapshot.exists() ? snapshot.val() : { impressions: 0, clicks: 0 };
          const currentImps = val.impressions || 0;
          update(statsRef, {
            impressions: currentImps + 1
          });
        });
      } catch (err) {
        console.error("[AdRenderer] Failed to track impression:", err);
      }
    }

    // Clear previous content
    containerRef.current.innerHTML = "";

    // Create a beautifully styled wrapping container matching S Pro Coder aesthetics
    const wrapper = document.createElement("div");
    wrapper.className = `w-full flex flex-col items-center justify-center my-4 py-3 px-2 bg-purple-50/15 border border-purple-100/40 rounded-2xl max-w-full overflow-hidden text-center shadow-inner transition-all duration-300 ${className}`;

    // Elegant, compliant tiny sponsor label
    const sponsorTag = document.createElement("span");
    sponsorTag.className = "text-[8px] text-purple-400/80 uppercase tracking-widest font-sans font-extrabold block mb-2";
    sponsorTag.innerText = "Sponsor Advertisement";
    wrapper.appendChild(sponsorTag);

    // Ad element container with reserved height to minimize Content Layout Shift (CLS)
    const adBox = document.createElement("div");
    adBox.className = "w-full flex items-center justify-center overflow-auto min-h-[90px] sm:min-h-[120px] transition-all duration-300";
    wrapper.appendChild(adBox);

    containerRef.current.appendChild(wrapper);

    try {
      // 1. Separate HTML markup and executable script tags
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = code;

      // Extract all script tags to trigger execution correctly
      const scripts = Array.from(tempDiv.getElementsByTagName("script"));
      
      // Remove scripts from pure HTML div and inject pure markup
      scripts.forEach(s => s.parentNode?.removeChild(s));
      adBox.innerHTML = tempDiv.innerHTML;

      // 2. Process and inject extracted scripts sequentially
      scripts.forEach((oldScript) => {
        const src = oldScript.getAttribute("src");
        if (src) {
          // Keep AdSense and other popular CDNs loaded globally, but execute localized config blocks
          if (loadedExternalScripts.has(src) && !src.includes("adsbygoogle")) {
            console.debug(`[AdRenderer] External script preloaded: ${src}`);
            return;
          }
          loadedExternalScripts.add(src);
        }

        const newScript = document.createElement("script");
        newScript.onerror = (e) => {
          console.warn(`[AdRenderer] Failed to load external script: ${src || 'inline'}`, e);
        };
        
        // Copy original script attributes (src, async, crossorigin, etc.)
        Array.from(oldScript.attributes).forEach((attr) => {
          newScript.setAttribute(attr.name, attr.value);
        });

        // Copy inner code if present
        if (oldScript.innerHTML) {
          newScript.innerHTML = oldScript.innerHTML;
        }

        if (src) {
          newScript.async = true;
        }

        adBox.appendChild(newScript);
      });

      // Special layout-stabilizer helper for Google AdSense
      // Wrapping push in setTimeout ensures elements are painted by the browser and fully compiled
      if (code.includes("adsbygoogle") && typeof window !== "undefined") {
        setTimeout(() => {
          try {
            const pushScript = document.createElement("script");
            pushScript.innerHTML = "try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { console.debug('[AdSense] Push safely handled:', e); }";
            adBox.appendChild(pushScript);
          } catch (e) {
            console.debug("[AdRenderer] AdSense automatic push handled dynamically", e);
          }
        }, 120);
      }

    } catch (err) {
      console.error("[AdRenderer] Dynamic injection failed, fallback to native innerHTML:", err);
      adBox.innerHTML = code;
    }
  }, [isVisible, code, className, placementId]);

  return (
    <div 
      ref={containerRef} 
      onClick={handleAdClick}
      className="w-full mx-auto min-h-[140px] flex items-center justify-center transition-all duration-300"
      id={`ad-slot-wrapper-${placementId || "generic"}`}
    >
      {!isVisible && (
        <div className="w-full flex flex-col items-center justify-center my-4 py-3 px-2 bg-purple-50/10 border border-dashed border-purple-100/35 rounded-2xl animate-pulse">
          <span className="text-[8px] text-purple-300 uppercase tracking-widest font-sans font-bold block mb-2">Advertisement loading</span>
          <div className="h-20 w-full bg-purple-50/5 rounded-xl" />
        </div>
      )}
    </div>
  );
}
