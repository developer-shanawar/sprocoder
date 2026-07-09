import React, { useState, useEffect, useRef } from "react";
import { 
  Users, BookOpen, Layers, MessageSquare, Settings, 
  Plus, Edit, Trash2, Heart, Bookmark, Eye, FileText, Upload, Save, Check, RefreshCw, Lock,
  Youtube, Star, Bold, Italic, Underline, Link, Heading1, Heading2, List, Quote, Globe,
  TrendingUp, BarChart2, Send, Instagram, Facebook, Mail, Sparkles, MessageCircle, AlertCircle
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
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
  const [activeTab, setActiveTab] = useState<"users" | "articles" | "categories" | "messages" | "pages" | "videos" | "featured" | "analytics" | "customCode" | "aiArticle">("articles");
  const [loading, setLoading] = useState(false);

  // AI Article Generator States
  const [aiOption, setAiOption] = useState<"manual" | "auto">("manual");
  const [aiSelectedCategory, setAiSelectedCategory] = useState("");
  const [aiPublishTime, setAiPublishTime] = useState("");
  const [aiGenerationLoading, setAiGenerationLoading] = useState(false);
  const [aiGenerationStep, setAiGenerationStep] = useState(0);
  const [aiGeneratedArticle, setAiGeneratedArticle] = useState<BlogPost | null>(null);
  const [aiSuccessMessage, setAiSuccessMessage] = useState("");
  const [aiErrorMessage, setAiErrorMessage] = useState("");

  // Disclaimer Page and Social Media Configuration States
  const [disclaimerContent, setDisclaimerContent] = useState("");
  const [socialLinks, setSocialLinks] = useState({
    gmail: "developershanawar@gmail.com",
    telegram: "https://t.me/example",
    showGmail: true,
    showTelegram: true
  });
  const [socialSaveSuccess, setSocialSaveSuccess] = useState(false);

  // Live Web Analytics State
  const [analyticsData, setAnalyticsData] = useState<any>({
    sources: { direct: 154, search: 98, social: 76 },
    countries: { "United States": 142, "Pakistan": 89, "United Kingdom": 62, "Germany": 41, "Canada": 33, "Australia": 22 },
    weeklyViews: [110, 134, 125, 148, 139, 167, 185]
  });

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
  const [publishStatus, setPublishStatus] = useState<"direct" | "scheduled">("direct");
  const [scheduledDate, setScheduledDate] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");

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

  // OpenRouter & Hugging Face Keys state
  const [openRouterKey, setOpenRouterKey] = useState("");
  const [huggingFaceKey, setHuggingFaceKey] = useState("");
  const [apiKeysSaveSuccess, setApiKeysSaveSuccess] = useState(false);

  // Website Brand SEO Settings state
  const [websiteTitle, setWebsiteTitle] = useState("S pro coder");
  const [websiteDescription, setWebsiteDescription] = useState("bespoke digital platform supplying high-end tech tutorials and AI articles.");
  const [seoSaveSuccess, setSeoSaveSuccess] = useState(false);

  // Script & Verification Code Injection states
  const [customHeadCode, setCustomHeadCode] = useState("");
  const [customBodyCode, setCustomBodyCode] = useState("");
  const [customCodeSaveSuccess, setCustomCodeSaveSuccess] = useState(false);
  
  // AdSense / ads.txt integration states
  const [adsTxt, setAdsTxt] = useState("");
  const [enableAdSense, setEnableAdSense] = useState(false);

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
        setDisclaimerContent(data.disclaimerContent || "");
      }
    });

    // 4.5. Load Social Links Config
    get(ref(db, "settings/socialLinks")).then((snapshot) => {
      if (snapshot.exists()) {
        setSocialLinks((prev) => ({
          ...prev,
          ...snapshot.val()
        }));
      }
    });

    // 4.6. Subscribe to Live Analytics data
    const unsubAnalytics = onValue(ref(db, "analytics"), (snapshot) => {
      if (snapshot.exists()) {
        setAnalyticsData(snapshot.val());
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

    // Load OpenRouter Key
    get(ref(db, "settings/openRouterKey")).then((snapshot) => {
      if (snapshot.exists()) {
        setOpenRouterKey(snapshot.val());
      }
    });

    // Load Hugging Face Key
    get(ref(db, "settings/huggingFaceKey")).then((snapshot) => {
      if (snapshot.exists()) {
        setHuggingFaceKey(snapshot.val());
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

    // 13. Load Custom Injection Code
    get(ref(db, "settings/customCode")).then((snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        setCustomHeadCode(val.headCode || "");
        setCustomBodyCode(val.bodyCode || "");
      }
    });

    // 13.5. Load AdSense and ads.txt settings
    get(ref(db, "settings/adsTxt")).then((snapshot) => {
      if (snapshot.exists()) {
        setAdsTxt(snapshot.val() || "");
      }
    });

    get(ref(db, "settings/enableAdSense")).then((snapshot) => {
      if (snapshot.exists()) {
        setEnableAdSense(snapshot.val() === true);
      }
    });

    return () => {
      unsubUsers();
      unsubArticles();
      unsubMessages();
      unsubAnalytics();
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
        keywords: existingPost ? existingPost.keywords : "",
        competitiveTrends: existingPost ? existingPost.competitiveTrends : "",
        comments: existingPost ? (existingPost.comments || []) : [],
        publishStatus,
        scheduledDate: publishStatus === "scheduled" ? scheduledDate : "",
        visibility: visibility || "public"
      };

      await set(ref(db, `${DB_PATHS.ARTICLES}/${articleId}`), articlePayload);

      // If it is a new article, trigger notification in database
      if (isNew) {
        const newNotifRef = push(ref(db, DB_PATHS.NOTIFICATIONS));
        await set(newNotifRef, {
          id: newNotifRef.key,
          title: publishStatus === "scheduled" ? "New Article Scheduled!" : "New Article Published!",
          body: publishStatus === "scheduled" 
            ? `"${title.trim()}" has been scheduled for publication in ${category}!`
            : `"${title.trim()}" is now live in the ${category} category!`,
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
      setPublishStatus("direct");
      setScheduledDate("");
      setVisibility("public");
      alert("Article saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Error saving article to Realtime Database.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAiArticle = async () => {
    if (aiOption === "manual" && !aiSelectedCategory) {
      setAiErrorMessage("Please select a category for generating the AI article.");
      return;
    }
    
    setAiErrorMessage("");
    setAiSuccessMessage("");
    setAiGeneratedArticle(null);
    setAiGenerationLoading(true);
    setAiGenerationStep(0);
    
    // Simulate nice step-by-step progress
    const stepsInterval = setInterval(() => {
      setAiGenerationStep((prev) => {
        if (prev < 5) return prev + 1;
        clearInterval(stepsInterval);
        return prev;
      });
    }, 1500);
    
    try {
      const response = await fetch("/api/blog/generate-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          option: aiOption,
          category: aiOption === "manual" ? aiSelectedCategory : "",
          publishTime: aiPublishTime,
          openRouterKey,
          huggingFaceKey,
          imgbbKey
        })
      });
      
      const responseText = await response.text();
      clearInterval(stepsInterval);
      
      if (!response.ok) {
        let errMsg = "Failed to generate AI article.";
        try {
          const errData = JSON.parse(responseText);
          errMsg = errData.error || errMsg;
        } catch {
          errMsg = `Server error (${response.status}): ${responseText.substring(0, 150)}`;
        }
        throw new Error(errMsg);
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error("Invalid response format received from AI server. Failed to parse article JSON.");
      }
      
      setAiGenerationStep(6); // Final success step
      setAiGeneratedArticle(data);
      setAiSuccessMessage(`AI Article generated successfully! Category: ${data.category}. Format: Professional Q&A.`);
    } catch (err: any) {
      clearInterval(stepsInterval);
      setAiErrorMessage(err.message || "An unexpected error occurred during AI generation.");
    } finally {
      setAiGenerationLoading(false);
    }
  };

  const handleSaveAiArticle = async () => {
    if (!aiGeneratedArticle) return;
    setLoading(true);
    try {
      const post = aiGeneratedArticle;
      
      // Save to Firebase database
      await set(ref(db, `${DB_PATHS.ARTICLES}/${post.id}`), post);
      
      // Trigger notification in database
      const newNotifRef = push(ref(db, DB_PATHS.NOTIFICATIONS));
      await set(newNotifRef, {
        id: newNotifRef.key,
        title: post.publishStatus === "scheduled" ? "AI Article Scheduled!" : "AI Article Published!",
        body: post.publishStatus === "scheduled" 
          ? `"${post.title}" has been scheduled for publication in ${post.category}!`
          : `"${post.title}" is now live in the ${post.category} category!`,
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
        isRead: false
      });
      
      setAiSuccessMessage(`Article "${post.title}" has been successfully published to the website!`);
      setAiGeneratedArticle(null);
    } catch (err: any) {
      console.error(err);
      setAiErrorMessage("Failed to save AI article to the database.");
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
    setPublishStatus(post.publishStatus || "direct");
    setScheduledDate(post.scheduledDate || "");
    setVisibility(post.visibility || "public");
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
        termsAndConditions,
        disclaimerContent
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

  // Save Social links and visibility
  const handleSaveSocialLinks = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSocialSaveSuccess(false);
    try {
      await set(ref(db, "settings/socialLinks"), socialLinks);
      setSocialSaveSuccess(true);
      setTimeout(() => setSocialSaveSuccess(false), 3000);
      alert("Social links and visibility updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to update social links.");
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

  // Save OpenRouter & Hugging Face Keys settings
  const handleSaveApiKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setApiKeysSaveSuccess(false);
    try {
      await set(ref(db, "settings/openRouterKey"), openRouterKey.trim());
      await set(ref(db, "settings/huggingFaceKey"), huggingFaceKey.trim());
      setApiKeysSaveSuccess(true);
      setTimeout(() => setApiKeysSaveSuccess(false), 3000);
      alert("AI Generation API Keys updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to update AI API keys.");
    } finally {
      setLoading(false);
    }
  };

  // Save Script & Ownership Verification custom code
  const handleSaveCustomCode = async () => {
    setLoading(true);
    setCustomCodeSaveSuccess(false);
    try {
      await Promise.all([
        set(ref(db, "settings/customCode"), {
          headCode: customHeadCode,
          bodyCode: customBodyCode
        }),
        set(ref(db, "settings/adsTxt"), adsTxt),
        set(ref(db, "settings/enableAdSense"), enableAdSense)
      ]);
      setCustomCodeSaveSuccess(true);
      setTimeout(() => setCustomCodeSaveSuccess(false), 3000);
      alert("Verification, AdSense, and ads.txt settings saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to update scripts and ad settings.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" id="admin-panel-root">
      <div className="bg-[#f5f0ff] border-2 border-purple-200/80 rounded-[36px] p-6 md:p-8 space-y-6 text-purple-950 shadow-2xl" id="admin-panel-container">
        
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
            onClick={() => setActiveTab("aiArticle")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "aiArticle" 
                ? "bg-purple-600 text-white shadow-md shadow-purple-100" 
                : "hover:bg-purple-50 text-purple-800 font-bold"
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-500 animate-pulse" />
            <span>AI Article Engine</span>
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

          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "analytics" 
                ? "bg-purple-600 text-white shadow-md shadow-purple-100" 
                : "hover:bg-purple-50 text-purple-800"
            }`}
          >
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span>Live Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab("customCode")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "customCode" 
                ? "bg-purple-600 text-white shadow-md shadow-purple-100" 
                : "hover:bg-purple-50 text-purple-800"
            }`}
          >
            <Globe className="w-4 h-4 text-purple-600" />
            <span>Ad & Ownership Verification</span>
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

                  {/* Scheduling System block */}
                  <div className="space-y-1.5 md:col-span-2 p-4 bg-purple-50 rounded-2xl border border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <label className="text-[10px] font-bold text-purple-950 uppercase tracking-wider block">
                        Publishing Flow Selection
                      </label>
                      <p className="text-[9px] text-gray-500">
                        Choose whether to publish this article instantly or specify a future publication time.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 text-xs text-purple-950 font-bold cursor-pointer">
                          <input 
                            type="radio" 
                            name="publishFlow" 
                            value="direct" 
                            checked={publishStatus === "direct"} 
                            onChange={() => setPublishStatus("direct")} 
                            className="text-purple-600 focus:ring-purple-500" 
                          />
                          <span>Direct Publish</span>
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-purple-950 font-bold cursor-pointer">
                          <input 
                            type="radio" 
                            name="publishFlow" 
                            value="scheduled" 
                            checked={publishStatus === "scheduled"} 
                            onChange={() => setPublishStatus("scheduled")} 
                            className="text-purple-600 focus:ring-purple-500" 
                          />
                          <span>Schedule Publication</span>
                        </label>
                      </div>

                      {publishStatus === "scheduled" && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                          <span className="text-[10px] font-bold text-purple-900 uppercase shrink-0">Publish Time:</span>
                          <input 
                            type="datetime-local" 
                            required={publishStatus === "scheduled"} 
                            value={scheduledDate} 
                            onChange={(e) => setScheduledDate(e.target.value)} 
                            className="px-3 py-1.5 rounded-lg border border-purple-200 bg-white text-xs focus:outline-none focus:border-purple-500 font-mono" 
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* YouTube-style Visibility Selection */}
                  <div className="space-y-1.5 md:col-span-2 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <label className="text-[10px] font-bold text-indigo-950 uppercase tracking-wider block flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                        <span>Visibility Setting (YouTube-Style)</span>
                      </label>
                      <p className="text-[9px] text-gray-500">
                        Choose whether this article is Publicly visible to all visitors or Private (saved in dashboard, but hidden from the public feed).
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-1.5 text-xs text-indigo-950 font-bold cursor-pointer">
                          <input 
                            type="radio" 
                            name="articleVisibility" 
                            value="public" 
                            checked={visibility === "public"} 
                            onChange={() => setVisibility("public")} 
                            className="text-indigo-600 focus:ring-indigo-500" 
                          />
                          <span className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-indigo-100 shadow-sm">
                            <Globe className="w-3.5 h-3.5 text-emerald-500" />
                            Public
                          </span>
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-indigo-950 font-bold cursor-pointer">
                          <input 
                            type="radio" 
                            name="articleVisibility" 
                            value="private" 
                            checked={visibility === "private"} 
                            onChange={() => setVisibility("private")} 
                            className="text-indigo-600 focus:ring-indigo-500" 
                          />
                          <span className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-indigo-100 shadow-sm">
                            <Lock className="w-3.5 h-3.5 text-rose-500" />
                            Private
                          </span>
                        </label>
                      </div>
                    </div>
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
                          <td className="p-3 max-w-xs truncate">
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              <span className="font-semibold text-purple-950">{art.title}</span>
                              {art.visibility === "private" ? (
                                <span className="inline-flex items-center gap-0.5 text-[8px] bg-rose-100 text-rose-700 font-bold px-1.5 py-0.5 rounded uppercase">
                                  <Lock className="w-2.5 h-2.5" /> Private
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-[8px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded uppercase">
                                  <Globe className="w-2.5 h-2.5" /> Public
                                </span>
                              )}
                            </div>
                            {art.publishStatus === "scheduled" && (
                              <div className="mt-1 flex items-center gap-1">
                                <span className="text-[8px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                                  Scheduled
                                </span>
                                <span className="text-[9px] text-amber-700 font-bold">
                                  {art.scheduledDate ? new Date(art.scheduledDate).toLocaleString() : "Date TBD"}
                                </span>
                              </div>
                            )}
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
                              <span className="flex items-center gap-0.5">
                                <Eye className="w-3.5 h-3.5 text-purple-500" /> {art.views || 0}
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

                {/* Disclaimer Content */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-purple-900 uppercase tracking-wider block">
                    Disclaimer Content (Legal Notice)
                  </label>
                  <textarea 
                    rows={4}
                    value={disclaimerContent}
                    onChange={(e) => setDisclaimerContent(e.target.value)}
                    className="w-full p-3 rounded-xl border border-purple-200 bg-white text-xs focus:outline-none"
                    placeholder="Enter the disclaimer legal notice..."
                  />
                </div>

                <button 
                  onClick={handleSavePages}
                  disabled={loading}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-1"
                >
                  <Save className="w-4 h-4" />
                  <span>{loading ? "Updating Server Page Configuration..." : "Save Pages & Legal Notices"}</span>
                </button>
              </div>

              {/* Social Media Link Settings */}
              <div className="p-5 rounded-2xl bg-purple-50/70 border border-purple-100 space-y-4 mt-6">
                <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                  <h4 className="text-xs font-black text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-purple-600" />
                    <span>Configure Bottom Social Links</span>
                  </h4>
                  {socialSaveSuccess && (
                    <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 animate-bounce">
                      <Check className="w-4 h-4" />
                      <span>Updated!</span>
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-500 leading-normal">
                  Toggle visibility and specify destination URLs/addresses for your social media channels shown in the website footer.
                </p>

                <div className="space-y-3">
                  {/* Gmail */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-white rounded-xl border border-purple-100">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        checked={socialLinks.showGmail}
                        onChange={(e) => setSocialLinks({ ...socialLinks, showGmail: e.target.checked })}
                        className="rounded border-purple-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
                      />
                      <span className="text-[11px] font-bold text-purple-950 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-purple-600" /> Gmail Address
                      </span>
                    </div>
                    <input 
                      type="text"
                      value={socialLinks.gmail}
                      onChange={(e) => setSocialLinks({ ...socialLinks, gmail: e.target.value })}
                      placeholder="developershanawar@gmail.com"
                      className="p-2 border border-purple-150 rounded-lg text-xs w-full sm:w-80 focus:outline-none"
                    />
                  </div>

                  {/* Telegram */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-white rounded-xl border border-purple-100">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        checked={socialLinks.showTelegram}
                        onChange={(e) => setSocialLinks({ ...socialLinks, showTelegram: e.target.checked })}
                        className="rounded border-purple-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
                      />
                      <span className="text-[11px] font-bold text-purple-950 flex items-center gap-1.5">
                        <Send className="w-3.5 h-3.5 text-sky-500" /> Telegram Link
                      </span>
                    </div>
                    <input 
                      type="text"
                      value={socialLinks.telegram}
                      onChange={(e) => setSocialLinks({ ...socialLinks, telegram: e.target.value })}
                      placeholder="https://t.me/example"
                      className="p-2 border border-purple-150 rounded-lg text-xs w-full sm:w-80 focus:outline-none"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleSaveSocialLinks}
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-1 shadow-md shadow-indigo-100"
                >
                  <Save className="w-4 h-4" />
                  <span>{loading ? "Updating Socials..." : "Save Social Media Links & Visibility"}</span>
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

              {/* AI Generation API Keys Section */}
              <div className="bg-purple-50/40 p-6 rounded-3xl border border-purple-100/80 space-y-4">
                <div className="border-b border-purple-100 pb-2">
                  <h3 className="text-sm font-black text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
                    <span>AI Article Generation API Keys</span>
                  </h3>
                  <p className="text-[10px] text-gray-500">
                    Provide credentials for third-party AI models to write high-end text and generate beautiful featured article illustrations automatically.
                  </p>
                </div>

                <form onSubmit={handleSaveApiKeys} className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">
                        OpenRouter API Key (For Text Content & Structure)
                      </label>
                      {apiKeysSaveSuccess && (
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                          <Check className="w-3 h-3" />
                          <span>Saved!</span>
                        </span>
                      )}
                    </div>
                    <input
                      type="password"
                      value={openRouterKey}
                      onChange={(e) => setOpenRouterKey(e.target.value)}
                      placeholder="sk-or-v1-..."
                      className="w-full px-3 py-2 rounded-xl border border-purple-200 bg-white text-xs font-mono focus:outline-none focus:border-purple-500"
                    />
                    <span className="text-[8px] text-gray-500 block">
                      Enables the blog to generate elite tech essays using cutting-edge models without access constraints.
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">
                      Hugging Face API Token (For FLUX/SD Image Assets)
                    </label>
                    <input
                      type="password"
                      value={huggingFaceKey}
                      onChange={(e) => setHuggingFaceKey(e.target.value)}
                      placeholder="hf_..."
                      className="w-full px-3 py-2 rounded-xl border border-purple-200 bg-white text-xs font-mono focus:outline-none focus:border-purple-500"
                    />
                    <span className="text-[8px] text-gray-500 block">
                      Used to render breathtaking, highly relevant, custom vector/abstract featured illustration cards dynamically.
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-2 rounded-xl cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Update AI API Credentials</span>
                  </button>
                </form>
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

          {/* TAB 8: LIVE WEB ANALYTICS */}
          {activeTab === "analytics" && (
            <div className="space-y-6 animate-in fade-in duration-200" id="tab-analytics-content">
              {/* Header inside tab */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-purple-100 pb-3 gap-2">
                <div>
                  <h3 className="text-xs font-black text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-500 animate-pulse" />
                    <span>Real-Time Visitor Analytics Dashboard</span>
                  </h3>
                  <p className="text-[10px] text-gray-500">
                    Monitor traffic channels, reader locales, and article engagement performance synced directly from Firebase.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] bg-emerald-50 text-emerald-800 font-mono px-2.5 py-1 rounded-full border border-emerald-200 font-bold">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                  <span>LIVE REFRESH ACTIVE</span>
                </div>
              </div>

              {/* Summary Cards Grid */}
              {(() => {
                const now = new Date();
                const getLocalDateStr = (d: Date) => {
                  const year = d.getFullYear();
                  const month = String(d.getMonth() + 1).padStart(2, '0');
                  const day = String(d.getDate()).padStart(2, '0');
                  return `${year}-${month}-${day}`;
                };
                
                // Today
                const todayStr = getLocalDateStr(now);
                const todayViews = analyticsData?.dailyViews?.[todayStr] || 0;
                
                // Yesterday
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = getLocalDateStr(yesterday);
                const yesterdayViews = analyticsData?.dailyViews?.[yesterdayStr] || 0;
                
                // Last 24 Hours: sum of the last 24 entries in hourlyViews
                let last24hViews = 0;
                const hourlyViews = analyticsData?.hourlyViews || {};
                for (let i = 0; i < 24; i++) {
                  const d = new Date();
                  d.setHours(d.getHours() - i);
                  const year = d.getFullYear();
                  const month = String(d.getMonth() + 1).padStart(2, '0');
                  const day = String(d.getDate()).padStart(2, '0');
                  const hour = String(d.getHours()).padStart(2, '0');
                  const key = `${year}-${month}-${day}T${hour}`;
                  last24hViews += hourlyViews[key] || 0;
                }
                
                // Last 7 Days: sum of last 7 daily views
                let last7DaysViews = 0;
                const dailyViews = analyticsData?.dailyViews || {};
                for (let i = 0; i < 7; i++) {
                  const d = new Date();
                  d.setDate(d.getDate() - i);
                  const key = getLocalDateStr(d);
                  last7DaysViews += dailyViews[key] || 0;
                }
                
                // This Month
                const thisMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                let thisMonthViews = 0;
                Object.entries(dailyViews).forEach(([key, val]) => {
                  if (key.startsWith(thisMonthPrefix)) {
                    thisMonthViews += (val as number);
                  }
                });
                
                // Last Month
                const lastMonthDate = new Date();
                lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
                const lastMonthPrefix = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
                let lastMonthViews = 0;
                Object.entries(dailyViews).forEach(([key, val]) => {
                  if (key.startsWith(lastMonthPrefix)) {
                    lastMonthViews += (val as number);
                  }
                });
                
                // All time
                const allTimeViews = (analyticsData?.sources?.direct || 0) + (analyticsData?.sources?.search || 0) + (analyticsData?.sources?.social || 0);
                
                return (
                  <div className="space-y-6">
                    {/* Time-based History Analytics */}
                    <div className="bg-purple-50/50 p-4 rounded-3xl border border-purple-100/50">
                      <p className="text-[10px] font-black text-purple-900 uppercase tracking-widest mb-3 text-left">TRAFFIC VOLUME HISTORY</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                        <div className="p-3 bg-white border border-purple-100 rounded-2xl shadow-xs text-left">
                          <p className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">Today</p>
                          <p className="text-xl font-black text-purple-950 mt-1">{todayViews}</p>
                          <span className="text-[7px] text-gray-400 font-mono">Live local date</span>
                        </div>
                        <div className="p-3 bg-white border border-purple-100 rounded-2xl shadow-xs text-left">
                          <p className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">Yesterday</p>
                          <p className="text-xl font-black text-purple-950 mt-1">{yesterdayViews}</p>
                          <span className="text-[7px] text-gray-400 font-mono">Previous 24h day</span>
                        </div>
                        <div className="p-3 bg-white border border-purple-100 rounded-2xl shadow-xs text-left">
                          <p className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">Last 24 Hours</p>
                          <p className="text-xl font-black text-emerald-600 mt-1">{last24hViews || todayViews}</p>
                          <span className="text-[7px] text-emerald-600 font-bold animate-pulse">Hourly aggregate</span>
                        </div>
                        <div className="p-3 bg-white border border-purple-100 rounded-2xl shadow-xs text-left">
                          <p className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">Last 7 Days</p>
                          <p className="text-xl font-black text-purple-950 mt-1">{last7DaysViews || allTimeViews}</p>
                          <span className="text-[7px] text-gray-400 font-mono">Rolling week total</span>
                        </div>
                        <div className="p-3 bg-white border border-purple-100 rounded-2xl shadow-xs text-left">
                          <p className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">This Month</p>
                          <p className="text-xl font-black text-purple-950 mt-1">{thisMonthViews || allTimeViews}</p>
                          <span className="text-[7px] text-purple-600 font-bold">Current month</span>
                        </div>
                        <div className="p-3 bg-white border border-purple-100 rounded-2xl shadow-xs text-left">
                          <p className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">Last Month</p>
                          <p className="text-xl font-black text-purple-950 mt-1">{lastMonthViews}</p>
                          <span className="text-[7px] text-gray-400 font-mono">Previous month</span>
                        </div>
                        <div className="p-3 bg-white border border-purple-100 rounded-2xl shadow-xs text-left">
                          <p className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">All Time</p>
                          <p className="text-xl font-black text-indigo-600 mt-1">{allTimeViews}</p>
                          <span className="text-[7px] text-indigo-500 font-bold">Total Page Views</span>
                        </div>
                      </div>
                    </div>

                    {/* Channel Distribution */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 bg-white border border-purple-100 rounded-2xl shadow-sm text-left">
                        <p className="text-[9px] font-black text-purple-900 uppercase tracking-wider">Direct Traffic</p>
                        <p className="text-2xl font-black text-purple-950 mt-1">{analyticsData?.sources?.direct || 0}</p>
                        <p className="text-[8px] text-gray-400 mt-1">Bookmarks, copy-paste URLs</p>
                      </div>
                      <div className="p-4 bg-white border border-purple-100 rounded-2xl shadow-sm text-left">
                        <p className="text-[9px] font-black text-purple-900 uppercase tracking-wider">Search Engines</p>
                        <p className="text-2xl font-black text-purple-950 mt-1">{analyticsData?.sources?.search || 0}</p>
                        <p className="text-[8px] text-gray-400 mt-1">Google, Bing, Yahoo</p>
                      </div>
                      <div className="p-4 bg-white border border-purple-100 rounded-2xl shadow-sm text-left">
                        <p className="text-[9px] font-black text-purple-900 uppercase tracking-wider">Social Channels</p>
                        <p className="text-2xl font-black text-purple-950 mt-1">{analyticsData?.sources?.social || 0}</p>
                        <p className="text-[8px] text-gray-400 mt-1">Telegram, YouTube, Meta</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Recharts Graphical Visualizations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pie Chart: Traffic Source */}
                <div className="p-5 bg-white/60 border border-purple-100 rounded-3xl shadow-sm text-center">
                  <p className="text-[10px] font-black text-purple-900 uppercase tracking-wider text-left border-b border-purple-100 pb-2 mb-3">
                    Traffic Sources Distribution
                  </p>
                  <div className="h-60 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Direct", value: analyticsData?.sources?.direct || 0 },
                            { name: "Search Engines", value: analyticsData?.sources?.search || 0 },
                            { name: "Social Channels", value: analyticsData?.sources?.social || 0 }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          <Cell fill="#8b5cf6" />
                          <Cell fill="#3b82f6" />
                          <Cell fill="#ec4899" />
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Bar Chart: Weekly progression */}
                <div className="p-5 bg-white/60 border border-purple-100 rounded-3xl shadow-sm">
                  <p className="text-[10px] font-black text-purple-900 uppercase tracking-wider text-left border-b border-purple-100 pb-2 mb-3">
                    Daily Viewership (Current Week)
                  </p>
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={(analyticsData?.weeklyViews || [110, 134, 125, 148, 139, 167, 185]).map((val: number, idx: number) => {
                          const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
                          return { name: days[idx] || `Day ${idx+1}`, Views: val };
                        })}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#581c87" }} />
                        <YAxis tick={{ fontSize: 9, fill: "#581c87" }} />
                        <Tooltip />
                        <Bar dataKey="Views" fill="#6366f1" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Horizontal Bar: Top Countries locales */}
                <div className="p-5 bg-white/60 border border-purple-100 rounded-3xl shadow-sm md:col-span-2">
                  <p className="text-[10px] font-black text-purple-900 uppercase tracking-wider text-left border-b border-purple-100 pb-2 mb-3">
                    Top Audience Countries Locales
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={Object.entries(analyticsData?.countries || { "United States": 142, "Pakistan": 89, "United Kingdom": 62, "Germany": 41, "Canada": 33 }).map(([name, value]) => ({
                            name,
                            Visitors: value as number
                          })).sort((a,b) => b.Visitors - a.Visitors).slice(0, 5)}
                          margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                        >
                          <XAxis type="number" tick={{ fontSize: 9, fill: "#581c87" }} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "#581c87" }} width={80} />
                          <Tooltip />
                          <Bar dataKey="Visitors" fill="#06b6d4" radius={[0, 8, 8, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[11px] font-bold text-purple-950 uppercase tracking-widest text-left">Detailed country breakdown</p>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {Object.entries(analyticsData?.countries || { "United States": 142, "Pakistan": 89, "United Kingdom": 62, "Germany": 41, "Canada": 33 })
                          .sort((a: any, b: any) => b[1] - a[1])
                          .map(([countryName, val]: any, index) => {
                            const total = Object.values(analyticsData?.countries || {}).reduce((acc: number, cur: any) => acc + cur, 0) as number;
                            const pct = total > 0 ? ((val / total) * 100).toFixed(1) : "0";
                            return (
                              <div key={countryName} className="flex items-center justify-between text-xs p-2 bg-white border border-purple-50 rounded-xl">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-5 h-5 rounded-full bg-purple-50 text-[10px] font-bold flex items-center justify-center text-purple-700">
                                    {index + 1}
                                  </span>
                                  <span className="font-semibold text-purple-950">{countryName}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500 font-mono text-[11px]">{val} hits</span>
                                  <span className="text-[10px] font-extrabold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">{pct}%</span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Content performance table */}
              <div className="bg-white/60 p-5 rounded-3xl border border-purple-100 shadow-sm text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-100 pb-3 mb-4">
                  <div>
                    <h4 className="text-[11px] font-black text-purple-950 uppercase tracking-widest flex items-center gap-1.5">
                      <BarChart2 className="w-4 h-4 text-purple-600" />
                      <span>Individual Articles Performance Analysis</span>
                    </h4>
                    <p className="text-[10px] text-gray-500">
                      Sort and filter to evaluate the exact traffic, click-through, and engagement performance of each written post.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-purple-100 text-purple-900 font-bold">
                        <th className="py-2.5 text-left font-bold uppercase tracking-wider text-[10px] pb-3">Article Title & Category</th>
                        <th className="py-2.5 text-center font-bold uppercase tracking-wider text-[10px] pb-3">Traffic (Views)</th>
                        <th className="py-2.5 text-center font-bold uppercase tracking-wider text-[10px] pb-3">Likes</th>
                        <th className="py-2.5 text-center font-bold uppercase tracking-wider text-[10px] pb-3">Saves</th>
                        <th className="py-2.5 text-center font-bold uppercase tracking-wider text-[10px] pb-3">Comments</th>
                        <th className="py-2.5 text-right font-bold uppercase tracking-wider text-[10px] pb-3">Engagement Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-50/50">
                      {[...articles]
                        .sort((a, b) => (b.views || 0) - (a.views || 0))
                        .map((post) => {
                          const commentsArray = post.comments 
                            ? (Array.isArray(post.comments) 
                              ? post.comments 
                              : Object.values(post.comments)) 
                            : [];
                          const commsCount = commentsArray.length;
                          const views = post.views || 0;
                          const likesCount = post.likes || 0;
                          const savesCount = post.savesCount || 0;
                          
                          // Engagement rate calculation
                          const engagementPoints = likesCount * 2 + savesCount * 3 + commsCount * 4;
                          const engagementRate = views > 0 ? ((engagementPoints / views) * 100).toFixed(1) : "0";

                          return (
                            <tr key={post.id} className="hover:bg-purple-50/40 transition-colors">
                              <td className="py-3 pr-2 text-left">
                                <p className="font-extrabold text-purple-950 line-clamp-1">{post.title}</p>
                                <span className="text-[9px] text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider inline-block mt-0.5">
                                  {post.category}
                                </span>
                              </td>
                              <td className="py-3 text-center">
                                <span className="font-mono font-bold text-purple-950 bg-slate-100 px-2 py-0.5 rounded-md">{views}</span>
                              </td>
                              <td className="py-3 text-center text-rose-600 font-bold font-mono">{likesCount}</td>
                              <td className="py-3 text-center text-purple-600 font-bold font-mono">{savesCount}</td>
                              <td className="py-3 text-center text-indigo-600 font-bold font-mono">{commsCount}</td>
                              <td className="py-3 text-right">
                                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                                  {engagementRate}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      {articles.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-6 text-gray-400">
                            No tech/AI articles currently configured. Write an article to generate performance analytics.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: AD & OWNERSHIP VERIFICATION CODE INJECTION */}
          {activeTab === "customCode" && (
            <div className="space-y-6 animate-in fade-in duration-200" id="tab-customcode-content">
              <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                <div>
                  <h3 className="text-sm font-black text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-purple-600" />
                    <span>Ad Networks & Ownership Verification Setup</span>
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Inject custom meta tags, CSS styles, Google AdSense verification scripts, or tracking pixels into the head or body of S pro coder.
                  </p>
                </div>
                {customCodeSaveSuccess && (
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 animate-bounce">
                    <Check className="w-4 h-4" />
                    <span>Injected Code Updated Live!</span>
                  </span>
                )}
              </div>

              <div className="space-y-5">
                {/* HEAD CODE INJECTION */}
                <div className="space-y-2 p-5 rounded-2xl bg-purple-50/70 border border-purple-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-purple-900 uppercase tracking-wider block">
                      Header Code Injection (Inside &lt;head&gt; tag)
                    </label>
                    <span className="text-[9px] bg-purple-100 text-purple-700 font-mono px-2 py-0.5 rounded font-bold">
                      &lt;head&gt; Section
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 leading-normal">
                    This code will be placed dynamically inside the HTML <code>&lt;head&gt;</code> element. Perfect for ownership verification meta tags (like Google Search Console, or Ad Networks verification), custom stylesheets, and preconnect scripts.
                  </p>
                  <textarea 
                    rows={8}
                    value={customHeadCode}
                    onChange={(e) => setCustomHeadCode(e.target.value)}
                    placeholder="e.g. <meta name='google-site-verification' content='...' />"
                    className="w-full p-3 rounded-xl border border-purple-200 bg-white text-xs font-mono focus:outline-none focus:border-purple-500 shadow-sm leading-relaxed"
                  />
                  <div className="flex items-center justify-between text-[10px] text-gray-400">
                    <span>Supports HTML elements like &lt;meta&gt;, &lt;link&gt;, &lt;script&gt;, &lt;style&gt;</span>
                    <span>Length: {customHeadCode.length} chars</span>
                  </div>
                </div>

                {/* BODY CODE INJECTION */}
                <div className="space-y-2 p-5 rounded-2xl bg-purple-50/70 border border-purple-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-purple-900 uppercase tracking-wider block">
                      Body Code Injection (Directly after &lt;body&gt; opens)
                    </label>
                    <span className="text-[9px] bg-purple-100 text-purple-700 font-mono px-2 py-0.5 rounded font-bold">
                      &lt;body&gt; Section
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 leading-normal">
                    This code will be injected dynamically at the beginning of the <code>&lt;body&gt;</code> element. Best for ad loading scripts, tag managers, tracking pixels (like Facebook Pixel), or custom banner notices.
                  </p>
                  <textarea 
                    rows={8}
                    value={customBodyCode}
                    onChange={(e) => setCustomBodyCode(e.target.value)}
                    placeholder="e.g. <!-- Ad network scripts or custom tags -->"
                    className="w-full p-3 rounded-xl border border-purple-200 bg-white text-xs font-mono focus:outline-none focus:border-purple-500 shadow-sm leading-relaxed"
                  />
                  <div className="flex items-center justify-between text-[10px] text-gray-400">
                    <span>Supports HTML tags, script scripts, div elements, etc.</span>
                    <span>Length: {customBodyCode.length} chars</span>
                  </div>
                </div>

                {/* GOOGLE ADSENSE INTEGRATION */}
                <div className="space-y-4 p-5 rounded-2xl bg-purple-50/70 border border-purple-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Globe className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <label className="text-xs font-black text-purple-900 uppercase tracking-wider block">
                          Google AdSense Integration Layout
                        </label>
                        <p className="text-[10px] text-gray-500">
                          Activate AdSense layout-optimized placeholders to earn revenue.
                        </p>
                      </div>
                    </div>
                    
                    {/* Toggle Switch */}
                    <button
                      onClick={() => setEnableAdSense(!enableAdSense)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${enableAdSense ? "bg-purple-600" : "bg-gray-300"}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enableAdSense ? "translate-x-6" : "translate-x-1"}`}
                      />
                    </button>
                  </div>

                  {enableAdSense && (
                    <div className="p-3 bg-purple-100/50 rounded-xl text-[10px] text-purple-950 border border-purple-200/50 space-y-1">
                      <p className="font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                        AdSense Layout Active!
                      </p>
                      <p className="text-gray-600 leading-normal">
                        Optimized, high-converting advertisement placeholders will be rendered on key positions (Sidebar, Article Top, Feed Footer) labeled as "Advertisement" to guarantee full compliance with Google Publisher Policies.
                      </p>
                    </div>
                  )}
                </div>

                {/* ADS.TXT CUSTOMIZER */}
                <div className="space-y-2 p-5 rounded-2xl bg-purple-50/70 border border-purple-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-purple-900 uppercase tracking-wider block">
                      ads.txt Content (Publisher Authorization)
                    </label>
                    <a 
                      href="/ads.txt" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[9px] bg-purple-100 hover:bg-purple-200 text-purple-700 font-bold px-2 py-0.5 rounded transition-colors flex items-center gap-0.5"
                    >
                      <span>View Live ads.txt</span>
                      <Globe className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-[10px] text-gray-500 leading-normal">
                    Authorized Digital Sellers (ads.txt) is a Google-mandated protocol to secure your ad revenue. Add your publisher ID below to authorize your site.
                  </p>
                  <textarea 
                    rows={4}
                    value={adsTxt}
                    onChange={(e) => setAdsTxt(e.target.value)}
                    placeholder="google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0"
                    className="w-full p-3 rounded-xl border border-purple-200 bg-white text-xs font-mono focus:outline-none focus:border-purple-500 shadow-sm leading-relaxed"
                  />
                  <div className="flex items-center gap-1.5 text-[9px] text-gray-400">
                    <AlertCircle className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span>Format: <code>domain, publisher-id, status, cert-authority-id</code> (e.g. google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0)</span>
                  </div>
                </div>

                {/* Save button */}
                <button 
                  onClick={handleSaveCustomCode}
                  disabled={loading}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-3 rounded-2xl cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-purple-100 active:scale-95 transition-transform font-bold"
                >
                  <Save className="w-4 h-4" />
                  <span>{loading ? "Injecting Live Codes..." : "Save Code Injection Setup"}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB: AI ARTICLE ENGINE */}
          {activeTab === "aiArticle" && (
            <div className="space-y-6 animate-in fade-in duration-200" id="tab-ai-article-content">
              <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                <div>
                  <h3 className="text-xs font-black text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span>AI Article Generation & Automated System</span>
                  </h3>
                  <p className="text-[10px] text-gray-500">
                    Deploy AI writers to scan market trends and publish elite Q&A tech articles with custom visuals and metadata.
                  </p>
                </div>
              </div>

              {/* Options Selector Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Option 1 Card */}
                <div 
                  onClick={() => setAiOption("manual")}
                  className={`p-5 rounded-3xl border transition-all cursor-pointer text-left ${
                    aiOption === "manual" 
                      ? "border-purple-500 bg-purple-50/50 shadow-md ring-2 ring-purple-100" 
                      : "border-gray-100 bg-white hover:bg-gray-50/50"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${aiOption === "manual" ? "border-purple-600 bg-purple-600" : "border-gray-300"}`}>
                      {aiOption === "manual" && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </span>
                    <h4 className="text-xs font-black text-purple-950 uppercase tracking-widest">Option 1: Selective Category Engine</h4>
                  </div>
                  <p className="text-[10px] text-gray-500 leading-relaxed pl-6">
                    Pick a specific category and publish date. The AI writer will generate a comprehensive, professional English Q&A article centering exactly on this technology sector.
                  </p>
                </div>

                {/* Option 2 Card */}
                <div 
                  onClick={() => setAiOption("auto")}
                  className={`p-5 rounded-3xl border transition-all cursor-pointer text-left ${
                    aiOption === "auto" 
                      ? "border-purple-500 bg-purple-50/50 shadow-md ring-2 ring-purple-100" 
                      : "border-gray-100 bg-white hover:bg-gray-50/50"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${aiOption === "auto" ? "border-purple-600 bg-purple-600" : "border-gray-300"}`}>
                      {aiOption === "auto" && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </span>
                    <h4 className="text-xs font-black text-purple-950 uppercase tracking-widest flex items-center gap-1.5">
                      <span>Option 2: Trend Scan "Auto System"</span>
                      <span className="text-[8px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-black">RECOMMENDED</span>
                    </h4>
                  </div>
                  <p className="text-[10px] text-gray-500 leading-relaxed pl-6">
                    The AI system dynamically scans active market trends for hot, elite science/tech categories, identifies the best fit, and auto-generates sophisticated Q&A articles.
                  </p>
                </div>
              </div>

              {/* Form Controls based on selection */}
              <div className="p-6 bg-white border border-purple-100 rounded-3xl space-y-4 text-left">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Category select (Only enabled for Manual Option 1) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">
                      Target Category {aiOption === "auto" && <span className="text-gray-400 font-normal italic">(Auto trend-determined)</span>}
                    </label>
                    <select
                      disabled={aiOption === "auto"}
                      value={aiSelectedCategory}
                      onChange={(e) => setAiSelectedCategory(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-purple-200 bg-white text-xs text-purple-950 focus:outline-none focus:border-purple-500 disabled:bg-gray-50 disabled:text-gray-400 animate-none"
                    >
                      <option value="">-- Choose Category --</option>
                      {categories.map((cat: any) => (
                        <option key={cat.id || cat.name} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Scheduling (Publish Time) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">
                      Select Publish Time <span className="text-gray-400 font-normal">(Leave empty for instant release)</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={aiPublishTime}
                      onChange={(e) => setAiPublishTime(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-purple-200 bg-white text-xs text-purple-950 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* Error and Success message */}
                {aiErrorMessage && (
                  <div className="p-3 bg-red-50 text-red-800 rounded-xl border border-red-100 text-xs font-semibold">
                    ✕ {aiErrorMessage}
                  </div>
                )}
                {aiSuccessMessage && (
                  <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100 text-xs font-semibold">
                    ✓ {aiSuccessMessage}
                  </div>
                )}

                {/* Submit button / Generating Animation */}
                {aiGenerationLoading ? (
                  <div className="space-y-3 p-4 bg-purple-50/50 border border-purple-100 rounded-2xl">
                    <div className="flex items-center justify-between text-xs font-bold text-purple-950">
                      <span className="flex items-center gap-1.5 animate-pulse">
                        <Sparkles className="w-4 h-4 text-purple-600 animate-spin" />
                        {aiGenerationStep === 0 && "Scanning server assets & establishing environment..."}
                        {aiGenerationStep === 1 && `Deep researching Category: ${aiOption === "manual" ? aiSelectedCategory : "Trending Tech Market"}...`}
                        {aiGenerationStep === 2 && "Designing advanced outline and formulating Q&A architecture..."}
                        {aiGenerationStep === 3 && "Invoking Gemini-3.5-Flash to craft professional-grade English..."}
                        {aiGenerationStep === 4 && "Validating green highlights of Question elements and structure..."}
                        {aiGenerationStep === 5 && "Generating optimal contextual Unsplash imagery & tags..."}
                        {aiGenerationStep === 6 && "Article compiled successfully! Injecting components..."}
                      </span>
                      <span>{Math.round((aiGenerationStep / 6) * 100)}%</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-2.5 bg-purple-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-1000 ease-out"
                        style={{ width: `${(aiGenerationStep / 6) * 100}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleGenerateAiArticle}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-1.5 shadow-lg shadow-purple-100 cursor-pointer active:scale-95 transition-all font-bold"
                  >
                    <Sparkles className="w-4 h-4 animate-bounce" />
                    <span>{aiOption === "manual" ? "Generate Selective AI Article" : "Trigger Trend Scan & Auto Post"}</span>
                  </button>
                )}
              </div>

              {/* Article Preview & Editor Section */}
              {aiGeneratedArticle && (
                <div className="bg-purple-50/30 border border-purple-100 p-6 rounded-3xl space-y-6 text-left animate-in zoom-in-95 duration-200">
                  <div className="border-b border-purple-100 pb-3">
                    <h3 className="text-xs font-black text-purple-900 uppercase tracking-widest flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4" />
                      <span>Review & Customize Generated Article</span>
                    </h3>
                    <p className="text-[10px] text-gray-500">
                      Tweak the generated text, replace the thumbnail image, or add/edit Q&A blocks before committing.
                    </p>
                  </div>

                  {/* Thumbnail / Image preview */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 space-y-3">
                      <p className="text-[10px] font-black text-purple-900 uppercase tracking-wider block">Generated Article Thumbnail</p>
                      <div className="aspect-video w-full rounded-2xl overflow-hidden border border-purple-100 shadow-sm relative group bg-black">
                        <img 
                          src={aiGeneratedArticle.thumbnailUrl} 
                          alt="AI Thumbnail" 
                          className="w-full h-full object-cover opacity-90"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-purple-900 uppercase tracking-wider block">Replace Image (URL)</label>
                        <input
                          type="url"
                          value={aiGeneratedArticle.thumbnailUrl}
                          onChange={(e) => setAiGeneratedArticle({ ...aiGeneratedArticle, thumbnailUrl: e.target.value })}
                          className="w-full p-2 rounded-xl border border-purple-200 bg-white text-xs font-mono"
                          placeholder="Paste image URL here..."
                        />
                      </div>
                    </div>

                    {/* Metadata Editors */}
                    <div className="md:col-span-2 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">Title</label>
                          <input
                            type="text"
                            value={aiGeneratedArticle.title}
                            onChange={(e) => setAiGeneratedArticle({ ...aiGeneratedArticle, title: e.target.value })}
                            className="w-full p-2 rounded-xl border border-purple-200 bg-white text-xs font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">Tagline / Subtitle</label>
                          <input
                            type="text"
                            value={aiGeneratedArticle.tagline}
                            onChange={(e) => setAiGeneratedArticle({ ...aiGeneratedArticle, tagline: e.target.value })}
                            className="w-full p-2 rounded-xl border border-purple-200 bg-white text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">Category</label>
                          <input
                            type="text"
                            value={aiGeneratedArticle.category}
                            onChange={(e) => setAiGeneratedArticle({ ...aiGeneratedArticle, category: e.target.value })}
                            className="w-full p-2 rounded-xl border border-purple-200 bg-white text-xs"
                          />
                        </div>
                        <div className="space-y-1 col-span-2">
                          <label className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">Keywords / Tags (comma separated)</label>
                          <input
                            type="text"
                            value={aiGeneratedArticle.tags ? aiGeneratedArticle.tags.join(", ") : ""}
                            onChange={(e) => setAiGeneratedArticle({ ...aiGeneratedArticle, tags: e.target.value.split(",").map(t => t.trim().toLowerCase()).filter(Boolean) })}
                            className="w-full p-2 rounded-xl border border-purple-200 bg-white text-xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">Excerpt Summary</label>
                        <textarea
                          rows={2}
                          value={aiGeneratedArticle.excerpt}
                          onChange={(e) => setAiGeneratedArticle({ ...aiGeneratedArticle, excerpt: e.target.value })}
                          className="w-full p-2 rounded-xl border border-purple-200 bg-white text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Body Content Editor */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">Article Markdown Body (with Green Q&A div tags)</label>
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold font-mono">Q&A STYLE ACTIVE</span>
                    </div>
                    <textarea
                      rows={14}
                      value={aiGeneratedArticle.content}
                      onChange={(e) => setAiGeneratedArticle({ ...aiGeneratedArticle, content: e.target.value })}
                      className="w-full p-4 rounded-2xl border border-purple-200 bg-white text-xs font-mono focus:outline-none focus:border-purple-500 leading-relaxed"
                    />
                    <div className="flex items-center justify-between text-[10px] text-gray-400">
                      <span>Note: Questions are formatted in green highlights using <code>&lt;div class="p-4 bg-emerald-50 border-l-4 border-emerald-500..."&gt;</code></span>
                      <span>Length: {aiGeneratedArticle.content ? aiGeneratedArticle.content.split(/\s+/).length : 0} words</span>
                    </div>
                  </div>

                  {/* Publish & Tweak Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
                    <button
                      onClick={() => {
                        // Tweak: Add a new element/section dynamically
                        if (!aiGeneratedArticle) return;
                        const defaultQaBlock = `\n\n<div class="p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-xl text-emerald-900 font-bold my-4">Q: Enter your custom advanced question here?</div>\n\nWrite your sophisticated professional explanation answer text here. You can add extra paragraphs as needed.`;
                        setAiGeneratedArticle({
                          ...aiGeneratedArticle,
                          content: aiGeneratedArticle.content + defaultQaBlock
                        });
                      }}
                      className="py-3 bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Custom Q&A Block</span>
                    </button>

                    <button
                      onClick={handleSaveAiArticle}
                      disabled={loading}
                      className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-100 cursor-pointer transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      <span>{loading ? "Publishing AI Post..." : "Save & Publish Article to Website"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
