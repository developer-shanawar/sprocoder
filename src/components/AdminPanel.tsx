import React, { useState, useEffect } from "react";
import { 
  Users, BookOpen, Layers, MessageSquare, Settings, 
  Plus, Edit, Trash2, Heart, Bookmark, Eye, FileText, Upload, Save, Check, RefreshCw 
} from "lucide-react";
import { db, DB_PATHS } from "../firebase";
import { ref, set, push, remove, get, update, onValue } from "firebase/database";
import { BlogPost, UserAccount, ContactMessage } from "../types";

interface AdminPanelProps {
  onClose: () => void;
  categories: string[];
  setCategories: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function AdminPanel({ onClose, categories, setCategories }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<"users" | "articles" | "categories" | "messages" | "pages">("articles");
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
      const response = await fetch("https://api.imgbb.com/1/upload?key=95bfa2c260a52e93433daf349259e043", {
        method: "POST",
        body: formData,
      });

      const resJson = await response.json();
      if (resJson && resJson.success) {
        setThumbnailUrl(resJson.data.url);
      } else {
        setUploadError("ImgBB upload failed or limit reached.");
      }
    } catch (err) {
      console.error(err);
      setUploadError("Failed to communicate with ImgBB API.");
    } finally {
      setIsUploading(false);
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

      const articlePayload: BlogPost = {
        id: articleId as string,
        title: title.trim(),
        tagline: tagline.trim() || "A technical deep dive from S pro coder",
        category,
        content: content.trim(),
        readTime: `${Math.max(1, Math.ceil(content.split(/\s+/).length / 200))} min read`,
        tags: [category.toLowerCase(), "tech", "coding"],
        excerpt: tagline.trim() || content.trim().slice(0, 150) + "...",
        author: "Admin - S pro coder",
        date: editingArticle?.date || new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
        likes: likes || 0,
        savesCount: savesCount || 0,
        thumbnailUrl: finalThumbnail,
        comments: editingArticle?.comments || []
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

  return (
    <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-md overflow-y-auto p-4 md:p-8 flex items-start justify-center">
      <div className="bg-white/95 rounded-[36px] w-full max-w-5xl border border-white shadow-2xl p-6 md:p-8 space-y-6 text-purple-950 animate-in fade-in zoom-in duration-300" id="admin-panel-container">
        
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
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full border border-purple-200 text-xs font-bold hover:bg-purple-100 active:scale-95 transition-all text-purple-800 cursor-pointer"
            id="admin-close-btn"
          >
            Exit Control Deck ✕
          </button>
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
                    Article Content (Markdown format supported)
                  </label>
                  <textarea 
                    rows={6}
                    required
                    placeholder="## The Renaissance of AI Tools... Use Markdown for formatting, subheadings, code snippets."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full p-3 rounded-xl border border-purple-200 bg-white text-xs font-mono focus:outline-none focus:border-purple-500"
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
              <div className="flex items-center justify-between border-b border-purple-100 pb-2">
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

        </div>

      </div>
    </div>
  );
}
