import React, { useState, useEffect, useRef } from "react";
import { 
  Heart, Bookmark, MessageSquare, Sparkles, Calendar, Clock, 
  User, ChevronRight, Plus, Check, BookOpen, Send, X, Zap, 
  Flame, Globe, Star, RefreshCw, Search, ShieldCheck, Eye
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db, DB_PATHS, auth } from "./firebase";
import { ref, set, onValue, get, update, push } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { BlogPost, Comment, UserAccount, AdminPages } from "./types";
import { INITIAL_POSTS } from "./data";

// Modular Component Imports
import Header from "./components/Header";
import Footer from "./components/Footer";
import HeroSection from "./components/HeroSection";

// Lazy loaded components for split chunks and optimized load speed
const AdminPanel = React.lazy(() => import("./components/AdminPanel"));
const ContactForm = React.lazy(() => import("./components/ContactForm"));
const YouTubeShowcase = React.lazy(() => import("./components/YouTubeShowcase"));
const ArticleDetailView = React.lazy(() => import("./components/ArticleDetailView"));
const AdminAuth = React.lazy(() => import("./components/AdminAuth"));
const UserProfile = React.lazy(() => import("./components/UserProfile"));
import AdRenderer from "./components/AdRenderer";

const LoadingSpinner = () => (
  <div className="flex justify-center items-center py-16">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600"></div>
  </div>
);

const InstantLogo = ({ size = 96, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`filter drop-shadow-md ${className}`}>
    <defs>
      <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a855f7" />
        <stop offset="50%" stopColor="#6366f1" />
        <stop offset="100%" stopColor="#3b82f6" />
      </linearGradient>
    </defs>
    <rect x="6" y="6" width="88" height="88" rx="24" fill="#0b0f19" stroke="url(#shieldGrad)" strokeWidth="4.5" />
    <path d="M34 36 L22 50 L34 64" stroke="#a855f7" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M66 36 L78 50 L66 64" stroke="#3b82f6" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M56 30 L44 70" stroke="#f43f5e" strokeWidth="5.5" strokeLinecap="round" />
  </svg>
);

const SplashScreen = () => {
  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="fixed inset-0 w-screen h-[100dvh] bg-slate-50 z-[999999] flex flex-col justify-center items-center px-6 select-none overflow-hidden"
      style={{ height: "100dvh", width: "100vw", top: 0, left: 0 }}
    >
      <div className="flex flex-col items-center justify-center">
        {/* Center 3 Bouncing Dots Loading Screen */}
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 bg-purple-600 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
          <span className="w-3.5 h-3.5 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
          <span className="w-3.5 h-3.5 bg-indigo-600 rounded-full animate-bounce"></span>
        </div>
      </div>
    </motion.div>
  );
};

export default function App() {
  // Navigation tabs initialized from window.location.pathname dynamically
  const [currentTab, setCurrentTab] = useState<"home" | "articles" | "about" | "privacy" | "terms" | "contact" | "admin-auth" | "admin" | "profile" | "disclaimer">(() => {
    if (typeof window === "undefined") return "home";
    const path = window.location.pathname;
    if (path === "/blog" || path === "/articles") return "articles";
    if (path === "/about-us" || path === "/about") return "about";
    if (path === "/privacy-policy" || path === "/privacy") return "privacy";
    if (path === "/terms-and-conditions" || path === "/terms") return "terms";
    if (path === "/disclaimer") return "disclaimer";
    if (path === "/contact-us" || path === "/contact") return "contact";
    if (path === "/profile") return "profile";
    if (path === "/admin-auth") return "admin-auth";
    if (path === "/admin") return "admin";
    if (path.startsWith("/blog/") || path.startsWith("/articles/")) return "articles";
    return "home";
  });

  // User auth state
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const cached = localStorage.getItem("spro_user");
    if (!cached) return null;
    try {
      return JSON.parse(cached);
    } catch (e) {
      console.error("Failed to parse cached user:", e);
      localStorage.removeItem("spro_user");
      return null;
    }
  });

  // Admin auth state
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem("spro_admin_auth") === "true";
  });

  // Dynamic Website logo icon URL
  const [websiteIconUrl, setWebsiteIconUrl] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("spro_website_icon");
      if (cached) return cached;
    }
    return "https://storage.googleapis.com/antigravity-artifacts/a808a860-d4d9-4845-b2e8-5a76d694764d/input_file_0.png";
  });
  const [showWebsiteIcon, setShowWebsiteIcon] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("spro_show_website_icon");
      if (cached !== null) return cached === "true";
    }
    return true;
  });
  const [featuredArticleId, setFeaturedArticleId] = useState<string>("");

  // Splash Screen States - show only on home screen refresh
  const [isSplashActive, setIsSplashActive] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const path = window.location.pathname;
    const isPost = path.startsWith("/blog/") || path.startsWith("/articles/");
    if (isPost && (window as any).__INITIAL_POST__) {
      return false;
    }
    return path === "/" || path === "" || path === "/home";
  });
  const [isMinTimeElapsed, setIsMinTimeElapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      const isPost = path.startsWith("/blog/") || path.startsWith("/articles/");
      if (isPost && (window as any).__INITIAL_POST__) {
        return true;
      }
    }
    return false;
  });
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      const isPost = path.startsWith("/blog/") || path.startsWith("/articles/");
      if (isPost && (window as any).__INITIAL_POST__) {
        return false;
      }
    }
    return true;
  });
  const [isDataLoaded, setIsDataLoaded] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      const isPost = path.startsWith("/blog/") || path.startsWith("/articles/");
      if (isPost && (window as any).__INITIAL_POST__) {
        return true;
      }
    }
    return false;
  });

  // Website SEO metadata
  const [websiteTitle, setWebsiteTitle] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("spro_website_title");
      if (cached) return cached;
    }
    return "S pro coder";
  });
  const [websiteDescription, setWebsiteDescription] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("spro_website_description");
      if (cached) return cached;
    }
    return "S pro coder (sprocoder.online) is a premium tech tutorials and professional development portal, supplying high-end tech guides, coding deep dives and AI insights.";
  });

  // Database Synced states
  const [allPosts, setAllPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  
  // Page contents
  const [aboutContent, setAboutContent] = useState("");
  const [privacyPolicy, setPrivacyPolicy] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [disclaimerContent, setDisclaimerContent] = useState("");
  const [customHeadCode, setCustomHeadCode] = useState("");
  const [customBodyCode, setCustomBodyCode] = useState("");
  const [enableAdSense, setEnableAdSense] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("spro_enable_adsense");
      if (cached !== null) return cached === "true";
    }
    return false;
  });

  // Dynamic Ad Placement States
  const [adsConfig, setAdsConfig] = useState<any>({
    headerBanner: "",
    belowFeatured: "",
    aboveFooter: "",
    rightSidebar: "",
    articleSidebar: "",
    enableAds: false
  });
  const [showCookieConsent, setShowCookieConsent] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("spro_cookie_consent") !== "accepted";
    }
    return false;
  });

  // Search and Category filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [homePaginationIndex, setHomePaginationIndex] = useState(0);
  const [leftSidebarFilter, setLeftSidebarFilter] = useState<"popular" | "oldest">("popular");

  const handleSetSelectedCategory = (cat: string | null) => {
    setSelectedCategory(cat);
    setHomePaginationIndex(0);
  };

  const handleSetSearchQuery = (query: string) => {
    setSearchQuery(query);
    setHomePaginationIndex(0);
  };

  // Active reading article
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(() => {
    if (typeof window !== "undefined" && (window as any).__INITIAL_POST__) {
      return (window as any).__INITIAL_POST__;
    }
    return null;
  });

  // Path Routing State driven by state machine to solve navigation loading issues
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return typeof window !== "undefined" ? window.location.pathname : "/";
  });

  const isPostRoute = currentPath.startsWith("/blog/") || currentPath.startsWith("/articles/");
  const isPostRouteLoading = isPostRoute && !selectedPost && allPosts.length === 0;

  // Ambient lighting parameters (Frosted Glass aesthetics)
  const glowHex = "#a855f7"; // Soft Lavendar Purple Light

  // Keep track of which post IDs had views incremented in this session to prevent duplicate views count
  const incrementedPostIds = useRef<Set<string>>(new Set());

  const incrementArticleView = async (postId: string, currentViews: number) => {
    if (!postId || incrementedPostIds.current.has(postId)) return;
    incrementedPostIds.current.add(postId);

    // Immediately update local states to prevent stale values in UI
    setSelectedPost((prev) => {
      if (prev && prev.id === postId) {
        return { ...prev, views: (prev.views || 0) + 1 };
      }
      return prev;
    });

    setAllPosts((prev) => 
      prev.map((p) => p.id === postId ? { ...p, views: (p.views || 0) + 1 } : p)
    );

    try {
      await update(ref(db, `${DB_PATHS.ARTICLES}/${postId}`), {
        views: currentViews + 1
      });
    } catch (err) {
      console.error("Failed to increment views:", err);
    }
  };

  // Helper to slugify titles for SEO-friendly URLs
  const slugify = (text: string): string => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "")
      .replace(/\-\-+/g, "-")
      .replace(/^-+/, "")
      .replace(/-+$/, "");
  };

  // Sync state from browser URL path
  const syncRouteFromUrl = (postsList: BlogPost[]) => {
    const path = window.location.pathname;
    setCurrentPath(path);
    
    if (!path || path === "/" || path === "") {
      setCurrentTab("home");
      setSelectedPost(null);
    } else if (path === "/blog" || path === "/articles") {
      setCurrentTab("articles");
      setSelectedPost(null);
    } else if (path === "/about-us" || path === "/about") {
      setCurrentTab("about");
      setSelectedPost(null);
    } else if (path === "/privacy-policy" || path === "/privacy") {
      setCurrentTab("privacy");
      setSelectedPost(null);
    } else if (path === "/terms-and-conditions" || path === "/terms") {
      setCurrentTab("terms");
      setSelectedPost(null);
    } else if (path === "/disclaimer") {
      setCurrentTab("disclaimer");
      setSelectedPost(null);
    } else if (path === "/contact-us" || path === "/contact") {
      setCurrentTab("contact");
      setSelectedPost(null);
    } else if (path === "/profile") {
      setCurrentTab("profile");
      setSelectedPost(null);
    } else if (path === "/admin-auth") {
      setCurrentTab("admin-auth");
      setSelectedPost(null);
    } else if (path === "/admin") {
      setCurrentTab("admin");
      setSelectedPost(null);
    } else if (path.startsWith("/blog/") || path.startsWith("/articles/")) {
      const rawSlug = path.split("/").pop() || "";
      const slug = rawSlug.replace(/\.html$/, "");
      const matched = postsList.find(
        (p) => slugify(p.title) === slug || p.id === slug
      );
      if (matched) {
        if (matched.visibility === "private" && !isAdminAuthenticated) {
          setSelectedPost(null);
          setCurrentTab("articles");
        } else {
          setSelectedPost(matched);
          setCurrentTab("articles");
          incrementArticleView(matched.id, matched.views || 0);
        }
      } else {
        setCurrentTab("articles");
        setSelectedPost(null);
      }
    }
  };

  // Flag to ensure we only run the initial route parse once
  const hasParsedInitialRoute = useRef<boolean>(false);
  const hasParsedInitialPostRoute = useRef<boolean>(false);

  // Dynamically fetch specific content based on direct URL or refresh from Firebase Realtime Database
  useEffect(() => {
    const handleInitialRouteFetch = async () => {
      const path = window.location.pathname;
      const isPostRoute = path.startsWith("/blog/") || path.startsWith("/articles/");
      
      if (isPostRoute && (window as any).__INITIAL_POST__) {
        hasParsedInitialPostRoute.current = true;
        hasParsedInitialRoute.current = true;
        const matched = (window as any).__INITIAL_POST__;
        incrementArticleView(matched.id, matched.views || 0);
        return;
      }

      // Determine initial tab based on path
      if (!isPostRoute) {
        syncRouteFromUrl([]);
        hasParsedInitialRoute.current = true;
      }

      // 1. If path is About Us, fetch aboutContent dynamically
      if (path === "/about-us" || path === "/about") {
        try {
          const snapshot = await get(ref(db, `${DB_PATHS.PAGES}/aboutContent`));
          if (snapshot.exists()) {
            setAboutContent(snapshot.val());
          }
        } catch (e) {
          console.error("Error fetching about content dynamically:", e);
        }
      } 
      // 2. If path is Privacy Policy, fetch privacyPolicy dynamically
      else if (path === "/privacy-policy" || path === "/privacy") {
        try {
          const snapshot = await get(ref(db, `${DB_PATHS.PAGES}/privacyPolicy`));
          if (snapshot.exists()) {
            setPrivacyPolicy(snapshot.val());
          }
        } catch (e) {
          console.error("Error fetching privacy content dynamically:", e);
        }
      }
      // 3. If path is Terms, fetch termsAndConditions dynamically
      else if (path === "/terms-and-conditions" || path === "/terms") {
        try {
          const snapshot = await get(ref(db, `${DB_PATHS.PAGES}/termsAndConditions`));
          if (snapshot.exists()) {
            setTermsAndConditions(snapshot.val());
          }
        } catch (e) {
          console.error("Error fetching terms content dynamically:", e);
        }
      }
      // 4. If path is an Article/Blog post, dynamically fetch the specific article matching slug/ID
      else if (isPostRoute) {
        const rawSlug = path.split("/").pop() || "";
        const slug = rawSlug.replace(/\.html$/, "");
        try {
          // Attempt direct fetch of the specific ID first for optimal performance and pure ID targeting
          const directSnap = await get(ref(db, `${DB_PATHS.ARTICLES}/${slug}`));
          if (directSnap.exists()) {
            const matched = directSnap.val();
            if (matched && matched.id === slug) {
              setSelectedPost(matched);
              setCurrentTab("articles");
              hasParsedInitialPostRoute.current = true;
              hasParsedInitialRoute.current = true;
              incrementArticleView(matched.id, matched.views || 0);
              return;
            }
          }

          // Fallback to searching all articles list (by slugified title)
          const snapshot = await get(ref(db, DB_PATHS.ARTICLES));
          if (snapshot.exists()) {
            const data = snapshot.val();
            const list: BlogPost[] = Object.values(data);
            const matched = list.find(
              (p) => slugify(p.title) === slug || p.id === slug
            );
            if (matched) {
              setSelectedPost(matched);
              setCurrentTab("articles");
              hasParsedInitialPostRoute.current = true;
              hasParsedInitialRoute.current = true;
              incrementArticleView(matched.id, matched.views || 0);
            }
          }
        } catch (e) {
          console.error("Error fetching specific article content dynamically:", e);
        }
      }
    };

    handleInitialRouteFetch();
  }, []);

  // Sync URL to page state once when posts are loaded (especially for dynamic blog article routes)
  useEffect(() => {
    if (allPosts.length > 0) {
      const path = window.location.pathname;
      const isPostRoute = path.startsWith("/blog/") || path.startsWith("/articles/");
      
      if (isPostRoute && !hasParsedInitialPostRoute.current) {
        hasParsedInitialPostRoute.current = true;
        hasParsedInitialRoute.current = true;
        syncRouteFromUrl(allPosts);
      } else if (!hasParsedInitialRoute.current) {
        hasParsedInitialRoute.current = true;
        syncRouteFromUrl(allPosts);
      }
    }
  }, [allPosts]);

  // Handle browser back/forward buttons (pure HTML5 history)
  useEffect(() => {
    const handlePopState = () => {
      syncRouteFromUrl(allPosts);
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [allPosts]);

  // Synchronize internal state to external browser address bar URL (SEO Optimization & 404-free sharing!)
  useEffect(() => {
    let targetPath = "/";
    
    if (selectedPost) {
      targetPath = `/blog/${slugify(selectedPost.title)}`;
    } else {
      switch (currentTab) {
        case "home":
          targetPath = "/";
          break;
        case "articles":
          targetPath = "/blog";
          break;
        case "about":
          targetPath = "/about-us";
          break;
        case "privacy":
          targetPath = "/privacy-policy";
          break;
        case "terms":
          targetPath = "/terms-and-conditions";
          break;
        case "disclaimer":
          targetPath = "/disclaimer";
          break;
        case "contact":
          targetPath = "/contact-us";
          break;
        case "profile":
          targetPath = "/profile";
          break;
        case "admin-auth":
          targetPath = "/admin-auth";
          break;
        case "admin":
          targetPath = "/admin";
          break;
        default:
          targetPath = "/";
      }
    }

    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, "", targetPath);
    }
    setCurrentPath(targetPath);
  }, [currentTab, selectedPost]);

  // Real-time Visitor hit tracker for Web Analytics
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const trackVisitorHit = async () => {
      // Avoid tracking hits when navigating around administrative sections
      const path = window.location.pathname;
      if (path.startsWith("/admin")) return;
      
      // To avoid duplicate tracking during minor re-renders, use a session flag
      const trackedInSession = sessionStorage.getItem("spro_tracked_hit");
      if (trackedInSession === "true") return;
      sessionStorage.setItem("spro_tracked_hit", "true");
      
      try {
        // Detect Traffic Source channel
        const refUrl = document.referrer?.toLowerCase() || "";
        let sourceChannel: "direct" | "search" | "social" = "direct";
        
        if (refUrl.includes("google") || refUrl.includes("bing") || refUrl.includes("yahoo") || refUrl.includes("duckduckgo")) {
          sourceChannel = "search";
        } else if (refUrl.includes("t.me") || refUrl.includes("telegram") || refUrl.includes("youtube") || refUrl.includes("facebook") || refUrl.includes("instagram") || refUrl.includes("twitter") || refUrl.includes("x.com")) {
          sourceChannel = "social";
        }
        
        // Detect Locales Timezone name to map Country (beautifully fallback!)
        let detectedCountry = "United States";
        try {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          if (tz.includes("Karachi") || tz.includes("Pakistan")) detectedCountry = "Pakistan";
          else if (tz.includes("London") || tz.includes("Europe/London") || tz.includes("GB")) detectedCountry = "United Kingdom";
          else if (tz.includes("Berlin") || tz.includes("Europe/Berlin") || tz.includes("Germany")) detectedCountry = "Germany";
          else if (tz.includes("Toronto") || tz.includes("Vancouver") || tz.includes("Canada")) detectedCountry = "Canada";
          else if (tz.includes("Delhi") || tz.includes("Calcutta") || tz.includes("India")) detectedCountry = "India";
          else if (tz.includes("Sydney") || tz.includes("Australia")) detectedCountry = "Australia";
          else if (tz.includes("Paris") || tz.includes("Europe/Paris") || tz.includes("France")) detectedCountry = "France";
        } catch (e) {
          // ignore resolving errors
        }
        
        // Helper to format dates in local timezone to match user experience
        const getLocalDateString = (d: Date) => {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        const getLocalHourString = (d: Date) => {
          const datePart = getLocalDateString(d);
          const hourPart = String(d.getHours()).padStart(2, '0');
          return `${datePart}T${hourPart}`;
        };

        const now = new Date();
        const localDateStr = getLocalDateString(now);
        const localHourStr = getLocalHourString(now);

        // Increment visitor counter in Realtime Database transaction-style or single fetch and set
        const analyticsRef = ref(db, "analytics");
        const snap = await get(analyticsRef);
        
        let currentAnalytics: any = {
          sources: { direct: 310, search: 185, social: 145 },
          weeklyViews: [110, 134, 125, 148, 139, 167, 185],
          countries: { "United States": 142, "Pakistan": 89, "United Kingdom": 62, "Germany": 41, "Canada": 33 },
          dailyViews: {},
          hourlyViews: {}
        };
        
        if (snap.exists()) {
          const raw = snap.val();
          currentAnalytics = {
            sources: {
              direct: Number(raw.sources?.direct || 0),
              search: Number(raw.sources?.search || 0),
              social: Number(raw.sources?.social || 0)
            },
            weeklyViews: Array.isArray(raw.weeklyViews) ? raw.weeklyViews.map(Number) : [110, 134, 125, 148, 139, 167, 185],
            countries: raw.countries ? { ...raw.countries } : { "United States": 142, "Pakistan": 89, "United Kingdom": 62, "Germany": 41, "Canada": 33 },
            dailyViews: raw.dailyViews ? { ...raw.dailyViews } : {},
            hourlyViews: raw.hourlyViews ? { ...raw.hourlyViews } : {}
          };
        }
        
        // Increment selected source
        if (sourceChannel === "direct") currentAnalytics.sources.direct += 1;
        else if (sourceChannel === "search") currentAnalytics.sources.search += 1;
        else if (sourceChannel === "social") currentAnalytics.sources.social += 1;
        
        // Increment country
        if (!currentAnalytics.countries[detectedCountry]) {
          currentAnalytics.countries[detectedCountry] = 0;
        }
        currentAnalytics.countries[detectedCountry] += 1;
        
        // Increment the current day of the week in weeklyViews
        const currentDayIndex = (new Date().getDay() + 6) % 7; // Convert Sun-Sat [0-6] to Mon-Sun [0-6]
        if (currentAnalytics.weeklyViews && currentAnalytics.weeklyViews[currentDayIndex] !== undefined) {
          currentAnalytics.weeklyViews[currentDayIndex] += 1;
        }

        // Track daily views
        if (!currentAnalytics.dailyViews) {
          currentAnalytics.dailyViews = {};
        }
        currentAnalytics.dailyViews[localDateStr] = (currentAnalytics.dailyViews[localDateStr] || 0) + 1;

        // Track hourly views
        if (!currentAnalytics.hourlyViews) {
          currentAnalytics.hourlyViews = {};
        }
        currentAnalytics.hourlyViews[localHourStr] = (currentAnalytics.hourlyViews[localHourStr] || 0) + 1;

        // Prune old data to keep Firebase light (90 days of dailyViews, 48 hours of hourlyViews)
        try {
          const limitDate = new Date();
          limitDate.setDate(limitDate.getDate() - 90);
          const limitDateStr = getLocalDateString(limitDate);
          Object.keys(currentAnalytics.dailyViews).forEach((key) => {
            if (key < limitDateStr) {
              delete currentAnalytics.dailyViews[key];
            }
          });

          const limitHour = new Date();
          limitHour.setHours(limitHour.getHours() - 48);
          const limitHourStr = getLocalHourString(limitHour);
          Object.keys(currentAnalytics.hourlyViews).forEach((key) => {
            if (key < limitHourStr) {
              delete currentAnalytics.hourlyViews[key];
            }
          });
        } catch (e) {
          console.error("Pruning analytics error:", e);
        }
        
        // Write back to Firebase Realtime Database
        await set(analyticsRef, currentAnalytics);
      } catch (err) {
        console.error("Failed to sync web analytics:", err);
      }
    };
    
    // Track hit with a slight delay so it does not block main render thread
    const delayTimer = setTimeout(trackVisitorHit, 1500);
    return () => clearTimeout(delayTimer);
  }, []);

  // Dynamic SEO friendly Document Head / Meta Tags Update
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Dynamic Title
    const finalTitle = selectedPost 
      ? `${selectedPost.title} | ${websiteTitle}` 
      : `${websiteTitle} - Professional Developer Sanctuary`;
    document.title = finalTitle;

    // Dynamic Description
    const finalDesc = selectedPost 
      ? (selectedPost.tagline || selectedPost.excerpt || websiteDescription) 
      : websiteDescription;

    // Update Meta Description tag
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', finalDesc);

    // Update Open Graph (OG) social tags
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitle);
    }
    ogTitle.setAttribute('content', finalTitle);

    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (!ogDesc) {
      ogDesc = document.createElement('meta');
      ogDesc.setAttribute('property', 'og:description');
      document.head.appendChild(ogDesc);
    }
    ogDesc.setAttribute('content', finalDesc);

    if (selectedPost) {
      let ogImage = document.querySelector('meta[property="og:image"]');
      if (!ogImage) {
        ogImage = document.createElement('meta');
        ogImage.setAttribute('property', 'og:image');
        document.head.appendChild(ogImage);
      }
      ogImage.setAttribute('content', selectedPost.thumbnailUrl);
    }
  }, [selectedPost, websiteTitle, websiteDescription]);

  // 1. Monitor Firebase Auth state change for automatic browser session restoration (Auto-Login)
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userRef = ref(db, `${DB_PATHS.USERS}/${firebaseUser.uid}`);
          const snapshot = await get(userRef);
          if (snapshot.exists()) {
            const liveUser = snapshot.val();
            setCurrentUser(liveUser);
            localStorage.setItem("spro_user", JSON.stringify(liveUser));
          }
        } catch (err) {
          console.error("Auto-login recovery error:", err);
        }
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // 1.1. Live Sync User Session profile if logged in
  useEffect(() => {
    if (!currentUser) return;
    const userRef = ref(db, `${DB_PATHS.USERS}/${currentUser.id}`);
    const unsub = onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const liveUser = snapshot.val();
        // Keep in sync
        setCurrentUser(liveUser);
        localStorage.setItem("spro_user", JSON.stringify(liveUser));
      }
    });
    return () => unsub();
  }, [currentUser?.id]);

  // 1.1.5. Sync Admin Authentication with User Session Email (developershanawar@gmail.com)
  useEffect(() => {
    if (currentUser && currentUser.email.toLowerCase() === "developershanawar@gmail.com") {
      setIsAdminAuthenticated(true);
      localStorage.setItem("spro_admin_auth", "true");
    } else {
      setIsAdminAuthenticated(false);
      localStorage.removeItem("spro_admin_auth");
      if (currentTab === "admin" || currentTab === "admin-auth") {
        setCurrentTab("home");
      }
    }
  }, [currentUser, currentTab]);

  // Mark data as loaded when articles and categories exist (or if on an article page, as soon as the article is loaded)
  useEffect(() => {
    if (isPostRoute) {
      if (selectedPost) {
        setIsDataLoaded(true);
      }
    } else {
      if (allPosts.length > 0 && categories.length > 0) {
        setIsDataLoaded(true);
      }
    }
  }, [allPosts, categories, selectedPost, isPostRoute]);

  // 1.2. Splash Screen timer and automatic loading completion
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMinTimeElapsed(true);
    }, 800); // 0.8 seconds minimum display time for super snappy, polished loading
    
    // Failsafe timer: after 5 seconds, always dismiss splash screen so user never gets stuck
    const failsafe = setTimeout(() => {
      setIsSplashActive(false);
      setIsMinTimeElapsed(true);
      setIsInitialLoading(false);
      setIsDataLoaded(true);
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearTimeout(failsafe);
    };
  }, []);

  // Dismiss splash screen and loading states when BOTH minimum time is elapsed AND data has loaded
  useEffect(() => {
    if (isMinTimeElapsed && isDataLoaded) {
      setIsSplashActive(false);
      setIsInitialLoading(false);
    }
  }, [isMinTimeElapsed, isDataLoaded]);

  // 2. Realtime sync articles, categories, and static pages with Firebase database bootstrap
  useEffect(() => {
    // Sync Articles
    const postsRef = ref(db, DB_PATHS.ARTICLES);
    const unsubPosts = onValue(postsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list: BlogPost[] = Object.values(data);
        const sortedList = [...list].sort((a, b) => {
          const tA = a.date ? new Date(a.date).getTime() : 0;
          const tB = b.date ? new Date(b.date).getTime() : 0;
          return tB - tA; // Newest first
        });
        setAllPosts(sortedList);
      } else {
        // Bootstrap Database with INITIAL_POSTS if completely empty
        const initialMap: Record<string, BlogPost> = {};
        INITIAL_POSTS.forEach((p) => {
          initialMap[p.id] = p;
        });
        set(postsRef, initialMap);
        const sortedInitial = [...INITIAL_POSTS].sort((a, b) => {
          const tA = a.date ? new Date(a.date).getTime() : 0;
          const tB = b.date ? new Date(b.date).getTime() : 0;
          return tB - tA;
        });
        setAllPosts(sortedInitial);
      }
    });

    // Sync Categories (Limited to 10)
    const catRef = ref(db, DB_PATHS.CATEGORIES);
    const unsubCat = onValue(catRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        if (Array.isArray(val)) {
          setCategories(val.filter(Boolean));
        } else if (typeof val === "object" && val !== null) {
          // Firebase converted array to object with numeric/custom keys, e.g. { "0": "AI", "1": "Web" }
          const arr = Object.keys(val)
            .sort((a, b) => {
              const numA = Number(a);
              const numB = Number(b);
              if (isNaN(numA) || isNaN(numB)) return a.localeCompare(b);
              return numA - numB;
            })
            .map((k) => val[k])
            .filter(Boolean) as string[];
          setCategories(arr);
        } else if (typeof val === "string") {
          try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) {
              setCategories(parsed.filter(Boolean));
            } else {
              setCategories([val]);
            }
          } catch {
            setCategories([val]);
          }
        } else {
          setCategories([]);
        }
      } else {
        // Bootstrap categories
        const defaultCats = ["Artificial Intelligence", "Web Development", "AI Tools", "Cybersecurity", "Cloud Computing"];
        set(catRef, defaultCats);
        setCategories(defaultCats);
      }
    });

    // Sync static pages
    const pagesRef = ref(db, DB_PATHS.PAGES);
    const unsubPages = onValue(pagesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setAboutContent(data.aboutContent || "");
        setPrivacyPolicy(data.privacyPolicy || "");
        setTermsAndConditions(data.termsAndConditions || "");
        
        // Auto-seed disclaimer if missing from existing remote pages node
        if (data.disclaimerContent === undefined || data.disclaimerContent === "") {
          const defaultDisclaimer = "The information provided on S pro coder (AspCoder.online) is for general educational and informational purposes only. All tutorials, code walkthroughs, and guides are provided in good faith and as-is without warranties of any kind. Any action you take upon the information found on this website is strictly at your own risk.";
          setDisclaimerContent(defaultDisclaimer);
          update(pagesRef, { disclaimerContent: defaultDisclaimer }).catch(err => console.error("Error auto-syncing disclaimer:", err));
        } else {
          setDisclaimerContent(data.disclaimerContent);
        }
      } else {
        // Bootstrap static pages
        const defaultPages = {
          aboutContent: "S pro coder is a premium developer sanctuary focused on deep technological insights, interactive code examples, and artificial intelligence tutorials. We analyze next-generation libraries and models, supplying engineers with immediate implementation instructions.",
          privacyPolicy: "Your credentials and navigation tracking profiles are held securely inside real-time Firebase Authentication protocols. S pro coder does not sell, distribute, or expose user records to third-party scrapers.",
          termsAndConditions: "By using S pro coder guides, you accept full responsibility for your production pipelines. All custom files built using our templates carry open-source MIT copyrights.",
          disclaimerContent: "The information provided on S pro coder (AspCoder.online) is for general educational and informational purposes only. All tutorials, code walkthroughs, and guides are provided in good faith and as-is without warranties of any kind. Any action you take upon the information found on this website is strictly at your own risk."
        };
        set(pagesRef, defaultPages);
        setAboutContent(defaultPages.aboutContent);
        setPrivacyPolicy(defaultPages.privacyPolicy);
        setTermsAndConditions(defaultPages.termsAndConditions);
        setDisclaimerContent(defaultPages.disclaimerContent);
      }
    });

    // Sync Website Icon Logo
    const iconRef = ref(db, "settings/websiteIcon");
    const unsubIcon = onValue(iconRef, (snapshot) => {
      if (snapshot.exists()) {
        setWebsiteIconUrl(snapshot.val());
      }
    });

    // Sync Website Icon visibility toggle
    const showIconRef = ref(db, "settings/showWebsiteIcon");
    const unsubShowIcon = onValue(showIconRef, (snapshot) => {
      if (snapshot.exists()) {
        setShowWebsiteIcon(snapshot.val());
      }
    });

    // Sync Featured Article selection
    const featuredRef = ref(db, "settings/featuredArticleId");
    const unsubFeatured = onValue(featuredRef, (snapshot) => {
      if (snapshot.exists()) {
        setFeaturedArticleId(snapshot.val());
      }
    });

    // Sync Website SEO Title
    const titleRef = ref(db, "settings/websiteTitle");
    const unsubTitle = onValue(titleRef, (snapshot) => {
      if (snapshot.exists()) {
        setWebsiteTitle(snapshot.val());
      }
    });

    // Sync Website SEO Description
    const descRef = ref(db, "settings/websiteDescription");
    const unsubDesc = onValue(descRef, (snapshot) => {
      if (snapshot.exists()) {
        setWebsiteDescription(snapshot.val());
      }
    });

    // Sync Custom Code Injection
    const customCodeRef = ref(db, "settings/customCode");
    const unsubCustomCode = onValue(customCodeRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        setCustomHeadCode(val.headCode || "");
        setCustomBodyCode(val.bodyCode || "");
      }
    });

    // Sync AdSense Toggle Setup
    const enableAdSenseRef = ref(db, "settings/enableAdSense");
    const unsubEnableAdSense = onValue(enableAdSenseRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val() === true;
        setEnableAdSense(val);
        localStorage.setItem("spro_enable_adsense", String(val));
      }
    });

    // Sync Ad Placements Setup
    const adsRef = ref(db, "settings/ads");
    const unsubAds = onValue(adsRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        setAdsConfig({
          headerBanner: val.headerBanner || "",
          belowFeatured: val.belowFeatured || "",
          aboveFooter: val.aboveFooter || "",
          rightSidebar: val.rightSidebar || "",
          articleSidebar: val.articleSidebar || "",
          enableAds: val.enableAds === true
        });
      }
    });

    return () => {
      unsubPosts();
      unsubCat();
      unsubPages();
      unsubIcon();
      unsubShowIcon();
      unsubFeatured();
      unsubTitle();
      unsubDesc();
      unsubCustomCode();
      unsubEnableAdSense();
      unsubAds();
    };
  }, []);

  // Dynamic Real-Time browser tab and metadata update for maximum SEO ranking
  useEffect(() => {
    const baseTitle = websiteTitle || "S pro coder";
    if (selectedPost) {
      document.title = `${selectedPost.title} | ${baseTitle}`;
    } else {
      switch (currentTab) {
        case "about":
          document.title = `About Us | ${baseTitle}`;
          break;
        case "privacy":
          document.title = `Privacy Policy | ${baseTitle}`;
          break;
        case "terms":
          document.title = `Terms & Conditions | ${baseTitle}`;
          break;
        case "contact":
          document.title = `Contact Us | ${baseTitle}`;
          break;
        case "articles":
          document.title = `Blog Articles | ${baseTitle}`;
          break;
        case "profile":
          document.title = `User Profile | ${baseTitle}`;
          break;
        case "admin":
          document.title = `Admin Dashboard | ${baseTitle}`;
          break;
        case "admin-auth":
          document.title = `Admin Auth | ${baseTitle}`;
          break;
        case "home":
        default:
          document.title = baseTitle;
          break;
      }
    }
  }, [websiteTitle, currentTab, selectedPost]);

  useEffect(() => {
    if (websiteIconUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = websiteIconUrl;
    }
  }, [websiteIconUrl]);

  useEffect(() => {
    let meta = document.querySelector("meta[name='description']");
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.getElementsByTagName('head')[0].appendChild(meta);
    }
    meta.setAttribute('content', websiteDescription || "bespoke digital platform supplying high-end tech tutorials and AI articles.");
  }, [websiteDescription]);

  // Dynamically inject custom head and body codes for ownership verification and ad networks
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    // 1. Manage Head Injection
    // Clean up any previously injected head elements
    const existingHeadTags = document.querySelectorAll("[data-injected-head]");
    existingHeadTags.forEach((tag) => tag.remove());

    if (customHeadCode.trim()) {
      // Create a temporary container to parse HTML string
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = customHeadCode;
      
      // Append each element from container to document head, marking with a data attribute for easy tracking and cleanups
      Array.from(tempDiv.childNodes).forEach((node) => {
        if (node instanceof HTMLElement) {
          // If it's a script tag, we need to create a real script element so the browser executes it
          if (node.tagName === "SCRIPT") {
            const scriptEl = document.createElement("script");
            Array.from(node.attributes).forEach((attr) => {
              scriptEl.setAttribute(attr.name, attr.value);
            });
            scriptEl.textContent = node.textContent;
            scriptEl.setAttribute("data-injected-head", "true");
            document.head.appendChild(scriptEl);
          } else {
            const clone = node.cloneNode(true) as HTMLElement;
            clone.setAttribute("data-injected-head", "true");
            document.head.appendChild(clone);
          }
        }
      });
    }

    // 2. Manage Body Injection
    const existingBodyTags = document.querySelectorAll("[data-injected-body]");
    existingBodyTags.forEach((tag) => tag.remove());

    if (customBodyCode.trim()) {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = customBodyCode;

      Array.from(tempDiv.childNodes).forEach((node) => {
        if (node instanceof HTMLElement) {
          if (node.tagName === "SCRIPT") {
            const scriptEl = document.createElement("script");
            Array.from(node.attributes).forEach((attr) => {
              scriptEl.setAttribute(attr.name, attr.value);
            });
            scriptEl.textContent = node.textContent;
            scriptEl.setAttribute("data-injected-body", "true");
            document.body.appendChild(scriptEl);
          } else {
            const clone = node.cloneNode(true) as HTMLElement;
            clone.setAttribute("data-injected-body", "true");
            document.body.insertBefore(clone, document.body.firstChild);
          }
        }
      });
    }
  }, [customHeadCode, customBodyCode]);

  // Keep selectedPost updated with real-time comments / views / likes from allPosts
  useEffect(() => {
    if (selectedPost) {
      const latest = allPosts.find((p) => p.id === selectedPost.id);
      if (latest) {
        if (latest.visibility === "private" && !isAdminAuthenticated) {
          setSelectedPost(null);
        } else {
          setSelectedPost(latest);
        }
      }
    }
  }, [allPosts, selectedPost?.id, isAdminAuthenticated]);

  // Filter out posts that are scheduled to be published in the future or marked private
  const visiblePosts = React.useMemo(() => {
    return allPosts.filter((post) => {
      if (post.visibility === "private") {
        return false;
      }
      if (post.publishStatus === "scheduled" && post.scheduledDate) {
        const scheduledTime = new Date(post.scheduledDate).getTime();
        if (Date.now() < scheduledTime) return false;
      }
      return true;
    });
  }, [allPosts]);

  // Filter posts based on query, selected category, and active view
  const filteredPosts = React.useMemo(() => {
    return visiblePosts.filter((post) => {
      const matchesSearch = 
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory ? post.category === selectedCategory : true;
      return matchesSearch && matchesCategory;
    });
  }, [visiblePosts, searchQuery, selectedCategory]);

  // Find the featured post
  const featuredPost = React.useMemo(() => {
    return visiblePosts.find((p) => p.id === featuredArticleId) || visiblePosts[0];
  }, [visiblePosts, featuredArticleId]);

  // Filter out featured post from regular feed on homepage to avoid duplicate rendering,
  // unless we have an active search/category filter
  const homeFeedPosts = React.useMemo(() => {
    return (selectedCategory || searchQuery)
      ? filteredPosts
      : filteredPosts.filter((p) => p.id !== (featuredPost?.id || ""));
  }, [selectedCategory, searchQuery, filteredPosts, featuredPost]);

  const totalHomeFeedPosts = homeFeedPosts.length;
  const paginatedHomeFeedPosts = React.useMemo(() => {
    return homeFeedPosts.slice(homePaginationIndex, homePaginationIndex + 5);
  }, [homeFeedPosts, homePaginationIndex]);

  // Left sidebar Spotlights calculation (Popular vs Oldest)
  const leftSidebarArticles = React.useMemo(() => {
    const list = [...visiblePosts];
    if (leftSidebarFilter === "popular") {
      // Sort by views + likes + savesCount descending (zadi views and eng)
      return list
        .sort((a, b) => {
          const engA = (a.views || 0) + (a.likes || 0) + (a.savesCount || 0);
          const engB = (b.views || 0) + (b.likes || 0) + (b.savesCount || 0);
          return engB - engA;
        })
        .slice(0, 5);
    } else {
      // Sort oldest uploaded articles first (lexicographical push IDs are chronological)
      return list
        .sort((a, b) => a.id.localeCompare(b.id))
        .slice(0, 5);
    }
  }, [visiblePosts, leftSidebarFilter]);

  // Selected article reading and history log push
  const handleSelectPost = async (post: BlogPost) => {
    // Increment views in the database
    const currentViews = post.views || 0;
    const updatedPost = { ...post, views: currentViews + 1 };
    
    // Track that we incremented this post ID to avoid double-triggers on subsequent loads in the same session
    incrementedPostIds.current.add(post.id);

    setSelectedPost(updatedPost);
    setAllPosts((prev) => 
      prev.map((p) => p.id === post.id ? { ...p, views: currentViews + 1 } : p)
    );

    try {
      await update(ref(db, `${DB_PATHS.ARTICLES}/${post.id}`), {
        views: currentViews + 1
      });
    } catch (err) {
      console.error("Failed to increment views:", err);
    }

    // If a user is registered and logged in, push to their reading history
    if (currentUser) {
      try {
        const userHistoryRef = ref(db, `${DB_PATHS.USERS}/${currentUser.id}/history`);
        // Get existing history to prevent excessive duplicates
        const snapshot = await get(userHistoryRef);
        const existing: any[] = snapshot.exists() ? Object.values(snapshot.val()) : [];
        
        // Push new history log with timestamp
        const now = new Date();
        const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

        const historyRecord = {
          articleId: post.id,
          title: post.title,
          date: dateStr,
          time: timeStr
        };

        // Prepend or add
        const newRecordRef = push(userHistoryRef);
        await set(newRecordRef, historyRecord);
      } catch (err) {
        console.error("Failed to log history log:", err);
      }
    }
  };

  // Toggle bookmark / saved status
  const handleToggleBookmark = async (post: BlogPost) => {
    if (!currentUser) {
      alert("Please log in first to save this article.");
      return;
    }

    const savedList = currentUser.savedArticles ? [...currentUser.savedArticles] : [];
    const isBookmarked = savedList.includes(post.id);

    let updatedList: string[];
    let delta = 0;

    if (isBookmarked) {
      updatedList = savedList.filter((id) => id !== post.id);
      delta = -1;
    } else {
      updatedList = [...savedList, post.id];
      delta = 1;
    }

    try {
      // 1. Update user profile
      await update(ref(db, `${DB_PATHS.USERS}/${currentUser.id}`), {
        savedArticles: updatedList
      });

      // 2. Update article's savesCount count
      const currentSaves = post.savesCount || 0;
      await update(ref(db, `${DB_PATHS.ARTICLES}/${post.id}`), {
        savesCount: Math.max(0, currentSaves + delta)
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Like article toggle (User can like and unlike an article once)
  const handleLikeArticle = async (post: BlogPost) => {
    if (!currentUser) {
      alert("Please log in first to like this article.");
      return;
    }

    const likedList = currentUser.likedArticles ? [...currentUser.likedArticles] : [];
    const isLiked = likedList.includes(post.id);

    let updatedList: string[];
    let delta = 0;

    if (isLiked) {
      // Unlike
      updatedList = likedList.filter((id) => id !== post.id);
      delta = -1;
    } else {
      // Like
      updatedList = [...likedList, post.id];
      delta = 1;
    }

    try {
      // 1. Update user profile with liked list
      await update(ref(db, `${DB_PATHS.USERS}/${currentUser.id}`), {
        likedArticles: updatedList
      });

      // 2. Update article's likes count
      const currentLikes = post.likes || 0;
      const finalLikes = Math.max(0, currentLikes + delta);
      await update(ref(db, `${DB_PATHS.ARTICLES}/${post.id}`), {
        likes: finalLikes
      });

      // 3. Update active read selectedPost if reading
      if (selectedPost && selectedPost.id === post.id) {
        setSelectedPost({ ...selectedPost, likes: finalLikes });
      }
    } catch (err) {
      console.error("Failed to toggle like:", err);
    }
  };

  // Comment insertion with username support
  const handleAddComment = async (post: BlogPost, text: string) => {
    const authorName = currentUser ? currentUser.name : "Guest Coder";
    const authorAvatar = currentUser?.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(authorName)}`;
    const authorUsername = currentUser?.username || "";

    const newComment: Comment = {
      id: "c_" + Date.now(),
      author: authorName,
      avatar: authorAvatar,
      username: authorUsername,
      content: text,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      replies: []
    };

    try {
      const existingComments = post.comments ? [...post.comments] : [];
      const updatedComments = [...existingComments, newComment];

      await update(ref(db, `${DB_PATHS.ARTICLES}/${post.id}`), {
        comments: updatedComments
      });
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  };

  // Reply insertion under specific comment ID
  const handleAddReply = async (post: BlogPost, commentId: string, text: string) => {
    const authorName = currentUser ? currentUser.name : "Guest Coder";
    const authorAvatar = currentUser?.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(authorName)}`;
    const authorUsername = currentUser?.username || "";

    const newReply = {
      id: "r_" + Date.now(),
      author: authorName,
      avatar: authorAvatar,
      username: authorUsername,
      content: text,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    };

    try {
      const existingComments = post.comments ? [...post.comments] : [];
      const updatedComments = existingComments.map((comment) => {
        if (comment.id === commentId) {
          const replies = comment.replies ? [...comment.replies] : [];
          return {
            ...comment,
            replies: [...replies, newReply]
          };
        }
        return comment;
      });

      await update(ref(db, `${DB_PATHS.ARTICLES}/${post.id}`), {
        comments: updatedComments
      });
    } catch (err) {
      console.error("Failed to add reply:", err);
    }
  };

  // Reset selectedPost if navigating away from home or articles
  useEffect(() => {
    if (currentTab !== "home" && currentTab !== "articles") {
      setSelectedPost(null);
    }
  }, [currentTab]);

  // Floating toggle switch between User Website and Admin Panel - displayed only after logging in with developershanawar@gmail.com
  const renderToggleSwitch = () => {
    const isLoggedAdmin = currentUser && currentUser.email.toLowerCase() === "developershanawar@gmail.com";
    if (!isAdminAuthenticated || !isLoggedAdmin) return null;
    return (
      <div className="fixed bottom-6 right-6 z-[10000] flex items-center gap-3 bg-[#0d121f]/95 text-white py-2.5 px-4 rounded-2xl shadow-2xl border border-purple-500/30 backdrop-blur-md">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-[10px] font-bold tracking-wider font-mono uppercase text-purple-200">
          {currentTab === "admin" ? "Admin Panel" : "Live Site Preview"}
        </span>
        <button
          onClick={() => {
            if (currentTab === "admin") {
              setCurrentTab("home");
            } else {
              setCurrentTab("admin");
            }
          }}
          className="text-[10px] font-extrabold bg-purple-600 hover:bg-purple-500 text-white px-3.5 py-1.5 rounded-xl transition-all cursor-pointer shadow-md shadow-purple-950 flex items-center gap-1 active:scale-95"
        >
          {currentTab === "admin" ? "Switch to User View" : "Switch to Admin Panel"}
        </button>
      </div>
    );
  };

  // Full-page Admin Panel Mode - displayed and accessible only after logging in with developershanawar@gmail.com
  const isLoggedAdminUser = currentUser && currentUser.email.toLowerCase() === "developershanawar@gmail.com";
  if (isAdminAuthenticated && isLoggedAdminUser && currentTab === "admin") {
    return (
      <div className="min-h-screen bg-[#f3effe] text-purple-950 font-sans flex flex-col relative overflow-x-hidden p-4 sm:p-6 lg:p-8">
        {/* Floating Switch Control */}
        {renderToggleSwitch()}

        <main className="flex-grow w-full">
          <React.Suspense fallback={<LoadingSpinner />}>
            <AdminPanel 
              onClose={() => setCurrentTab("home")}
              categories={categories}
              setCategories={setCategories}
              onLogout={() => {
                setIsAdminAuthenticated(false);
                localStorage.removeItem("spro_admin_auth");
                setCurrentTab("home");
              }}
            />
          </React.Suspense>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-purple-950 font-sans flex flex-col relative overflow-x-hidden pb-12">
      {/* Floating Mode Switch for logged-in admin while viewing live site */}
      {renderToggleSwitch()}

      {/* SPLASH SCREEN */}
      <AnimatePresence>
        {isSplashActive && (
          <SplashScreen />
        )}
      </AnimatePresence>
      
      {/* HEADER COMPONENT */}
      <Header 
        currentTab={currentTab}
        setCurrentTab={(t) => {
          setCurrentTab(t);
          setSelectedCategory(null);
          setSelectedPost(null);
        }}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        onOpenAdmin={() => setCurrentTab(isAdminAuthenticated ? "admin" : "admin-auth")}
        allPosts={allPosts}
        onSelectPost={(post) => handleSelectPost(post)}
        websiteIconUrl={websiteIconUrl}
        showWebsiteIcon={showWebsiteIcon}
        websiteTitle={websiteTitle}
      />

      {/* PRIMARY WORKSPACE MAIN ROUTER */}
      <main className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-28 flex-grow">
        
        {/* HEADER AD SLOT */}
        {adsConfig.enableAds && adsConfig.headerBanner && (
          <div id="header-banner-ad-slot" className="w-full max-w-[720px] mx-auto mb-8 animate-in fade-in">
            <AdRenderer code={adsConfig.headerBanner} />
          </div>
        )}
        
        {isPostRoute && !selectedPost ? (
          <div className="flex flex-col items-center justify-center min-h-[45vh] py-16 space-y-4" id="primary-data-loading-indicator">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-600 font-bold"></div>
            <p className="text-xs text-purple-600 font-mono font-bold uppercase tracking-widest animate-pulse">
              Loading Article...
            </p>
          </div>
        ) : (selectedPost && (currentTab === "home" || currentTab === "articles")) ? (
          <React.Suspense fallback={<LoadingSpinner />}>
            <ArticleDetailView 
              key={selectedPost.id}
              post={selectedPost}
              allPosts={allPosts}
              onSelectPost={handleSelectPost}
              onClose={() => setSelectedPost(null)}
              isBookmarked={currentUser?.savedArticles?.includes(selectedPost.id) || false}
              onToggleBookmark={() => handleToggleBookmark(selectedPost)}
              isLiked={currentUser?.likedArticles?.includes(selectedPost.id) || false}
              onLike={() => handleLikeArticle(selectedPost)}
              onAddComment={(text) => handleAddComment(selectedPost, text)}
              onAddReply={(commentId, text) => handleAddReply(selectedPost, commentId, text)}
              currentUser={currentUser}
              adsConfig={adsConfig}
            />
          </React.Suspense>
        ) : (
          <>
            {/* VIEW 1: HOME PAGE */}
            {currentTab === "home" && (
          <div className="space-y-10 animate-in fade-in duration-300" id="home-view-container">
            {/* Top Featured Hero article */}
            {featuredPost && (
              <HeroSection 
                post={featuredPost}
                onSelect={() => handleSelectPost(featuredPost)}
                isLiked={false}
                onLike={() => handleLikeArticle(featuredPost)}
                isBookmarked={currentUser?.savedArticles?.includes(featuredPost.id) || false}
                onBookmark={() => handleToggleBookmark(featuredPost)}
              />
            )}

            {/* BELOW FEATURED AD SLOT */}
            {adsConfig.enableAds && adsConfig.belowFeatured && (
              <div id="below-featured-ad-slot" className="w-full max-w-[720px] mx-auto my-6 animate-in fade-in">
                <AdRenderer code={adsConfig.belowFeatured} />
              </div>
            )}

            {/* Three Column Grid: Left Category Filters (up to 10) | Middle Feed | Right search & social widgets */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Categories List (max 10) */}
              <div className="lg:col-span-3 space-y-4" id="home-left-rail">
                <h3 className="font-sans font-bold text-purple-950 text-xs uppercase tracking-widest pl-2">
                  Browse Categories
                </h3>
                <div className="flex flex-row lg:flex-col flex-wrap gap-2">
                  <button
                    onClick={() => handleSetSelectedCategory(null)}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all text-left w-auto lg:w-full cursor-pointer border ${
                      selectedCategory === null 
                        ? "bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-100" 
                        : "bg-white/40 border-white/60 text-purple-950 hover:bg-white/80"
                    }`}
                  >
                    All Tech Articles
                  </button>

                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => handleSetSelectedCategory(cat)}
                      className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all text-left w-auto lg:w-full cursor-pointer border ${
                        selectedCategory === cat 
                          ? "bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-100" 
                          : "bg-white/40 border-white/60 text-purple-950 hover:bg-white/80"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Left Sidebar Spotlight Widget - Popular & Oldest */}
                <div className="pt-5 border-t border-purple-100/60 space-y-4" id="left-sidebar-widget">
                  <div className="flex items-center justify-between">
                    <h3 className="font-sans font-black text-purple-950 text-xs uppercase tracking-widest pl-2">
                      Spotlight
                    </h3>
                    <div className="flex items-center gap-1 bg-purple-50/80 p-0.5 rounded-xl border border-purple-100/50">
                      <button
                        onClick={() => setLeftSidebarFilter("popular")}
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border-0 ${
                          leftSidebarFilter === "popular"
                            ? "bg-purple-600 text-white shadow-sm"
                            : "text-purple-950 hover:bg-purple-100"
                        }`}
                        id="widget-btn-popular"
                      >
                        Popular
                      </button>
                      <button
                        onClick={() => setLeftSidebarFilter("oldest")}
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border-0 ${
                          leftSidebarFilter === "oldest"
                            ? "bg-purple-600 text-white shadow-sm"
                            : "text-purple-950 hover:bg-purple-100"
                        }`}
                        id="widget-btn-oldest"
                      >
                        Oldest
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                    {leftSidebarArticles.length > 0 ? (
                      leftSidebarArticles.map((art) => (
                        <div
                          key={art.id}
                          onClick={() => handleSelectPost(art)}
                          className="group bg-white border-2 border-black rounded-[24px] overflow-hidden p-3.5 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-3"
                          id={`spotlight-card-${art.id}`}
                        >
                          <div className="space-y-2.5">
                            {/* Thumbnail */}
                            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-purple-50 shrink-0">
                              <img
                                src={art.thumbnailUrl}
                                alt={art.title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                referrerPolicy="no-referrer"
                              />
                              <span className="absolute bottom-1.5 right-1.5 bg-black/80 px-1.5 py-0.5 rounded font-mono text-[8px] text-white font-extrabold uppercase tracking-wider">
                                {art.readTime || "Read"}
                              </span>
                            </div>

                            {/* Meta & Title */}
                            <div>
                              <span className="text-[9px] text-purple-600 font-mono font-black uppercase tracking-wider">
                                {art.category}
                              </span>
                              <h4 className="text-xs font-extrabold text-purple-950 leading-tight mt-1 group-hover:text-purple-700 transition-colors line-clamp-2">
                                {art.title}
                              </h4>
                            </div>
                          </div>

                          {/* Footer Info */}
                          <div className="flex items-center justify-between border-t border-purple-50/50 pt-2 text-[10px] text-gray-500 font-mono">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3.5 h-3.5 text-purple-600" />
                              <span className="font-bold">{art.views || 0} views</span>
                            </span>
                            <span className="text-[9px] bg-purple-50 text-purple-700 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider scale-90">
                              Top Content
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-gray-400 text-center py-4 font-medium col-span-full">
                        No articles live.
                      </p>
                    )}
                  </div>
                </div>


              </div>

               {/* Middle Column: Articles Feed */}
              <div className="lg:col-span-5 space-y-6" id="home-middle-feed">
                <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                  <h3 className="font-sans font-black text-purple-950 text-xs uppercase tracking-widest">
                    {selectedCategory || "Global Article Stream"}
                  </h3>
                  <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-black font-mono">
                    {homeFeedPosts.length} LIVE
                  </span>
                </div>

                <div className="space-y-4">
                  {paginatedHomeFeedPosts.map((post) => {
                    const isLiked = false;
                    const isBookmarked = currentUser?.savedArticles?.includes(post.id) || false;

                    return (
                      <div 
                        key={post.id}
                        onClick={() => handleSelectPost(post)}
                        className="group bg-white/45 border-2 border-black rounded-[28px] p-5 shadow-sm hover:shadow-md transition-all cursor-pointer space-y-3 relative overflow-hidden"
                      >
                        <div className="h-40 w-full rounded-2xl overflow-hidden relative">
                          <img 
                            src={post.thumbnailUrl} 
                            alt={post.title} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                          <span className="absolute top-3 left-3 text-[9px] bg-purple-950 text-white px-2.5 py-1 rounded-full font-bold uppercase tracking-widest">
                            {post.category}
                          </span>
                        </div>

                        <div>
                          <p className="text-[9px] font-mono font-bold text-purple-600 uppercase tracking-widest">
                            {post.date} • {post.readTime}
                          </p>
                          <h4 className="font-sans font-extrabold text-sm sm:text-base text-purple-950 group-hover:text-purple-700 transition-colors mt-1 leading-tight line-clamp-2">
                            {post.title}
                          </h4>
                          <p className="text-xs text-gray-600 line-clamp-2 mt-1 leading-relaxed">
                            {post.excerpt}
                          </p>
                        </div>

                        <div className="flex items-center justify-end border-t border-purple-50 pt-3">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-0.5 text-[10px] font-bold text-gray-500">
                              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/10" />
                              <span>{post.likes}</span>
                            </span>
                            <span className="flex items-center gap-0.5 text-[10px] font-bold text-gray-500">
                              <Bookmark className="w-3.5 h-3.5 text-purple-600 fill-purple-600/10" />
                              <span>{post.savesCount || 0}</span>
                            </span>
                            <span className="flex items-center gap-0.5 text-[10px] font-bold text-gray-500" title="Views">
                              <Eye className="w-3.5 h-3.5 text-purple-500" />
                              <span>{post.views || 0}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}



                  {homeFeedPosts.length === 0 && (
                    <div className="p-8 text-center bg-white/30 backdrop-blur-md rounded-2xl border border-white/50 text-gray-500 text-xs">
                      No matching S pro coder articles found in this stream.
                    </div>
                  )}

                  {/* Pagination Buttons (Next & Back 5 Articles) */}
                  {totalHomeFeedPosts > 5 && (
                    <div className="flex items-center justify-between pt-4 border-t border-purple-200/60 mt-6 bg-white/30 p-4 rounded-2xl">
                      <button
                        disabled={homePaginationIndex === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          setHomePaginationIndex(Math.max(0, homePaginationIndex - 5));
                          const feedEl = document.getElementById("home-middle-feed");
                          if (feedEl) feedEl.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                        className="px-3.5 py-2 text-xs font-bold bg-white hover:bg-purple-50 text-purple-950 border border-purple-200 rounded-xl disabled:opacity-40 disabled:hover:bg-white cursor-pointer transition-colors flex items-center gap-1 shadow-sm active:scale-95"
                      >
                        ← Back 5
                      </button>
                      <span className="text-[10px] text-purple-950 font-mono font-bold">
                        {homePaginationIndex + 1} - {Math.min(homePaginationIndex + 5, totalHomeFeedPosts)} of {totalHomeFeedPosts}
                      </span>
                      <button
                        disabled={homePaginationIndex + 5 >= totalHomeFeedPosts}
                        onClick={(e) => {
                          e.stopPropagation();
                          setHomePaginationIndex(homePaginationIndex + 5);
                          const feedEl = document.getElementById("home-middle-feed");
                          if (feedEl) feedEl.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                        className="px-3.5 py-2 text-xs font-bold bg-white hover:bg-purple-50 text-purple-950 border border-purple-200 rounded-xl disabled:opacity-40 disabled:hover:bg-white cursor-pointer transition-colors flex items-center gap-1 shadow-sm active:scale-95"
                      >
                        Next 5 →
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Search bar, Youtube widgets, profile updates */}
              <div className="lg:col-span-4 space-y-6" id="home-right-rail">
                {/* Real time Search Box */}
                <div className="p-4 rounded-3xl border border-white/40 bg-white/20 backdrop-blur-md shadow-sm space-y-3">
                  <h4 className="font-sans font-bold text-purple-950 text-xs uppercase tracking-widest">
                    Real-time Query Scanner
                  </h4>
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="Search articles & tools..."
                      value={searchQuery}
                      onChange={(e) => handleSetSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-2xl bg-white/80 border border-purple-100 text-xs focus:outline-none focus:border-purple-500"
                      id="home-search-bar"
                    />
                    <Search className="absolute left-3 top-3 w-3.5 h-3.5 text-purple-400" />
                  </div>
                </div>

                {/* YouTube Video Section */}
                <React.Suspense fallback={<LoadingSpinner />}>
                  <YouTubeShowcase />
                </React.Suspense>

                {/* RIGHT SIDEBAR AD SLOT */}
                {adsConfig.enableAds && adsConfig.rightSidebar && (
                  <div id="right-sidebar-ad-slot" className="w-full max-w-[320px] mx-auto animate-in fade-in">
                    <AdRenderer code={adsConfig.rightSidebar} />
                  </div>
                )}


              </div>

            </div>
          </div>
        )}

        {/* VIEW 2: ARTICLES PAGE (Desktop: 4 items per row, Mobile: 1 item per row) */}
        {currentTab === "articles" && (
          <div className="space-y-8 animate-in fade-in duration-300" id="articles-view-container">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-purple-100 pb-4">
              <div>
                <h2 className="text-2xl font-black text-purple-950 tracking-tight">
                  Comprehensive S pro articles
                </h2>
                <p className="text-xs text-gray-500">
                  Detailed developer logs, technical walk-throughs, and artificial intelligence tutorials.
                </p>
              </div>

              {/* Grid search box */}
              <div className="relative w-full sm:w-72">
                <input 
                  type="text"
                  placeholder="Filter grid..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-2xl bg-white/70 border border-purple-100 text-xs focus:outline-none"
                  id="grid-search-bar"
                />
                <Search className="absolute left-3 top-3 w-3.5 h-3.5 text-purple-400" />
              </div>
            </div>

            {/* Core 4-column Grid layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredPosts.map((post) => (
                <div 
                  key={post.id}
                  onClick={() => handleSelectPost(post)}
                  className="group bg-white/45 border-2 border-black rounded-[28px] overflow-hidden p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between h-96"
                >
                  <div className="space-y-3">
                    <div className="h-40 w-full rounded-2xl overflow-hidden relative shrink-0">
                      <img 
                        src={post.thumbnailUrl} 
                        alt={post.title} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      <span className="absolute top-2.5 left-2.5 text-[8px] bg-purple-950 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
                        {post.category}
                      </span>
                    </div>

                    <div className="text-left">
                      <p className="text-[8px] font-mono font-bold text-purple-500 uppercase">
                        {post.date}
                      </p>
                      <h4 className="font-sans font-extrabold text-sm text-purple-950 leading-tight mt-1 line-clamp-2 group-hover:text-purple-700 transition-colors">
                        {post.title}
                      </h4>
                      <p className="text-[11px] text-gray-600 line-clamp-2 mt-1 leading-normal">
                        {post.excerpt}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-purple-50 pt-2.5 flex items-center justify-between text-[10px] text-gray-500">
                    <span className="truncate max-w-[80px]">By {post.author}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="flex items-center gap-0.5">
                        <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/10" />
                        <span>{post.likes}</span>
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Bookmark className="w-3.5 h-3.5 text-purple-600 fill-purple-600/10" />
                        <span>{post.savesCount || 0}</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {filteredPosts.length === 0 && (
                <div className="col-span-full p-12 text-center text-gray-400 bg-white/20 border border-white/50 rounded-3xl text-sm">
                  No articles found in this grid search criteria.
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 3: ABOUT PAGE (SEPARATE PAGE!) */}
        {currentTab === "about" && (
          <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300" id="about-view-container">
            <div className="bg-white/45 border-2 border-black rounded-[32px] p-6 sm:p-10 text-purple-950 space-y-6 shadow-md relative overflow-hidden">
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-black text-purple-950 tracking-tight">
                  About S pro coder
                </h1>
                <p className="text-xs text-purple-600 font-mono font-bold tracking-wider uppercase">
                  INNOVATION • CODE • SECURITY
                </p>
              </div>

              <div className="space-y-4 text-sm leading-relaxed text-gray-700 whitespace-pre-line text-justify font-sans border-t border-black pt-6">
                {aboutContent || "S pro coder is a bespoke digital platform supplying high-end tech tutorials and AI articles."}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3.1: PRIVACY POLICY (SEPARATE PAGE!) */}
        {currentTab === "privacy" && (
          <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300" id="privacy-view-container">
            <div className="bg-white/45 border-2 border-black rounded-[32px] p-6 sm:p-10 text-purple-950 space-y-6 shadow-md relative overflow-hidden">
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-black text-purple-950 tracking-tight">
                  Privacy Policy Guidelines
                </h1>
                <p className="text-xs text-indigo-600 font-mono font-bold tracking-wider uppercase">
                  SECURE DATA • PRIVACY • INTEGRITY
                </p>
              </div>

              <div className="space-y-4 text-sm leading-relaxed text-gray-700 whitespace-pre-line text-justify font-sans border-t border-black pt-6">
                {privacyPolicy || "Your records are held securely inside real-time Firebase Authentication protocols. S pro coder does not sell, distribute, or expose user records."}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3.2: TERMS & CONDITIONS (SEPARATE PAGE!) */}
        {currentTab === "terms" && (
          <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300" id="terms-view-container">
            <div className="bg-white/45 border-2 border-black rounded-[32px] p-6 sm:p-10 text-purple-950 space-y-6 shadow-md relative overflow-hidden">
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-black text-purple-950 tracking-tight">
                  Terms and Conditions of Use
                </h1>
                <p className="text-xs text-purple-600 font-mono font-bold tracking-wider uppercase">
                  USAGE AGREEMENT • COPYRIGHTS • LIABILITY
                </p>
              </div>

              <div className="space-y-4 text-sm leading-relaxed text-gray-700 whitespace-pre-line text-justify font-sans border-t border-black pt-6">
                {termsAndConditions || "All custom files built using our templates carry open-source MIT copyrights. By using our guides, you accept responsibility for your implementation."}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3.3: LEGAL DISCLAIMER (SEPARATE PAGE!) */}
        {currentTab === "disclaimer" && (
          <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300" id="disclaimer-view-container">
            <div className="bg-white/45 border-2 border-black rounded-[32px] p-6 sm:p-10 text-purple-950 space-y-6 shadow-md relative overflow-hidden">
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-black text-purple-950 tracking-tight">
                  Legal Disclaimer
                </h1>
                <p className="text-xs text-rose-600 font-mono font-bold tracking-wider uppercase">
                  WARRANTY • LIABILITY LIMITATIONS • FAIR USE
                </p>
              </div>

              <div className="space-y-4 text-sm leading-relaxed text-gray-700 whitespace-pre-line text-justify font-sans border-t border-black pt-6">
                {disclaimerContent || "The information provided on S pro coder (AspCoder.online) is for general educational and informational purposes only. All tutorials, code snippets, and software recommendations are provided as-is with no representations or warranties of any kind."}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: CONTACT PAGE */}
        {currentTab === "contact" && (
          <div className="max-w-2xl mx-auto animate-in fade-in duration-300" id="contact-view-container">
            <React.Suspense fallback={<LoadingSpinner />}>
              <ContactForm />
            </React.Suspense>
          </div>
        )}

        {/* VIEW 4.5: USER SOCIAL MEDIA PROFILE */}
        {currentTab === "profile" && (
          <div className="max-w-4xl mx-auto animate-in fade-in duration-300" id="profile-view-container">
            <React.Suspense fallback={<LoadingSpinner />}>
              <UserProfile 
                currentUser={currentUser}
                setCurrentUser={setCurrentUser}
                allPosts={allPosts}
                onSelectPost={(post) => handleSelectPost(post)}
                onLogout={() => {
                  setCurrentUser(null);
                  localStorage.removeItem("spro_user");
                  setCurrentTab("home");
                }}
              />
            </React.Suspense>
          </div>
        )}

        {/* VIEW 5: ADMIN AUTHENTICATION */}
        {currentTab === "admin-auth" && (
          <React.Suspense fallback={<LoadingSpinner />}>
            <AdminAuth 
              onSuccess={() => {
                setIsAdminAuthenticated(true);
                localStorage.setItem("spro_admin_auth", "true");
                setCurrentTab("admin");
              }}
              onCancel={() => setCurrentTab("home")}
            />
          </React.Suspense>
        )}

        {/* VIEW 6: ADMIN PANEL CONTROL DECK (Full Page!) */}
        {currentTab === "admin" && (
          isAdminAuthenticated ? (
            <React.Suspense fallback={<LoadingSpinner />}>
              <AdminPanel 
                onClose={() => setCurrentTab("home")}
                categories={categories}
                setCategories={setCategories}
                onLogout={() => {
                  setIsAdminAuthenticated(false);
                  localStorage.removeItem("spro_admin_auth");
                  setCurrentTab("home");
                }}
              />
            </React.Suspense>
          ) : (
            <div className="p-8 text-center bg-white/35 backdrop-blur-md border border-purple-100 rounded-[28px] max-w-md mx-auto space-y-4">
              <p className="text-sm font-bold text-purple-950">Administrative Authorization Required.</p>
              <button 
                onClick={() => setCurrentTab("admin-auth")}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Authenticate Control Deck
              </button>
            </div>
          )
        )}

          </>
        )}

      </main>

      {/* ABOVE FOOTER AD SLOT */}
      {adsConfig.enableAds && adsConfig.aboveFooter && (
        <div id="above-footer-ad-slot" className="w-full max-w-[720px] mx-auto my-8 animate-in fade-in">
          <AdRenderer code={adsConfig.aboveFooter} />
        </div>
      )}

      {/* FOOTER COMPONENT */}
      <Footer 
        currentTab={currentTab}
        setCurrentTab={(t) => {
          setCurrentTab(t);
          setSelectedPost(null);
        }}
        isAdminAuthenticated={isAdminAuthenticated}
        websiteIconUrl={websiteIconUrl}
        showWebsiteIcon={showWebsiteIcon}
        websiteTitle={websiteTitle}
      />

      {/* COOKIE CONSENT / GDPR BANNER FOR GOOGLE ADSENSE COMPLIANCE */}
      {showCookieConsent && (
        <div 
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md bg-white border-2 border-black rounded-3xl p-5 shadow-2xl z-50 animate-in slide-in-from-bottom duration-500" 
          id="cookie-consent-banner"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-100 rounded-xl shrink-0 mt-0.5">
                <Globe className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h4 className="text-xs font-black text-purple-950 uppercase tracking-wider">
                  Cookie & Privacy Consent
                </h4>
                <p className="text-[11px] text-gray-600 leading-relaxed mt-1">
                  We use cookies and third-party advertising services (like Google AdSense) to deliver personalized content, analyze traffic, and support this free site. By clicking "Accept All", you consent to our use of cookies in accordance with our <span className="font-bold underline cursor-pointer text-purple-700 hover:text-purple-950" onClick={() => { setCurrentTab("privacy"); setSelectedPost(null); }}>Privacy Policy</span>.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button 
                onClick={() => {
                  localStorage.setItem("spro_cookie_consent", "accepted");
                  setShowCookieConsent(false);
                }}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-2 rounded-xl active:scale-95 transition-transform cursor-pointer shadow-md shadow-purple-100"
              >
                Accept All
              </button>
              <button 
                onClick={() => {
                  localStorage.setItem("spro_cookie_consent", "declined");
                  setShowCookieConsent(false);
                }}
                className="px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs py-2 rounded-xl transition-colors cursor-pointer"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
