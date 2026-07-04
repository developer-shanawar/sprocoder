import React, { useState, useEffect, useRef } from "react";
import { 
  Heart, Bookmark, MessageSquare, Sparkles, Calendar, Clock, 
  User, ChevronRight, Plus, Check, BookOpen, Send, X, Zap, 
  Flame, Globe, Star, RefreshCw, Search, ShieldCheck, Eye
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db, DB_PATHS } from "./firebase";
import { ref, set, onValue, get, update, push } from "firebase/database";
import { BlogPost, Comment, UserAccount, AdminPages } from "./types";
import { INITIAL_POSTS } from "./data";

// Modular Component Imports
import Header from "./components/Header";
import Footer from "./components/Footer";
import AdminPanel from "./components/AdminPanel";
import HeroSection from "./components/HeroSection";
import ContactForm from "./components/ContactForm";
import YouTubeShowcase from "./components/YouTubeShowcase";
import ArticleDetailView from "./components/ArticleDetailView";
import AdminAuth from "./components/AdminAuth";
import UserProfile from "./components/UserProfile";

export default function App() {
  // Navigation tabs: home, articles, about, privacy, terms, contact, admin-auth, admin, profile
  const [currentTab, setCurrentTab] = useState<"home" | "articles" | "about" | "privacy" | "terms" | "contact" | "admin-auth" | "admin" | "profile">("home");

  // User auth state
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const cached = localStorage.getItem("spro_user");
    return cached ? JSON.parse(cached) : null;
  });

  // Admin auth state
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem("spro_admin_auth") === "true";
  });

  // Dynamic Website logo icon URL
  const [websiteIconUrl, setWebsiteIconUrl] = useState<string>("");
  const [showWebsiteIcon, setShowWebsiteIcon] = useState<boolean>(true);
  const [featuredArticleId, setFeaturedArticleId] = useState<string>("");

  // Website SEO metadata
  const [websiteTitle, setWebsiteTitle] = useState<string>("S pro coder");
  const [websiteDescription, setWebsiteDescription] = useState<string>("bespoke digital platform supplying high-end tech tutorials and AI articles.");

  // Database Synced states
  const [allPosts, setAllPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  
  // Page contents
  const [aboutContent, setAboutContent] = useState("");
  const [privacyPolicy, setPrivacyPolicy] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState("");

  // Search and Category filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Active reading article
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

  // Ambient lighting parameters (Frosted Glass aesthetics)
  const glowHex = "#a855f7"; // Soft Lavendar Purple Light

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

  // Sync state from browser URL path or hash
  const syncRouteFromUrl = (postsList: BlogPost[]) => {
    // Check hash first (e.g., "#/blog/some-slug"), removing the leading "#"
    let path = window.location.hash ? window.location.hash.substring(1) : window.location.pathname;
    
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
      const slug = path.split("/").pop() || "";
      const matched = postsList.find(
        (p) => slugify(p.title) === slug || p.id === slug
      );
      if (matched) {
        setSelectedPost(matched);
        setCurrentTab("articles");
      } else {
        setCurrentTab("articles");
        setSelectedPost(null);
      }
    }
  };

  // Flag to ensure we only run the initial route parse once
  const hasParsedInitialRoute = useRef<boolean>(false);
  const hasParsedInitialPostRoute = useRef<boolean>(false);

  // Sync static routes immediately on mount so pages like About, Contact, Privacy, Profile load instantly
  useEffect(() => {
    const hash = window.location.hash;
    const path = hash ? hash.substring(1) : window.location.pathname;
    const isPostRoute = path.startsWith("/blog/") || path.startsWith("/articles/");
    
    if (!isPostRoute) {
      syncRouteFromUrl([]);
      hasParsedInitialRoute.current = true;
    }
  }, []);

  // Sync URL to page state once when posts are loaded (especially for dynamic blog article routes)
  useEffect(() => {
    if (allPosts.length > 0) {
      const hash = window.location.hash;
      const path = hash ? hash.substring(1) : window.location.pathname;
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

  // Handle browser back/forward buttons and hash navigation changes
  useEffect(() => {
    const handlePopState = () => {
      syncRouteFromUrl(allPosts);
    };
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("hashchange", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("hashchange", handlePopState);
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

    const targetHash = targetPath === "/" ? "" : `#${targetPath}`;
    const currentHash = window.location.hash;
    
    if (currentHash !== targetHash && (targetHash || currentHash)) {
      window.history.pushState(null, "", targetHash || "/");
    }
  }, [currentTab, selectedPost]);

  // 1. Live Sync User Session profile if logged in
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
        setCategories(snapshot.val());
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
      } else {
        // Bootstrap static pages
        const defaultPages = {
          aboutContent: "S pro coder is a premium developer sanctuary focused on deep technological insights, interactive code examples, and artificial intelligence tutorials. We analyze next-generation libraries and models, supplying engineers with immediate implementation instructions.",
          privacyPolicy: "Your credentials and navigation tracking profiles are held securely inside real-time Firebase Authentication protocols. S pro coder does not sell, distribute, or expose user records to third-party scrapers.",
          termsAndConditions: "By using S pro coder guides, you accept full responsibility for your production pipelines. All custom files built using our templates carry open-source MIT copyrights."
        };
        set(pagesRef, defaultPages);
        setAboutContent(defaultPages.aboutContent);
        setPrivacyPolicy(defaultPages.privacyPolicy);
        setTermsAndConditions(defaultPages.termsAndConditions);
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

    return () => {
      unsubPosts();
      unsubCat();
      unsubPages();
      unsubIcon();
      unsubShowIcon();
      unsubFeatured();
      unsubTitle();
      unsubDesc();
    };
  }, []);

  // Dynamic Real-Time browser tab and metadata update for maximum SEO ranking
  useEffect(() => {
    document.title = websiteTitle || "S pro coder";
  }, [websiteTitle]);

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

  // Keep selectedPost updated with real-time comments / views / likes from allPosts
  useEffect(() => {
    if (selectedPost) {
      const latest = allPosts.find((p) => p.id === selectedPost.id);
      if (latest) {
        setSelectedPost(latest);
      }
    }
  }, [allPosts, selectedPost?.id]);

  // Filter posts based on query, selected category, and active view
  const filteredPosts = allPosts.filter((post) => {
    const matchesSearch = 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory ? post.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  // Find the featured post
  const featuredPost = allPosts.find((p) => p.id === featuredArticleId) || allPosts[0];

  // Filter out featured post from regular feed on homepage to avoid duplicate rendering,
  // unless we have an active search/category filter
  const homeFeedPosts = (selectedCategory || searchQuery)
    ? filteredPosts
    : filteredPosts.filter((p) => p.id !== (featuredPost?.id || ""));

  // Selected article reading and history log push
  const handleSelectPost = async (post: BlogPost) => {
    // Increment views in the database
    const currentViews = post.views || 0;
    const updatedPost = { ...post, views: currentViews + 1 };
    setSelectedPost(updatedPost);

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
      alert("Please login/register on the top right to save this article to your dashboard profile.");
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
      alert("Please login/register on the top right to like this article.");
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

  return (
    <div className="min-h-screen bg-slate-50 text-purple-950 font-sans flex flex-col relative overflow-x-hidden pb-12">
      
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
        
        {(selectedPost && (currentTab === "home" || currentTab === "articles")) ? (
          <ArticleDetailView 
            post={selectedPost}
            onClose={() => setSelectedPost(null)}
            isBookmarked={currentUser?.savedArticles?.includes(selectedPost.id) || false}
            onToggleBookmark={() => handleToggleBookmark(selectedPost)}
            isLiked={currentUser?.likedArticles?.includes(selectedPost.id) || false}
            onLike={() => handleLikeArticle(selectedPost)}
            onAddComment={(text) => handleAddComment(selectedPost, text)}
            onAddReply={(commentId, text) => handleAddReply(selectedPost, commentId, text)}
            currentUser={currentUser}
          />
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

            {/* Three Column Grid: Left Category Filters (up to 10) | Middle Feed | Right search & social widgets */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Categories List (max 10) */}
              <div className="lg:col-span-3 space-y-4" id="home-left-rail">
                <h3 className="font-sans font-bold text-purple-950 text-xs uppercase tracking-widest pl-2">
                  Browse Categories
                </h3>
                <div className="flex flex-row lg:flex-col flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory(null)}
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
                      onClick={() => setSelectedCategory(cat)}
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
                  {homeFeedPosts.map((post) => {
                    const isLiked = false;
                    const isBookmarked = currentUser?.savedArticles?.includes(post.id) || false;

                    return (
                      <div 
                        key={post.id}
                        onClick={() => handleSelectPost(post)}
                        className="group bg-white/40 backdrop-blur-lg border border-white/60 rounded-[28px] p-5 shadow-sm hover:shadow-md hover:border-purple-300 transition-all cursor-pointer space-y-3 relative overflow-hidden"
                      >
                        <div className="h-40 w-full rounded-2xl overflow-hidden relative">
                          <img 
                            src={post.thumbnailUrl} 
                            alt={post.title} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
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

                        <div className="flex items-center justify-between border-t border-purple-50 pt-3">
                          <span className="text-[10px] text-gray-500 font-bold">
                            By {post.author}
                          </span>
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
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-2xl bg-white/80 border border-purple-100 text-xs focus:outline-none focus:border-purple-500"
                      id="home-search-bar"
                    />
                    <Search className="absolute left-3 top-3 w-3.5 h-3.5 text-purple-400" />
                  </div>
                </div>

                {/* YouTube Video Section */}
                <YouTubeShowcase />
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
                  className="group bg-white/40 backdrop-blur-lg border border-white/60 rounded-[28px] overflow-hidden p-4 shadow-sm hover:shadow-md hover:border-purple-300 transition-all cursor-pointer flex flex-col justify-between h-96"
                >
                  <div className="space-y-3">
                    <div className="h-40 w-full rounded-2xl overflow-hidden relative shrink-0">
                      <img 
                        src={post.thumbnailUrl} 
                        alt={post.title} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
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
            <div className="bg-white/40 backdrop-blur-lg border border-white/60 rounded-[32px] p-6 sm:p-10 text-purple-950 space-y-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/15 rounded-full filter blur-2xl pointer-events-none" />

              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-purple-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-purple-200 animate-pulse">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h1 className="text-3xl font-black text-purple-950 tracking-tight">
                  About S pro coder
                </h1>
                <p className="text-xs text-purple-600 font-mono font-bold tracking-wider uppercase">
                  INNOVATION • CODE • SECURITY
                </p>
              </div>

              <div className="space-y-4 text-sm leading-relaxed text-gray-700 whitespace-pre-line text-justify font-sans border-t border-purple-100/50 pt-6">
                {aboutContent || "S pro coder is a bespoke digital platform supplying high-end tech tutorials and AI articles."}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3.1: PRIVACY POLICY (SEPARATE PAGE!) */}
        {currentTab === "privacy" && (
          <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300" id="privacy-view-container">
            <div className="bg-white/40 backdrop-blur-lg border border-white/60 rounded-[32px] p-6 sm:p-10 text-purple-950 space-y-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/15 rounded-full filter blur-2xl pointer-events-none" />

              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-200">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h1 className="text-3xl font-black text-purple-950 tracking-tight">
                  Privacy Policy Guidelines
                </h1>
                <p className="text-xs text-indigo-600 font-mono font-bold tracking-wider uppercase">
                  SECURE DATA • PRIVACY • INTEGRITY
                </p>
              </div>

              <div className="space-y-4 text-sm leading-relaxed text-gray-700 whitespace-pre-line text-justify font-sans border-t border-purple-100/50 pt-6">
                {privacyPolicy || "Your records are held securely inside real-time Firebase Authentication protocols. S pro coder does not sell, distribute, or expose user records."}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3.2: TERMS & CONDITIONS (SEPARATE PAGE!) */}
        {currentTab === "terms" && (
          <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300" id="terms-view-container">
            <div className="bg-white/40 backdrop-blur-lg border border-white/60 rounded-[32px] p-6 sm:p-10 text-purple-950 space-y-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/15 rounded-full filter blur-2xl pointer-events-none" />

              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-purple-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-purple-200">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h1 className="text-3xl font-black text-purple-950 tracking-tight">
                  Terms and Conditions of Use
                </h1>
                <p className="text-xs text-purple-600 font-mono font-bold tracking-wider uppercase">
                  USAGE AGREEMENT • COPYRIGHTS • LIABILITY
                </p>
              </div>

              <div className="space-y-4 text-sm leading-relaxed text-gray-700 whitespace-pre-line text-justify font-sans border-t border-purple-100/50 pt-6">
                {termsAndConditions || "All custom files built using our templates carry open-source MIT copyrights. By using our guides, you accept responsibility for your implementation."}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: CONTACT PAGE */}
        {currentTab === "contact" && (
          <div className="max-w-2xl mx-auto animate-in fade-in duration-300" id="contact-view-container">
            <ContactForm />
          </div>
        )}

        {/* VIEW 4.5: USER SOCIAL MEDIA PROFILE */}
        {currentTab === "profile" && (
          <div className="max-w-4xl mx-auto animate-in fade-in duration-300" id="profile-view-container">
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
          </div>
        )}

        {/* VIEW 5: ADMIN AUTHENTICATION */}
        {currentTab === "admin-auth" && (
          <AdminAuth 
            onSuccess={() => {
              setIsAdminAuthenticated(true);
              localStorage.setItem("spro_admin_auth", "true");
              setCurrentTab("admin");
            }}
            onCancel={() => setCurrentTab("home")}
          />
        )}

        {/* VIEW 6: ADMIN PANEL CONTROL DECK (Full Page!) */}
        {currentTab === "admin" && (
          isAdminAuthenticated ? (
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

    </div>
  );
}
