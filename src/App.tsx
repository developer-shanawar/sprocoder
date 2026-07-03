import React, { useState, useEffect } from "react";
import { 
  Heart, Bookmark, MessageSquare, Sparkles, Calendar, Clock, 
  User, ChevronRight, Plus, Check, BookOpen, Send, X, Zap, 
  Flame, Globe, Star, RefreshCw, Search, ShieldCheck 
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

export default function App() {
  // Navigation tabs: home, articles, about, contact, admin-auth, admin
  const [currentTab, setCurrentTab] = useState<"home" | "articles" | "about" | "contact" | "admin-auth" | "admin">("home");

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
        setAllPosts(list);
      } else {
        // Bootstrap Database with INITIAL_POSTS if completely empty
        const initialMap: Record<string, BlogPost> = {};
        INITIAL_POSTS.forEach((p) => {
          initialMap[p.id] = p;
        });
        set(postsRef, initialMap);
        setAllPosts(INITIAL_POSTS);
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

    return () => {
      unsubPosts();
      unsubCat();
      unsubPages();
      unsubIcon();
    };
  }, []);

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

  // Selected article reading and history log push
  const handleSelectPost = async (post: BlogPost) => {
    setSelectedPost(post);

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

  // Like article
  const handleLikeArticle = async (post: BlogPost) => {
    try {
      const currentLikes = post.likes || 0;
      await update(ref(db, `${DB_PATHS.ARTICLES}/${post.id}`), {
        likes: currentLikes + 1
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Comment insertion
  const handleAddComment = async (post: BlogPost, text: string) => {
    const authorName = currentUser ? currentUser.name : "Guest Coder";
    const authorAvatar = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(authorName)}`;

    const newComment: Comment = {
      id: "c_" + Date.now(),
      author: authorName,
      avatar: authorAvatar,
      content: text,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    };

    try {
      const existingComments = post.comments ? [...post.comments] : [];
      const updatedComments = [newComment, ...existingComments];

      await update(ref(db, `${DB_PATHS.ARTICLES}/${post.id}`), {
        comments: updatedComments
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-purple-50/20 text-purple-950 font-sans flex flex-col relative overflow-x-hidden pb-12">
      
      {/* GLOWING AMBIENT AURAS (FROSTED GLASS THEME REQUIREMENT: "lights, colors like light purple") */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none">
        <div 
          className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[130px] opacity-25 animate-pulse transition-all duration-[8000s]"
          style={{ backgroundColor: glowHex }}
        />
        <div 
          className="absolute bottom-[20%] right-[-15%] w-[550px] h-[550px] rounded-full blur-[120px] opacity-20 animate-pulse"
          style={{ backgroundColor: "#c084fc" }}
        />
      </div>

      {/* HEADER COMPONENT */}
      <Header 
        currentTab={currentTab}
        setCurrentTab={(t) => {
          setCurrentTab(t);
          setSelectedCategory(null);
        }}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        onOpenAdmin={() => setCurrentTab(isAdminAuthenticated ? "admin" : "admin-auth")}
        allPosts={allPosts}
        onSelectPost={(post) => handleSelectPost(post)}
        websiteIconUrl={websiteIconUrl}
      />

      {/* PRIMARY WORKSPACE MAIN ROUTER */}
      <main className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-28 flex-grow">
        
        {selectedPost ? (
          <ArticleDetailView 
            post={selectedPost}
            onClose={() => setSelectedPost(null)}
            isBookmarked={currentUser?.savedArticles?.includes(selectedPost.id) || false}
            onToggleBookmark={() => handleToggleBookmark(selectedPost)}
            isLiked={false}
            onLike={() => handleLikeArticle(selectedPost)}
            onAddComment={(text) => handleAddComment(selectedPost, text)}
          />
        ) : (
          <>
            {/* VIEW 1: HOME PAGE */}
            {currentTab === "home" && (
          <div className="space-y-10 animate-in fade-in duration-300" id="home-view-container">
            {/* Top Featured Hero article */}
            {allPosts.length > 0 && (
              <HeroSection 
                post={allPosts[0]}
                onSelect={() => handleSelectPost(allPosts[0])}
                isLiked={false}
                onLike={() => handleLikeArticle(allPosts[0])}
                isBookmarked={currentUser?.savedArticles?.includes(allPosts[0].id) || false}
                onBookmark={() => handleToggleBookmark(allPosts[0])}
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
                    🚀 All Tech Articles
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
                      💡 {cat}
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
                    {filteredPosts.length} LIVE
                  </span>
                </div>

                <div className="space-y-4">
                  {filteredPosts.map((post) => {
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
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredPosts.length === 0 && (
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

        {/* VIEW 3: ABOUT PAGE */}
        {currentTab === "about" && (
          <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300" id="about-view-container">
            <div className="bg-white/40 backdrop-blur-lg border border-white/60 rounded-[32px] p-6 sm:p-10 text-purple-950 space-y-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/15 rounded-full filter blur-2xl pointer-events-none" />

              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-purple-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-purple-200">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h1 className="text-3xl font-black text-purple-950 tracking-tight">
                  About S pro coder
                </h1>
                <p className="text-xs text-purple-600 font-mono font-bold tracking-wider uppercase">
                  INNOVATION • CODE • SECURITY
                </p>
              </div>

              <div className="space-y-4 text-sm leading-relaxed text-gray-700 whitespace-pre-line text-justify font-sans">
                {aboutContent || "S pro coder is a bespoke digital platform supplying high-end tech tutorials and AI articles."}
              </div>

              <div className="border-t border-purple-100 pt-6 space-y-4">
                <h3 className="font-extrabold text-xs text-purple-950 uppercase tracking-widest">
                  Legal Declarations & Guidelines
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                  <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-2">
                    <h4 className="font-extrabold text-purple-950 uppercase">
                      Privacy Policy
                    </h4>
                    <p className="text-gray-600 leading-relaxed text-justify">
                      {privacyPolicy || "Your records are held securely inside real-time Firebase Authentication protocols."}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-2">
                    <h4 className="font-extrabold text-purple-950 uppercase">
                      Terms & Conditions
                    </h4>
                    <p className="text-gray-600 leading-relaxed text-justify">
                      {termsAndConditions || "All custom files built using our templates carry open-source MIT copyrights."}
                    </p>
                  </div>
                </div>
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
        setCurrentTab={setCurrentTab}
        isAdminAuthenticated={isAdminAuthenticated}
      />

    </div>
  );
}
