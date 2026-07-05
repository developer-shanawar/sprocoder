import React, { useState, useEffect, useRef } from "react";
import { 
  Users, BookOpen, Layers, MessageSquare, Settings, 
  Plus, Edit, Trash2, Heart, Bookmark, Eye, FileText, Upload, Save, Check, RefreshCw,
  Youtube, Star, Bold, Italic, Underline, Link, Heading1, Heading2, List, Quote, Globe
} from "lucide-react";
import { db, DB_PATHS } from "../firebase";
import { ref, set, push, remove, get, update, onValue } from "firebase/database";
import { BlogPost, UserAccount, ContactMessage } from "../types";

// Utility to parse YouTube video IDs
function getYouTubeId(url: string): string {
  if (!url) return "";
  const trimmed = url.trim();
  
  // If it's already just an 11-char ID
  if (trimmed.length === 11 && !trimmed.includes("/") && !trimmed.includes("?")) {
    return trimmed;
  }
  
  try {
    // Standard and mobile URLs: youtube.com/watch?v=ID or youtu.be/ID
    if (trimmed.includes("youtube.com") || trimmed.includes("youtu.be")) {
      const regExp = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?vi?=|&vi?=))([^#&?]*).*/;
      const match = trimmed.match(regExp);
      if (match && match[1] && match[1].length === 11) {
        return match[1];
      }
    }
  } catch (e) {
    console.error("Error parsing YouTube ID:", e);
  }
  
  // Fallback split-based parsing
  const parts = trimmed.split(/v=|vi=|embed\/|shorts\/|youtu\.be\//);
  if (parts.length > 1) {
    const idPart = parts[1].split(/[?&]/)[0];
    if (idPart.length === 11) return idPart;
  }
  
  return trimmed;
}

interface AdminPanelProps {
  onClose: () => void;
  categories: string[];
  setCategories: React.Dispatch<React.SetStateAction<string[]>>;
  onLogout?: () => void;
}

export default function AdminPanel({ onClose, categories, setCategories, onLogout }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<"users" | "articles" | "categories" | "messages" | "pages" | "videos" | "featured">("articles");
  const [loading, setLoading] = useState(false);

  // Users State
  const [users, setUsers] = useState<UserAccount[]>([]);

  // Articles State
  const [articles, setArticles] = useState<BlogPost[]>([]);
  const [editingArticle, setEditingArticle] = useState<BlogPost | null>(null);
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [category, setCategory] = useState("");
  const [content, setContent] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [likes, setLikes] = useState(0);
  const [savesCount, setSavesCount] = useState(0);
  const [tagsInput, setTagsInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Categories State
  const [newCategoryName, setNewCategoryName] = useState("");

  // Contact Messages State
  const [messages, setMessages] = useState<ContactMessage[]>([]);

  // Pages State
  const [aboutContent, setAboutContent] = useState("");
  const [privacyPolicy, setPrivacyPolicy] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Website Icon State
  const [websiteIcon, setWebsiteIcon] = useState("");
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [iconUploadError, setIconUploadError] = useState("");

  // Videos State (Max 5)
  const [adminVideos, setAdminVideos] = useState<{
    id: string;
    title: string;
    link: string;
    channel: string;
    duration: string;
    views: string;
  }[]>([]);
  const [videoSaveSuccess, setVideoSaveSuccess] = useState(false);

  // Featured Article State
  const [featuredArticleId, setFeaturedArticleId] = useState("");
  const [featuredSaveSuccess, setFeaturedSaveSuccess] = useState(false);

  // Footer Links State
  const [footerLinks, setFooterLinks] = useState({
    youtube: "https://youtube.com",
    github: "https://github.com",
    linkedin: "https://linkedin.com",
    twitter: "https://twitter.com"
  });
  const [footerSaveSuccess, setFooterSaveSuccess] = useState(false);

  // Show Website Icon state
  const [showWebsiteIcon, setShowWebsiteIcon] = useState(true);

  // ImgBB API Key state
  const [imgbbKey, setImgbbKey] = useState("95bfa2c260a52e93433daf349259e043");
  const [imgbbKeySaveSuccess, setImgbbKeySaveSuccess] = useState(false);

  // Website Brand SEO Settings state
  const [websiteTitle, setWebsiteTitle] = useState("S pro coder");
  const [websiteDescription, setWebsiteDescription] = useState("bespoke digital platform supplying high-end tech tutorials and AI articles.");
  const [seoSaveSuccess, setSeoSaveSuccess] = useState(false);

  // Article rich text area ref
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [fetchingVideoIdx, setFetchingVideoIdx] = useState<number | null>(null);

  // Blogger formatting insertion helper
  const insertFormatting = (before: string, after: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);

    const replacement = before + selected + after;
    const newContent = text.substring(0, start) + replacement + text.substring(end);
    
    setContent(newContent);

    // Reposition cursor and maintain focus
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 0);
  };

  // Load Admin Data from RTDB
  useEffect(() => {
    // 1. Sync users
    const usersRef = ref(db, DB_PATHS.USERS);
    const unsubUsers = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const usersList: UserAccount[] = Object.values(data);
        setUsers(usersList);
      } else {
        setUsers([]);
      }
    });

    // 2. Sync articles
    const articlesRef = ref(db, DB_PATHS.ARTICLES);
    const unsubArticles = onValue(articlesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const articlesList: BlogPost[] = Object.values(data);
        setArticles(articlesList);
      } else {
        setArticles([]);
      }
    });

    // 3. Sync contact messages
    const messagesRef = ref(db, DB_PATHS.MESSAGES);
    const unsubMessages = onValue(messagesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const msgList: ContactMessage[] = Object.values(data);
        // Sort descending
        msgList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setMessages(msgList);
      } else {
        setMessages([]);
      }
    });

    // 4. Load page configurations (Once)
    const pagesRef = ref(db, DB_PATHS.PAGES);
    get(pagesRef).then((snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setAboutContent(data.aboutContent || "");
        setPrivacyPolicy(data.privacyPolicy || "");
        setTermsAndConditions(data.termsAndConditions || "");
      }
    });

    // 5. Load Website Icon (Once)
    const iconRef = ref(db, "settings/websiteIcon");
    get(iconRef).then((snapshot) => {
      if (snapshot.exists()) {
        setWebsiteIcon(snapshot.val());
      }
    });

    // 6. Load Youtube Videos (Once)
    const videosRef = ref(db, "youtubeVideos");
    get(videosRef).then((snapshot) => {
      const initial = Array.from({ length: 5 }, (_, i) => ({
        id: `vid-${i + 1}`,
        title: "",
        link: "",
        channel: "S pro coder Studio",
        duration: "10:00",
        views: "1K views"
      }));

      if (snapshot.exists()) {
        const data = snapshot.val();
        let loaded: any[] = [];
        if (Array.isArray(data)) {
          loaded = data.filter(Boolean);
        } else if (typeof data === "object") {
          loaded = Object.values(data);
        }
        
        // Merge or replace initial values
        const items = initial.map((item, index) => {
          if (loaded[index]) {
            return {
              id: loaded[index].id || `vid-${index + 1}`,
              title: loaded[index].title || "",
              link: loaded[index].link || "",
              channel: loaded[index].channel || "S pro coder Studio",
              duration: loaded[index].duration || "10:00",
              views: loaded[index].views || "1K views"
            };
          }
          return item;
        });
        setAdminVideos(items);
      } else {
        setAdminVideos(initial);
      }
    });

    // 7. Load Featured Article
    get(ref(db, "settings/featuredArticleId")).then((snapshot) => {
      if (snapshot.exists()) {
        setFeaturedArticleId(snapshot.val());
      }
    });

    // 8. Load Footer Links
    get(ref(db, "settings/footerLinks")).then((snapshot) => {
      if (snapshot.exists()) {
        setFooterLinks(snapshot.val());
      }
    });

    // 9. Load Show Website Icon
    get(ref(db, "settings/showWebsiteIcon")).then((snapshot) => {
      if (snapshot.exists()) {
        setShowWebsiteIcon(snapshot.val() !== false);
      }
    });

    // 10. Load ImgBB Key
    get(ref(db, "settings/imgbbKey")).then((snapshot) => {
      if (snapshot.exists()) {
        setImgbbKey(snapshot.val());
      }
    });

    // 11. Load Website SEO Title
    get(ref(db, "settings/websiteTitle")).then((snapshot) => {
      if (snapshot.exists()) {
        setWebsiteTitle(snapshot.val());
      }
    });

    // 12. Load Website SEO Description
    get(ref(db, "settings/websiteDescription")).then((snapshot) => {
      if (snapshot.exists()) {
        setWebsiteDescription(snapshot.val());
      }
    });

    return () => {
      unsubUsers();
      unsubArticles();
      unsubMessages();
    };
  }, []);

  // Handle ImgBB upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError("");
    
    const formData = new FormData();
    formData.append("image", file);

    try {
      const activeKey = imgbbKey || "95bfa2c260a52e93433daf349259e043";
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${activeKey}`, {
        method: "POST",
        body: formData,
      });

      const resJson = await response.json();
      if (resJson && resJson.success) {
        setThumbnailUrl(resJson.data.url);
      } else {
        const errMsg = resJson?.error?.message || "ImgBB upload failed or limit reached.";
        setUploadError(`ImgBB upload failed: ${errMsg}`);
      }
    } catch (err) {
      console.error(err);
      setUploadError("Failed to communicate with ImgBB API.");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Website Icon ImgBB upload
  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingIcon(true);
    setIconUploadError("");
    
    const formData = new FormData();
    formData.append("image", file);

    try {
      const activeKey = imgbbKey || "95bfa2c260a52e93433daf349259e043";
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${activeKey}`, {
        method: "POST",
        body: formData,
      });

      const resJson = await response.json();
      if (resJson && resJson.success) {
        const url = resJson.data.url;
        setWebsiteIcon(url);
        // Save to Firebase RTDB immediately
        await set(ref(db, "settings/websiteIcon"), url);
        alert("Website Logo icon updated and saved successfully!");
      } else {
        const errMsg = resJson?.error?.message || "ImgBB upload failed.";
        setIconUploadError(`ImgBB upload failed: ${errMsg}`);
      }
    } catch (err) {
      console.error(err);
      setIconUploadError("Failed to communicate with ImgBB API.");
    } finally {
      setIsUploadingIcon(false);
    }
  };

  // Create or Update Article
  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !category || !content.trim()) {
      alert("Title, Category, and Content are required.");
      return;
    }

    setLoading(true);
    try {
      const finalThumbnail = thumbnailUrl.trim() || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80";
      
      let articleId = editingArticle?.id;
      const isNew = !articleId;

      if (isNew) {
        const articlesRef = ref(db, DB_PATHS.ARTICLES);
        const newArtRef = push(articlesRef);
        articleId = newArtRef.key as string;
      }

      // Fetch the most up-to-date post from database to avoid overwriting live comments, views, etc.
      let existingPost: BlogPost | null = null;
      if (!isNew) {
        try {
          const snap = await get(ref(db, `${DB_PATHS.ARTICLES}/${articleId}`));
          if (snap.exists()) {
            existingPost = snap.val();
          }
        } catch (e) {
          console.error("Error reading post from DB for merge:", e);
        }
      }

      const parsedTags = tagsInput.trim()
        ? tagsInput.split(",").map((t) => t.trim().replace(/^#/, "").toLowerCase()).filter(Boolean)
        : [category.toLowerCase(), "tech", "coding"];

      const articlePayload: BlogPost = {
        id: articleId as string,
        title: title.trim(),
        tagline: tagline.trim() || "A technical deep dive from S pro coder",
        category,
        content: content.trim(),
        readTime: `${Math.max(1, Math.ceil(content.split(/\s+/).length / 200))} min read`,
        tags: parsedTags,
        excerpt: tagline.trim() || content.trim().slice(0, 150) + "...",
        author: existingPost ? (existingPost.author || "Admin - S pro coder") : "Admin - S pro coder",
        date: existingPost ? (existingPost.date || new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })) : new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
        likes: likes || 0,
        savesCount: savesCount || 0,
        views: existingPost ? (existingPost.views || 0) : 0,
        thumbnailUrl: finalThumbnail,
        isAiGenerated: existingPost ? (existingPost.isAiGenerated || false) : false,
        comments: existingPost ? (existingPost.comments || []) : []
      };

      await set(ref(db, `${DB_PATHS.ARTICLES}/${articleId}`), articlePayload);

      // If it is a new article, trigger notification in database
      if (isNew) {
        const newNotifRef = push(ref(db, DB_PATHS.NOTIFICATIONS));
        await set(newNotifRef, {
          id: newNotifRef.key,
          title: "New Article Published!",
          body: `"${title.trim()}" is now live in the ${category} category!`,
          date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
          isRead: false
        });
      }

      // Reset fields
      setEditingArticle(null);
      setTitle("");
      setTagline("");
      setCategory("");
      setContent("");
      setTagsInput("");
      setThumbnailUrl("");
      setLikes(0);
      setSavesCount(0);
      alert("Article saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Error saving article to Realtime Database.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (post: BlogPost) => {
    setEditingArticle(post);
    setTitle(post.title);
    setTagline(post.tagline);
    setCategory(post.category);
    setContent(post.content);
    setTagsInput(post.tags ? post.tags.join(", ") : "");
    setThumbnailUrl(post.thumbnailUrl);
    setLikes(post.likes);
    setSavesCount(post.savesCount || 0);
  };

  const handleDeleteArticle = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this article?")) return;
    try {
      await remove(ref(db, `${DB_PATHS.ARTICLES}/${id}`));
      alert("Article deleted.");
    } catch (err) {
      console.error(err);
    }
  };

  // Add Category (Limit to 10)
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCat = newCategoryName.trim();
    if (!cleanCat) return;

    if (categories.includes(cleanCat)) {
      alert("Category already exists.");
      return;
    }

    if (categories.length >= 10) {
      alert("Category list is limited to 10 entries max as per client requirements.");
      return;
    }

    const updated = [...categories, cleanCat];
    setCategories(updated);
    setNewCategoryName("");

    try {
      await set(ref(db, DB_PATHS.CATEGORIES), updated);
      alert("Category saved to database.");
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Category
  const handleDeleteCategory = async (cat: string) => {
    if (categories.length <= 1) {
      alert("You must keep at least one category.");
      return;
    }
    const updated = categories.filter((c) => c !== cat);
    setCategories(updated);
    try {
      await set(ref(db, DB_PATHS.CATEGORIES), updated);
    } catch (err) {
      console.error(err);
    }
  };

  // Delete contact message
  const handleDeleteMessage = async (id: string) => {
    if (!confirm("Delete this message?")) return;
    try {
      await remove(ref(db, `${DB_PATHS.MESSAGES}/${id}`));
    } catch (err) {
      console.error(err);
    }
  };

  // Save Pages configurations
  const handleSavePages = async () => {
    setLoading(true);
    setSaveSuccess(false);
    try {
      await update(ref(db, DB_PATHS.PAGES), {
        aboutContent,
        privacyPolicy,
        termsAndConditions
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert("Failed to update page contents.");
    } finally {
      setLoading(false);
    }
  };

  // Save YouTube Videos Showcase settings
  const handleSaveVideos = async () => {
    setLoading(true);
    setVideoSaveSuccess(false);
    try {
      const formatted = adminVideos.map((vid, idx) => {
        return {
          id: vid.id || `vid-${idx + 1}`,
          title: vid.title.trim() || `Featured Video ${idx + 1}`,
          link: vid.link.trim() || "",
          channel: vid.channel.trim() || "S pro coder Studio",
          duration: vid.duration.trim() || "10:00",
          views: vid.views.trim() || "1K views"
        };
      });
      await set(ref(db, "youtubeVideos"), formatted);
      setVideoSaveSuccess(true);
      setTimeout(() => setVideoSaveSuccess(false), 3050);
    } catch (err) {
      console.error(err);
      alert("Failed to update YouTube videos.");
    } finally {
      setLoading(false);
    }
  };

  // Save Featured Article selection
  const handleSaveFeatured = async (id: string) => {
    setLoading(true);
    setFeaturedSaveSuccess(false);
    try {
      await set(ref(db, "settings/featuredArticleId"), id);
      setFeaturedArticleId(id);
      setFeaturedSaveSuccess(true);
      setTimeout(() => setFeaturedSaveSuccess(false), 3000);
      alert("Featured article saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to save featured article.");
    } finally {
      setLoading(false);
    }
  };

  // Save Footer Links settings
  const handleSaveFooterLinks = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFooterSaveSuccess(false);
    try {
      await set(ref(db, "settings/footerLinks"), footerLinks);
      setFooterSaveSuccess(true);
      setTimeout(() => setFooterSaveSuccess(false), 3000);
      alert("Footer links updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to update footer links.");
    } finally {
      setLoading(false);
    }
  };

  // Save Website Brand and SEO Settings
  const handleSaveSeoSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSeoSaveSuccess(false);
    try {
      await set(ref(db, "settings/websiteTitle"), websiteTitle.trim());
      await set(ref(db, "settings/websiteDescription"), websiteDescription.trim());
      setSeoSaveSuccess(true);
      setTimeout(() => setSeoSaveSuccess(false), 3000);
      alert("SEO Settings saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to save SEO settings.");
    } finally {
      setLoading(false);
    }
  };

  // Real-time YouTube metadata fetcher using YouTube Data API v3
  const handleAutoFetchYouTube = async (index: number, url: string) => {
    const videoId = getYouTubeId(url);
    if (!videoId || videoId.length < 11) return;
    
    setFetchingVideoIdx(index);
    try {
      const apiKey = "AIzaSyA44sCLBbdsUy7adMW9_ztgs1ypMTJkkYU";
      const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${apiKey}`);
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          const item = data.items[0];
          const fetchedTitle = item.snippet?.title || "";
          const fetchedChannel = item.snippet?.channelTitle || "";
          
          // Parse duration ISO 8601 (e.g. PT14M20S -> 14:20)
          const durationISO = item.contentDetails?.duration || "PT10M00S";
          let duration = "10:00";
          const matches = durationISO.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
          if (matches) {
            const hours = matches[1] ? parseInt(matches[1]) : 0;
            const minutes = matches[2] ? parseInt(matches[2]) : 0;
            const seconds = matches[3] ? parseInt(matches[3]) : 0;
            const pad = (n: number) => n.toString().padStart(2, '0');
            if (hours > 0) {
              duration = `${hours}:${pad(minutes)}:${pad(seconds)}`;
            } else {
              duration = `${minutes}:${pad(seconds)}`;
            }
          }

          // Parse views count
          const rawViews = parseInt(item.statistics?.viewCount || "0");
          let views = "1K views";
          if (rawViews >= 1000000) {
            views = `${(rawViews / 1000000).toFixed(1)}M views`;
          } else if (rawViews >= 1000) {
            views = `${(rawViews / 1000).toFixed(1)}K views`;
          } else {
            views = `${rawViews} views`;
          }

          const updated = [...adminVideos];
          updated[index] = {
            ...updated[index],
            title: fetchedTitle || updated[index].title,
            channel: fetchedChannel || updated[index].channel,
            duration: duration,
            views: views
          };
          setAdminVideos(updated);
        }
      }
    } catch (err) {
      console.error("Failed to fetch YouTube info:", err);
    } finally {
      setFetchingVideoIdx(null);
    }
  };

  // Save Website Icon Toggle settings
  const handleToggleWebsiteIcon = async (val: boolean) => {
    setShowWebsiteIcon(val);
    try {
      await set(ref(db, "settings/showWebsiteIcon"), val);
    } catch (err) {
      console.error(err);
    }
  };

  // Save ImgBB Key settings
  const handleSaveImgbbKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setImgbbKeySaveSuccess(false);
    try {
      await set(ref(db, "settings/imgbbKey"), imgbbKey.trim());
      setImgbbKeySaveSuccess(true);
      setTimeout(() => setImgbbKeySaveSuccess(false), 3000);
      alert("ImgBB API Key updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to update ImgBB API Key.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" id="admin-panel-root">
      <div className="bg-white/40 backdrop-blur-lg border border-white/60 rounded-[36px] p-6 md:p-8 space-y-6 text-purple-950 shadow-xl" id="admin-panel-container">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-purple-100 pb-4 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                SYSTEM ADMINISTRATOR ACCESS ACTIVE
              </p>
            </div>
            <h1 className="text-2xl font-black text-purple-950 tracking-tight">
              S pro coder Control Deck
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {onLogout && (
              <button
                onClick={onLogout}
                className="px-5 py-2 rounded-full border border-red-200 text-xs font-bold hover:bg-red-50 active:scale-95 transition-all text-red-600 cursor-pointer bg-white"
                id="admin-logout-btn"
              >
                Log Out Admin
              </button>
            )}
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-full border border-purple-200 text-xs font-bold hover:bg-purple-100 active:scale-95 transition-all text-purple-800 cursor-pointer bg-white"
              id="admin-close-btn"
            >
              Exit Control Deck ✕
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 border-b border-purple-500/10 pb-3" id="admin-tabs">
          <button
            onClick={() => setActiveTab("articles")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "articles" 
                ? "bg-purple-600 text-white shadow-md shadow-purple-100" 
                : "hover:bg-purple-50 text-purple-800"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Articles ({articles.length})</span>
          </button>
          
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "users" 
                ? "bg-purple-600 text-white shadow-md shadow-purple-100" 
                : "hover:bg-purple-50 text-purple-800"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Registered Users ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("categories")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "categories" 
                ? "bg-purple-600 text-white shadow-md shadow-purple-100" 
                : "hover:bg-purple-50 text-purple-800"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Categories ({categories.length}/10)</span>
          </button>

          <button
            onClick={() => setActiveTab("messages")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "messages" 
                ? "bg-purple-600 text-white shadow-md shadow-purple-100" 
                : "hover:bg-purple-50 text-purple-800"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Messages ({messages.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("pages")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "pages" 
                ? "bg-purple-600 text-white shadow-md shadow-purple-100" 
                : "hover:bg-purple-50 text-purple-800"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Pages & Legal Editor</span>
          </button>

          <button
            onClick={() => setActiveTab("videos")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "videos" 
                ? "bg-purple-600 text-white shadow-md shadow-purple-100" 
                : "hover:bg-purple-50 text-purple-800"
            }`}
          >
            <Youtube className="w-4 h-4 text-red-500 fill-red-500" />
            <span>YouTube Showcase</span>
          </button>

          <button
            onClick={() => setActiveTab("featured")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "featured" 
                ? "bg-purple-600 text-white shadow-md shadow-purple-100" 
                : "hover:bg-purple-50 text-purple-800"
            }`}
          >
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>Featured Article</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="min-h-[400px]">
          
          {/* TAB 1: ARTICLES MANAGER */}
          {activeTab === "articles" && (
            <div className="space-y-6" id="tab-articles-content">
              {/* Form to Create/Edit */}
              <form onSubmit={handleSaveArticle} className="p-5 rounded-2xl bg-purple-50/70 border border-purple-100 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-purple-900 flex items-center gap-1.5">
                    <Plus className="w-4 h-4" />
                    <span>{editingArticle ? "Edit Article" : "Write New Tech/AI Article"}</span>
                  </h3>
                  {editingArticle && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setEditingArticle(null);
                        setTitle("");
                        setTagline("");
                        setCategory("");
                        setContent("");
                        setTagsInput("");
                        setThumbnailUrl("");
                        setLikes(0);
                        setSavesCount(0);
                      }} 
                      className="text-[10px] text-purple-600 underline font-semibold"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Title */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">Article Title</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Advanced Prompt Engineering with Gemini 3.5 Pro"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-purple-200 bg-white text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* Tagline */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">Subtitle / Tagline</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Unleashing developer parameters through context caching techniques."
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-purple-200 bg-white text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* Category Selection */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">Category</label>
                    <select
                      required
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-purple-200 bg-white text-xs focus:outline-none focus:border-purple-500"
                    >
                      <option value="">Select Category</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                   {/* Image Upload/Link */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">
                      Thumbnail Image URL (or upload below)
                    </label>
                    <input 
                      type="text" 
                      placeholder="https://images.unsplash.com/... or upload"
                      value={thumbnailUrl}
                      onChange={(e) => setThumbnailUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-purple-200 bg-white text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* SEO Hashtags & Keywords */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">
                      SEO Hashtags & Keywords (comma-separated, without '#')
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. promptengineering, gemini, llm, nextjs, ai"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-purple-200 bg-white text-xs focus:outline-none focus:border-purple-500 font-mono"
                      id="seo-tags-input"
                    />
                  </div>
                </div>

                {/* ImgBB upload integration */}
                <div className="p-3 bg-purple-50 rounded-xl border border-dashed border-purple-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-left">
                    <p className="text-[11px] font-bold text-purple-950 flex items-center gap-1">
                      <Upload className="w-3.5 h-3.5 text-purple-600" />
                      <span>Host Thumbnail Image on ImgBB</span>
                    </p>
                    <p className="text-[9px] text-gray-500">
                      Upload any local image. We will push it to your ImgBB cloud storage instantly.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isUploading ? (
                      <span className="text-[10px] text-purple-600 font-semibold flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Uploading...</span>
                      </span>
                    ) : (
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="text-[10px] text-purple-700 bg-purple-100 hover:bg-purple-200 font-bold py-1 px-3.5 rounded-lg border-0 cursor-pointer"
                      />
                    )}
                  </div>
                </div>
                {uploadError && <p className="text-[10px] text-red-600 font-semibold">{uploadError}</p>}
                {thumbnailUrl && (
                  <div className="flex items-center gap-2 p-1.5 bg-white border border-purple-100 rounded-lg max-w-sm">
                    <img src={thumbnailUrl} alt="preview" className="w-10 h-10 rounded object-cover" />
                    <span className="text-[9px] text-emerald-600 font-bold">✓ Uploaded Image Configured Successfully</span>
                  </div>
                )}

                {/* Content Area */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">
                    Article Content & Text Layout Editor (Blogger Format Helper)
                  </label>
                  
                  {/* Rich Text / Blogger-style formatting bar */}
                  <div className="flex flex-wrap items-center gap-1 p-2 bg-purple-50/70 border border-purple-200 rounded-t-xl text-xs border-b-0">
                    {/* Bold */}
                    <button
                      type="button"
                      onClick={() => insertFormatting('<b>', '</b>')}
                      className="p-1.5 hover:bg-white border border-transparent hover:border-purple-200 rounded text-purple-950 font-bold transition-all cursor-pointer flex items-center justify-center"
                      title="Bold text"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    {/* Italic */}
                    <button
                      type="button"
                      onClick={() => insertFormatting('<i>', '</i>')}
                      className="p-1.5 hover:bg-white border border-transparent hover:border-purple-200 rounded text-purple-950 transition-all cursor-pointer flex items-center justify-center"
                      title="Italic text"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    {/* Underline */}
                    <button
                      type="button"
                      onClick={() => insertFormatting('<u>', '</u>')}
                      className="p-1.5 hover:bg-white border border-transparent hover:border-purple-200 rounded text-purple-950 transition-all cursor-pointer flex items-center justify-center"
                      title="Underline text"
                    >
                      <Underline className="w-3.5 h-3.5" />
                    </button>
                    <div className="h-4 w-px bg-purple-200 mx-1" />
                    
                    {/* Font Size Dropdown/Helpers */}
                    <button
                      type="button"
                      onClick={() => insertFormatting('<span style="font-size: 1.5rem; font-weight: bold; line-height: 1.2;">', '</span>')}
                      className="px-2 py-1 hover:bg-white border border-transparent hover:border-purple-200 rounded text-purple-950 text-[10px] font-black tracking-tighter transition-all cursor-pointer"
                      title="Large Text (Blogger Style)"
                    >
                      A+
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('<span style="font-size: 0.85rem;">', '</span>')}
                      className="px-2 py-1 hover:bg-white border border-transparent hover:border-purple-200 rounded text-purple-950 text-[10px] font-black tracking-tighter transition-all cursor-pointer"
                      title="Small Text"
                    >
                      A-
                    </button>
                    <div className="h-4 w-px bg-purple-200 mx-1" />

                    {/* Font Family Helpers */}
                    <button
                      type="button"
                      onClick={() => insertFormatting('<span style="font-family: Georgia, serif;">', '</span>')}
                      className="px-2 py-1 hover:bg-white border border-transparent hover:border-purple-200 rounded text-purple-950 text-[10px] font-serif transition-all cursor-pointer"
                      title="Serif Font Style"
                    >
                      Serif
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('<span style="font-family: monospace;">', '</span>')}
                      className="px-2 py-1 hover:bg-white border border-transparent hover:border-purple-200 rounded text-purple-950 text-[10px] font-mono transition-all cursor-pointer"
                      title="Monospace Font Style"
                    >
                      Mono
                    </button>
                    <div className="h-4 w-px bg-purple-200 mx-1" />

                    {/* Color Quick buttons */}
                    <button
                      type="button"
                      onClick={() => insertFormatting('<span style="color: #6b21a8; font-weight: bold;">', '</span>')}
                      className="w-3.5 h-3.5 rounded-full bg-purple-700 border border-purple-400 hover:scale-110 transition-transform cursor-pointer"
                      title="Purple text color"
                    />
                    <button
                      type="button"
                      onClick={() => insertFormatting('<span style="color: #b91c1c; font-weight: bold;">', '</span>')}
                      className="w-3.5 h-3.5 rounded-full bg-red-600 border border-red-400 hover:scale-110 transition-transform cursor-pointer"
                      title="Red text color"
                    />
                    <button
                      type="button"
                      onClick={() => insertFormatting('<span style="color: #15803d; font-weight: bold;">', '</span>')}
                      className="w-3.5 h-3.5 rounded-full bg-green-700 border border-green-400 hover:scale-110 transition-transform cursor-pointer"
                      title="Green text color"
                    />
                    <div className="h-4 w-px bg-purple-200 mx-1" />

                    {/* Add Hyperlink */}
                    <button
                      type="button"
                      onClick={() => {
                        const url = prompt("Enter hyperlink URL (e.g. https://sprocoder.online):", "https://");
                        if (url && url.trim() !== "") {
                          insertFormatting(`<a href="${url.trim()}" target="_blank" rel="noopener noreferrer" style="color: #7c3aed; font-weight: bold; text-decoration: underline;">`, '</a>');
                        }
                      }}
                      className="p-1.5 hover:bg-white border border-transparent hover:border-purple-200 rounded text-purple-950 transition-all cursor-pointer flex items-center justify-center gap-1 font-bold text-[10px]"
                      title="Add Link (Blogger Link)"
                    >
                      <Link className="w-3.5 h-3.5 text-purple-600" />
                      <span>Link</span>
                    </button>
                    <div className="h-4 w-px bg-purple-200 mx-1" />

                    {/* Custom HTML Header tags */}
                    <button
                      type="button"
                      onClick={() => insertFormatting('<h2>', '</h2>')}
                      className="px-2 py-1 hover:bg-white border border-transparent hover:border-purple-200 rounded text-purple-950 text-[10px] font-bold transition-all cursor-pointer"
                      title="Header 2"
                    >
                      H2
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('<h3>', '</h3>')}
                      className="px-2 py-1 hover:bg-white border border-transparent hover:border-purple-200 rounded text-purple-950 text-[10px] font-bold transition-all cursor-pointer"
                      title="Header 3"
                    >
                      H3
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('<blockquote>', '</blockquote>')}
                      className="p-1.5 hover:bg-white border border-transparent hover:border-purple-200 rounded text-purple-950 transition-all cursor-pointer flex items-center justify-center"
                      title="Blockquote style"
                    >
                      <Quote className="w-3.5 h-3.5" />
                    </button>
                    <div className="h-4 w-px bg-purple-200 mx-1" />
                    <button
                      type="button"
                      onClick={() => {
                        const code = prompt("Paste your Adsterra or other Ad Network HTML/JS code here:");
                        if (code && code.trim() !== "") {
                          insertFormatting(`\n\n[AD_CODE_START]\n${code.trim()}\n[AD_CODE_END]\n\n`, "");
                        }
                      }}
                      className="p-1.5 hover:bg-amber-50 border border-transparent hover:border-amber-200 rounded text-amber-800 transition-all cursor-pointer flex items-center gap-1 font-bold text-[10px]"
                      title="Insert Ad Network Script or Banner Code (Adsterra / AdSense)"
                    >
                      <Globe className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                      <span>Insert Ad Code</span>
                    </button>
                  </div>

                  <textarea 
                    ref={textareaRef}
                    rows={8}
                    required
                    placeholder="Type or format your article. Wrap text using the Blogger Format Helper above to dynamically customize sizes, colors, and font styles!"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full p-3 rounded-b-xl border border-purple-200 bg-white text-xs font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Fake Likes & Saves Section */}
                <div className="p-3 bg-purple-100/40 rounded-xl grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-purple-900 block flex items-center gap-1">
                      <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
                      <span>Adjust Article Likes Count</span>
                    </label>
                    <input 
                      type="number" 
                      min="0"
                      value={likes}
                      onChange={(e) => setLikes(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg border border-purple-200 bg-white text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-purple-900 block flex items-center gap-1">
                      <Bookmark className="w-3 h-3 text-purple-600 fill-purple-600" />
                      <span>Adjust Saves Count</span>
                    </label>
                    <input 
                      type="number" 
                      min="0"
                      value={savesCount}
                      onChange={(e) => setSavesCount(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg border border-purple-200 bg-white text-xs"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                >
                  <Save className="w-4 h-4" />
                  <span>{loading ? "Publishing Data..." : "Publish / Save Article Live"}</span>
                </button>
              </form>

              {/* Table / List of Existing Articles */}
              <div className="space-y-2">
                <h3 className="text-xs font-black text-purple-950 uppercase tracking-wider">
                  Existing Articles ({articles.length})
                </h3>

                <div className="overflow-x-auto rounded-xl border border-purple-100 bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-purple-50 text-purple-950 font-bold border-b border-purple-100">
                        <th className="p-3">Thumbnail</th>
                        <th className="p-3">Title</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Stats</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-50">
                      {articles.map((art) => (
                        <tr key={art.id} className="hover:bg-purple-50/50">
                          <td className="p-3">
                            <img 
                              src={art.thumbnailUrl} 
                              alt="thumb" 
                              className="w-10 h-7 object-cover rounded border border-purple-100" 
                            />
                          </td>
                          <td className="p-3 font-semibold text-purple-950 max-w-xs truncate">
                            {art.title}
                          </td>
                          <td className="p-3 text-purple-700 font-bold">
                            {art.category}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-3 text-[10px] text-gray-500">
                              <span className="flex items-center gap-0.5">
                                <Heart className="w-3 h-3 text-rose-500 fill-rose-500" /> {art.likes}
                              </span>
                              <span className="flex items-center gap-0.5">
                                <Bookmark className="w-3 h-3 text-purple-600 fill-purple-600" /> {art.savesCount || 0}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-right space-x-1.5">
                            <button 
                              onClick={() => handleEditClick(art)}
                              className="p-1 hover:bg-purple-100 rounded text-purple-700 inline-block cursor-pointer"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteArticle(art.id)}
                              className="p-1 hover:bg-red-50 rounded text-red-600 inline-block cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {articles.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-gray-400">
                            No articles found in your database.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REGISTERED USERS */}
          {activeTab === "users" && (
            <div className="space-y-4 animate-in fade-in duration-200" id="tab-users-content">
              <h3 className="text-xs font-black text-purple-950 uppercase tracking-wider">
                User Database Overview
              </h3>
              <p className="text-[11px] text-gray-500">
                View all registered users, their total registration timestamps, login logs, history entries, and total bookmarks.
              </p>

              <div className="overflow-x-auto rounded-xl border border-purple-100 bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-purple-50 text-purple-950 font-bold border-b border-purple-100">
                      <th className="p-3">User details</th>
                      <th className="p-3">Registered At</th>
                      <th className="p-3">Last Active</th>
                      <th className="p-3">Saves</th>
                      <th className="p-3">Read History Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-50">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-purple-50/50">
                        <td className="p-3">
                          <p className="font-bold text-purple-950">{user.name}</p>
                          <p className="text-[10px] text-purple-700">{user.email}</p>
                        </td>
                        <td className="p-3 text-gray-500 font-mono text-[10px]">
                          {user.registeredAt || "N/A"}
                        </td>
                        <td className="p-3 text-purple-900 font-semibold font-mono text-[10px]">
                          {user.lastLogin || "N/A"}
                        </td>
                        <td className="p-3">
                          <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {user.savedArticles ? user.savedArticles.length : 0} articles
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-purple-800">
                          {user.history ? user.history.length : 0} visits
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-400">
                          No users registered yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: CATEGORIES MANAGER */}
          {activeTab === "categories" && (
            <div className="space-y-6 animate-in fade-in duration-200" id="tab-categories-content">
              <h3 className="text-xs font-black text-purple-950 uppercase tracking-wider">
                Categories Manager (Max 10)
              </h3>
              
              <form onSubmit={handleAddCategory} className="flex gap-2 max-w-md">
                <input 
                  type="text" 
                  maxLength={25}
                  placeholder="e.g. Artificial Intelligence"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-purple-200 text-xs focus:outline-none focus:border-purple-500"
                />
                <button 
                  type="submit"
                  disabled={categories.length >= 10}
                  className="bg-purple-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Category</span>
                </button>
              </form>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {categories.map((cat, idx) => (
                  <div 
                    key={cat} 
                    className="flex items-center justify-between p-3.5 rounded-xl border border-purple-100 bg-purple-50/40"
                  >
                    <div>
                      <span className="text-[10px] text-purple-400 font-mono font-bold mr-1.5">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-bold text-purple-950">{cat}</span>
                    </div>
                    <button 
                      onClick={() => handleDeleteCategory(cat)}
                      className="p-1 hover:bg-red-50 text-red-500 rounded cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: CONTACT MESSAGES */}
          {activeTab === "messages" && (
            <div className="space-y-4 animate-in fade-in duration-200" id="tab-messages-content">
              <h3 className="text-xs font-black text-purple-950 uppercase tracking-wider">
                Received Messages ({messages.length})
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className="p-4 rounded-2xl border border-purple-100 bg-white relative space-y-3 shadow-sm hover:shadow transition-shadow"
                    id={`message-card-${msg.id}`}
                  >
                    <button 
                      onClick={() => handleDeleteMessage(msg.id)}
                      className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors cursor-pointer"
                      title="Delete message"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-extrabold text-purple-950 text-xs">
                          {msg.name}
                        </h4>
                        <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-bold">
                          {msg.country}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5">{msg.email}</p>
                      <p className="text-[9px] text-purple-400 font-mono mt-0.5">{msg.date}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-50/80">
                      <p className="text-xs text-purple-900 leading-relaxed font-sans select-text whitespace-pre-line">
                        {msg.message}
                      </p>
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="p-8 text-center text-gray-400 col-span-2">
                    No contact messages have been received.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: PAGES MANAGER */}
          {activeTab === "pages" && (
            <div className="space-y-6 animate-in fade-in duration-200" id="tab-pages-content">
              
              {/* Site Logo Branding Settings */}
              <div className="p-5 rounded-2xl bg-purple-50/70 border border-purple-100 space-y-4">
                <h4 className="text-xs font-black text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-purple-600" />
                  <span>Website Branding Logo Icon</span>
                </h4>
                <p className="text-[10px] text-gray-500 leading-normal">
                  Upload your website logo icon from here. Once uploaded, it will automatically update the logo icon shown in the navigation menu bar of the page!
                </p>

                <div className="p-3 bg-white rounded-xl border border-dashed border-purple-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-left">
                    <p className="text-[11px] font-bold text-purple-950">
                      Upload Logo to ImgBB Cloud
                    </p>
                    <p className="text-[9px] text-gray-400">
                      Supports PNG, JPG, SVG, GIF.
                    </p>
                  </div>
                  <div>
                    {isUploadingIcon ? (
                      <span className="text-[10px] text-purple-600 font-semibold flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Uploading Logo...</span>
                      </span>
                    ) : (
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleIconUpload}
                        className="text-[10px] text-purple-700 bg-purple-100 hover:bg-purple-200 font-bold py-1 px-3.5 rounded-lg border-0 cursor-pointer"
                      />
                    )}
                  </div>
                </div>

                {iconUploadError && (
                  <p className="text-[10px] text-red-600 font-bold">{iconUploadError}</p>
                )}

                {websiteIcon && (
                  <div className="flex items-center gap-3 p-2.5 bg-white border border-purple-100 rounded-xl max-w-sm">
                    <img src={websiteIcon} alt="Website Logo Icon" className="w-10 h-10 rounded-xl object-cover border border-purple-100 shadow-sm" />
                    <div>
                      <p className="text-[10px] text-emerald-600 font-black">✓ Logo Icon Configured & Live</p>
                      <p className="text-[9px] text-gray-400 truncate max-w-[200px]">{websiteIcon}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-b border-purple-100 pb-2 pt-2">
                <div>
                  <h3 className="text-xs font-black text-purple-950 uppercase tracking-wider">
                    Pages & Legal Markdown Editor
                  </h3>
                  <p className="text-[10px] text-gray-500">
                    Directly modify the HTML/markdown text rendered in your website sections.
                  </p>
                </div>
                {saveSuccess && (
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 animate-bounce">
                    <Check className="w-4 h-4" />
                    <span>Updated Successfully!</span>
                  </span>
                )}
              </div>

              <div className="space-y-4">
                {/* About Content */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-purple-900 uppercase tracking-wider block">
                    About Page Content
                  </label>
                  <textarea 
                    rows={4}
                    value={aboutContent}
                    onChange={(e) => setAboutContent(e.target.value)}
                    className="w-full p-3 rounded-xl border border-purple-200 bg-white text-xs focus:outline-none"
                  />
                </div>

                {/* Privacy Policy */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-purple-900 uppercase tracking-wider block">
                    Privacy Policy Page
                  </label>
                  <textarea 
                    rows={4}
                    value={privacyPolicy}
                    onChange={(e) => setPrivacyPolicy(e.target.value)}
                    className="w-full p-3 rounded-xl border border-purple-200 bg-white text-xs focus:outline-none"
                  />
                </div>

                {/* Terms and Conditions */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-purple-900 uppercase tracking-wider block">
                    Terms & Conditions
                  </label>
                  <textarea 
                    rows={4}
                    value={termsAndConditions}
                    onChange={(e) => setTermsAndConditions(e.target.value)}
                    className="w-full p-3 rounded-xl border border-purple-200 bg-white text-xs focus:outline-none"
                  />
                </div>

                <button 
                  onClick={handleSavePages}
                  disabled={loading}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-1"
                >
                  <Save className="w-4 h-4" />
                  <span>{loading ? "Updating Server Page Configuration..." : "Save Pages Modifications"}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 6: VIDEOS MANAGER */}
          {activeTab === "videos" && (
            <div className="space-y-6 animate-in fade-in duration-200" id="tab-videos-content">
              <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                <div>
                  <h3 className="text-xs font-black text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Youtube className="w-4 h-4 text-red-500 fill-red-500" />
                    <span>Manage YouTube Videos Showcase (Max 5)</span>
                  </h3>
                  <p className="text-[10px] text-gray-500">
                    Directly paste your YouTube video links here. S pro coder will automatically extract the video ID and display the YouTube thumbnail!
                  </p>
                </div>
                {videoSaveSuccess && (
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 animate-bounce">
                    <Check className="w-4 h-4" />
                    <span>Videos Saved Successfully!</span>
                  </span>
                )}
              </div>

              <div className="space-y-6">
                {adminVideos.map((vid, index) => (
                  <div key={vid.id || index} className="p-4 rounded-2xl bg-purple-50/70 border border-purple-100 grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                    {/* Thumbnail Preview */}
                    <div className="md:col-span-3">
                      <div className="aspect-video w-full rounded-xl bg-zinc-950 overflow-hidden relative border border-purple-200">
                        {vid.link ? (
                          <img 
                            src={`https://img.youtube.com/vi/${getYouTubeId(vid.link)}/0.jpg`} 
                            alt="Video preview" 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80";
                            }}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-[10px] text-zinc-400 text-center p-2">
                            Enter YouTube Link
                          </div>
                        )}
                        <div className="absolute bottom-1 right-1 bg-black/80 text-white font-mono text-[9px] px-1 rounded">
                          {vid.duration || "10:00"}
                        </div>
                      </div>
                    </div>

                    {/* Editor Inputs */}
                    <div className="md:col-span-9 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">
                          Video Title {index + 1}
                        </label>
                        <input 
                          type="text"
                          placeholder="e.g. Building full-stack AI applications in minutes using Gemini 3.5 & React"
                          value={vid.title}
                          onChange={(e) => {
                            const updated = [...adminVideos];
                            updated[index].title = e.target.value;
                            setAdminVideos(updated);
                          }}
                          className="w-full px-3 py-1.5 rounded-lg border border-purple-200 bg-white"
                        />
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block flex items-center justify-between">
                          <span>YouTube Video Link or ID</span>
                          {fetchingVideoIdx === index && (
                            <span className="text-[9px] text-red-600 animate-pulse font-mono font-bold">⚡ AUTO-FETCHING DETAILS...</span>
                          )}
                        </label>
                        <div className="flex gap-2">
                          <input 
                            type="text"
                            placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                            value={vid.link}
                            onChange={(e) => {
                              const val = e.target.value;
                              const updated = [...adminVideos];
                              updated[index].link = val;
                              setAdminVideos(updated);
                              handleAutoFetchYouTube(index, val);
                            }}
                            className="flex-grow px-3 py-1.5 rounded-lg border border-purple-200 bg-white font-mono focus:outline-none focus:border-red-500"
                          />
                          <button
                            type="button"
                            disabled={fetchingVideoIdx === index || !vid.link.trim()}
                            onClick={() => handleAutoFetchYouTube(index, vid.link)}
                            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-gray-200 text-white disabled:text-gray-400 font-bold text-[10px] cursor-pointer flex items-center gap-1 transition-all active:scale-95 shrink-0"
                            title="Auto fetch views, duration and title using Real YouTube Data API"
                          >
                            {fetchingVideoIdx === index ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <span>⚡ Fetch Details</span>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">
                          Channel Name
                        </label>
                        <input 
                          type="text"
                          value={vid.channel}
                          onChange={(e) => {
                            const updated = [...adminVideos];
                            updated[index].channel = e.target.value;
                            setAdminVideos(updated);
                          }}
                          className="w-full px-3 py-1.5 rounded-lg border border-purple-200 bg-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">
                            Duration
                          </label>
                          <input 
                            type="text"
                            placeholder="14:20"
                            value={vid.duration}
                            onChange={(e) => {
                              const updated = [...adminVideos];
                              updated[index].duration = e.target.value;
                              setAdminVideos(updated);
                            }}
                            className="w-full px-3 py-1.5 rounded-lg border border-purple-200 bg-white font-mono"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">
                            Views Count
                          </label>
                          <input 
                            type="text"
                            placeholder="124K views"
                            value={vid.views}
                            onChange={(e) => {
                              const updated = [...adminVideos];
                              updated[index].views = e.target.value;
                              setAdminVideos(updated);
                            }}
                            className="w-full px-3 py-1.5 rounded-lg border border-purple-200 bg-white font-mono"
                          />
                        </div>
                      </div>

                    </div>
                  </div>
                ))}

                <button 
                  onClick={handleSaveVideos}
                  disabled={loading}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-purple-100"
                >
                  <Save className="w-4 h-4" />
                  <span>{loading ? "Saving to Database..." : "Save Showcase Videos"}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 7: FEATURED ARTICLE & SETTINGS */}
          {activeTab === "featured" && (
            <div className="space-y-8 animate-in fade-in duration-200" id="tab-featured-content">
              {/* Featured Article Selector Section */}
              <div className="bg-purple-50/40 p-6 rounded-3xl border border-purple-100/80 space-y-4">
                <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                  <div>
                    <h3 className="text-sm font-black text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500 animate-pulse" />
                      <span>Configure Featured Article</span>
                    </h3>
                    <p className="text-[10px] text-gray-500">
                      The chosen article will appear prominently at the top of the homepage as the main showcase story.
                    </p>
                  </div>
                  {featuredSaveSuccess && (
                    <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 animate-bounce">
                      <Check className="w-4 h-4" />
                      <span>Featured Saved!</span>
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">
                      Choose Article to Feature
                    </label>
                    <select
                      value={featuredArticleId}
                      onChange={(e) => setFeaturedArticleId(e.target.value)}
                      className="w-full p-3 rounded-xl border border-purple-200 bg-white text-xs text-purple-950 focus:outline-none focus:border-purple-500"
                    >
                      <option value="">-- Select an Article --</option>
                      {articles.map((art) => (
                        <option key={art.id} value={art.id}>
                          {art.title} ({art.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => handleSaveFeatured(featuredArticleId)}
                    disabled={loading || !featuredArticleId}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-1 shadow-lg shadow-purple-100"
                  >
                    <Save className="w-4 h-4" />
                    <span>{loading ? "Updating Server..." : "Set as Featured Article"}</span>
                  </button>
                </div>
              </div>

              {/* Website SEO Meta & Title Settings Section */}
              <div className="bg-purple-50/40 p-6 rounded-3xl border border-purple-100/80 space-y-4">
                <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                  <div>
                    <h3 className="text-sm font-black text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-purple-600" />
                      <span>Search Engine Optimization (SEO) & Title Settings</span>
                    </h3>
                    <p className="text-[10px] text-gray-500">
                      Customize dynamic search meta metadata, dynamic website tab title, and branding to optimize for AspCoder.online.
                    </p>
                  </div>
                  {seoSaveSuccess && (
                    <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5 animate-bounce">
                      <Check className="w-3 h-3" />
                      <span>Saved!</span>
                    </span>
                  )}
                </div>

                <form onSubmit={handleSaveSeoSettings} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">
                      Custom Website Title (Header & Browser Tab)
                    </label>
                    <input
                      type="text"
                      required
                      value={websiteTitle}
                      onChange={(e) => setWebsiteTitle(e.target.value)}
                      placeholder="e.g. AspCoder.online | Professional Coding Hub"
                      className="w-full p-2.5 rounded-xl border border-purple-200 bg-white text-xs focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">
                      Custom Meta Description (For Best SEO Optimization)
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={websiteDescription}
                      onChange={(e) => setWebsiteDescription(e.target.value)}
                      placeholder="e.g. Master React, Python, Cloud Architectures, and the YouTube API with top-tier tutorials from AspCoder.online."
                      className="w-full p-2.5 rounded-xl border border-purple-200 bg-white text-xs focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !websiteTitle.trim() || !websiteDescription.trim()}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-1 shadow-none transition-all active:scale-95"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{loading ? "Saving Brand Settings..." : "Save SEO & Title Configuration"}</span>
                  </button>
                </form>
              </div>

              {/* Website Icon & General Brand Configuration Section */}
              <div className="bg-purple-50/40 p-6 rounded-3xl border border-purple-100/80 space-y-4">
                <div className="border-b border-purple-100 pb-2">
                  <h3 className="text-sm font-black text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Settings className="w-4 h-4 text-purple-600" />
                    <span>Brand & Media Settings</span>
                  </h3>
                  <p className="text-[10px] text-gray-500">
                    Control brand visuals, logo presence, and customize image upload services.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Website Icon Toggle option */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-purple-100">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-purple-950 block">Show Website Icon</span>
                      <span className="text-[10px] text-gray-500 block">
                        Toggle to display or hide the brand's logo next to the website title in the navigation header.
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showWebsiteIcon}
                        onChange={(e) => handleToggleWebsiteIcon(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-purple-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  {/* ImgBB Key Form */}
                  <form onSubmit={handleSaveImgbbKey} className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">
                          ImgBB API Key (For Custom Image Uploads)
                        </label>
                        {imgbbKeySaveSuccess && (
                          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                            <Check className="w-3 h-3" />
                            <span>Saved!</span>
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={imgbbKey}
                        onChange={(e) => setImgbbKey(e.target.value)}
                        placeholder="Paste your 32-character ImgBB API key..."
                        className="w-full px-3 py-2 rounded-xl border border-purple-200 bg-white text-xs font-mono focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading || !imgbbKey}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-2 rounded-xl cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Update ImgBB Configuration</span>
                    </button>
                  </form>
                </div>
              </div>

              {/* Footer Links Configuration Section */}
              <div className="bg-purple-50/40 p-6 rounded-3xl border border-purple-100/80 space-y-4">
                <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                  <div>
                    <h3 className="text-sm font-black text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-indigo-500" />
                      <span>Configure Footer Links</span>
                    </h3>
                    <p className="text-[10px] text-gray-500">
                      Configure external links used in the social footer section of the website.
                    </p>
                  </div>
                  {footerSaveSuccess && (
                    <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 animate-bounce">
                      <Check className="w-4 h-4" />
                      <span>Footer Saved!</span>
                    </span>
                  )}
                </div>

                <form onSubmit={handleSaveFooterLinks} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">YouTube Channel</label>
                      <input
                        type="url"
                        value={footerLinks.youtube}
                        onChange={(e) => setFooterLinks({ ...footerLinks, youtube: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-purple-200 bg-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">GitHub Profile</label>
                      <input
                        type="url"
                        value={footerLinks.github}
                        onChange={(e) => setFooterLinks({ ...footerLinks, github: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-purple-200 bg-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">LinkedIn Page</label>
                      <input
                        type="url"
                        value={footerLinks.linkedin}
                        onChange={(e) => setFooterLinks({ ...footerLinks, linkedin: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-purple-200 bg-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">Twitter/X Profile</label>
                      <input
                        type="url"
                        value={footerLinks.twitter}
                        onChange={(e) => setFooterLinks({ ...footerLinks, twitter: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-purple-200 bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-1 shadow-lg shadow-purple-100"
                  >
                    <Save className="w-4 h-4" />
                    <span>{loading ? "Updating Social Links..." : "Save Social Footer Links"}</span>
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
