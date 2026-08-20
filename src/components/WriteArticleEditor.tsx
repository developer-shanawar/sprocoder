import React, { useState, useEffect } from "react";
import { 
  Bold, Italic, Heading1, Heading2, Heading3, List, Quote, Image as ImageIcon, 
  Save, Eye, Edit3, Send, CheckCircle2, AlertCircle, RefreshCw, Globe, Tag, Clock, BookOpen, Lock, Calendar
} from "lucide-react";
import { runArticleFormatterBot } from "../utils/articleFormatterBot";
import { BlogPost, UserAccount } from "../types";
import { db, DB_PATHS } from "../firebase";
import { ref, push, set, update } from "firebase/database";

interface WriteArticleEditorProps {
  currentUser: UserAccount | null;
  initialArticle?: BlogPost | null;
  allCategories?: string[];
  onArticlePublished?: (post: BlogPost) => void;
  onCancel?: () => void;
}

export default function WriteArticleEditor({
  currentUser,
  initialArticle = null,
  allCategories = [],
  onArticlePublished,
  onCancel
}: WriteArticleEditorProps) {
  const [title, setTitle] = useState(initialArticle?.title || "");
  const [tagline, setTagline] = useState(initialArticle?.tagline || "");
  const [category, setCategory] = useState(initialArticle?.category || (allCategories && allCategories[0]) || "Technology");
  const [content, setContent] = useState(initialArticle?.content || "");
  const [thumbnailUrl, setThumbnailUrl] = useState(initialArticle?.thumbnailUrl || "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80");
  const [tagsInput, setTagsInput] = useState(initialArticle?.tags ? initialArticle.tags.join(", ") : "AI, WebDev, Programming");
  const [excerpt, setExcerpt] = useState(initialArticle?.excerpt || "");
  const [fontSize, setFontSize] = useState<"normal" | "large" | "extra-large">("large");
  const [visibility, setVisibility] = useState<"public" | "private">(initialArticle?.visibility || "public");
  const [publishStatus, setPublishStatus] = useState<"direct" | "scheduled">(initialArticle?.publishStatus || "direct");
  const [scheduledDate, setScheduledDate] = useState(initialArticle?.scheduledDate || "");

  // Update states whenever initialArticle changes
  useEffect(() => {
    if (initialArticle) {
      setTitle(initialArticle.title || "");
      setTagline(initialArticle.tagline || "");
      setCategory(initialArticle.category || "Technology");
      setContent(initialArticle.content || "");
      setThumbnailUrl(initialArticle.thumbnailUrl || "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80");
      setTagsInput(initialArticle.tags ? initialArticle.tags.join(", ") : "");
      setExcerpt(initialArticle.excerpt || "");
      setVisibility(initialArticle.visibility || "public");
      setPublishStatus(initialArticle.publishStatus || "direct");
      setScheduledDate(initialArticle.scheduledDate || "");
    }
  }, [initialArticle]);

  // Mode: Editor vs Preview
  const [activeView, setActiveView] = useState<"edit" | "preview">("edit");
  const [isBotFormatting, setIsBotFormatting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Combine default categories with passed categories list to make sure all created domains/sections show up
  const defaultCategories = [
    "Technology",
    "Artificial Intelligence",
    "AI Tools",
    "Games",
    "Coding",
    "AI & Machine Learning",
    "Web Development",
    "Cloud Architecture",
    "Cybersecurity",
    "DevOps & Systems",
    "Mobile Development",
    "Database Systems",
    "Programming Tutorials"
  ];
  const categoriesList = Array.from(new Set([...allCategories, ...defaultCategories])).filter(Boolean);

  // ImgBB upload handler
  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatusMsg(null);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("https://api.imgbb.com/1/upload?key=95bfa2c260a52e93433daf349259e043", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.success && data.data?.url) {
        setThumbnailUrl(data.data.url);
        setStatusMsg({ type: "success", text: "Image uploaded and set as main header image!" });
      }
    } catch (err) {
      setStatusMsg({ type: "error", text: "Failed to upload image to ImgBB." });
    }
  };

  // Run Auto Formatting Bot
  const handleRunBotFormat = () => {
    if (!title.trim() && !content.trim()) {
      setStatusMsg({ type: "error", text: "Please enter a title or content before running the Auto-Format Bot." });
      return;
    }

    setIsBotFormatting(true);
    setStatusMsg(null);

    setTimeout(() => {
      const parsedTags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
      const authorName = currentUser ? currentUser.name : (initialArticle?.author || "S Pro Coder");

      const botResult = runArticleFormatterBot({
        title,
        tagline,
        category,
        content,
        author: authorName,
        thumbnailUrl,
        tags: parsedTags,
        excerpt
      });

      setTitle(botResult.formattedTitle);
      setTagline(botResult.formattedTagline);
      setContent(botResult.formattedContent);
      setExcerpt(botResult.excerpt);

      setIsBotFormatting(false);
      setStatusMsg({ 
        type: "success", 
        text: `🤖 Article Formatter Bot successfully adjusted sentences, standardized headings, calculated read time (${botResult.readTime}), and generated Google Schema.org markup!` 
      });
    }, 400);
  };

  // Helper formatting insert
  const insertFormatting = (prefix: string, suffix: string = "") => {
    const textarea = document.getElementById("article-content-editor") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end) || "Sample Text";

    const replacement = `${prefix}${selectedText}${suffix}`;
    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
  };

  // Publish / Update Article
  const handlePublishArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setStatusMsg({ type: "error", text: "Please provide both an article title and content." });
      return;
    }

    if (publishStatus === "scheduled" && !scheduledDate) {
      setStatusMsg({ type: "error", text: "Please select a scheduled date and time in Pakistan Time (PKT)." });
      return;
    }

    setIsPublishing(true);
    setStatusMsg(null);

    try {
      const parsedTags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
      const authorName = currentUser ? currentUser.name : (initialArticle?.author || "S Pro Coder");

      // Always run Bot before finalizing publish to ensure perfect formatting
      const botResult = runArticleFormatterBot({
        title,
        tagline,
        category,
        content,
        author: authorName,
        thumbnailUrl,
        tags: parsedTags,
        excerpt
      });

      let articleId = initialArticle?.id;
      let targetRef;

      if (articleId) {
        targetRef = ref(db, `${DB_PATHS.ARTICLES}/${articleId}`);
      } else {
        const newArtRef = push(ref(db, DB_PATHS.ARTICLES));
        articleId = newArtRef.key || "art_" + Date.now();
        targetRef = newArtRef;
      }

      const isScheduled = publishStatus === "scheduled" && scheduledDate;
      // If scheduled, initial visibility is private until scheduled time passes (or published automatically by background timer)
      const finalVisibility = isScheduled ? "private" : visibility;

      const postData: BlogPost = {
        id: articleId,
        title: botResult.formattedTitle,
        tagline: botResult.formattedTagline,
        category: category,
        content: botResult.formattedContent,
        excerpt: botResult.excerpt,
        readTime: botResult.readTime,
        tags: parsedTags,
        author: authorName,
        date: initialArticle?.date || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        likes: initialArticle?.likes || 0,
        savesCount: initialArticle?.savesCount || 0,
        views: initialArticle?.views || 1,
        feedViews: initialArticle?.feedViews || 0,
        articleViews: initialArticle?.articleViews || 0,
        thumbnailUrl: thumbnailUrl || "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
        seoFormatted: true,
        metaDescription: botResult.metaDescription,
        keywords: botResult.keywords,
        schemaMarkup: botResult.schemaMarkup,
        canonicalUrl: botResult.canonicalUrl,
        visibility: finalVisibility,
        publishStatus: publishStatus,
        scheduledDate: scheduledDate
      };

      await set(targetRef, postData);

      const msgText = initialArticle 
        ? "🎉 Article updated successfully and re-indexed for Google Search!" 
        : (isScheduled 
            ? `⏰ Article scheduled successfully for ${new Date(scheduledDate).toLocaleString()} (Pakistan Time - PKT)!` 
            : "🎉 Article published live successfully!");

      setStatusMsg({ type: "success", text: msgText });
      
      if (onArticlePublished) {
        onArticlePublished(postData);
      }

      if (!initialArticle) {
        // Reset form for fresh article
        setTitle("");
        setTagline("");
        setContent("");
        setExcerpt("");
      }
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: "error", text: err.message || "Failed to save article." });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300 pb-16" id="write-article-page-container">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 p-6 rounded-3xl text-white shadow-xl">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-purple-300 bg-white/10 px-3 py-1 rounded-full inline-block mb-2">
            {initialArticle ? "Editing Existing Article" : "Separate Article Studio"}
          </span>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Edit3 className="w-6 h-6 text-purple-400" />
            <span>{initialArticle ? `Editing: ${initialArticle.title}` : "Write & Publish New Article"}</span>
          </h1>
          <p className="text-xs text-purple-200 mt-1">
            Publish high-quality tech tutorials, insights, and AI documentation formatted for Google SEO & crawling standards.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="bg-white/10 p-1 rounded-2xl flex items-center">
            <button
              onClick={() => setActiveView("edit")}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeView === "edit" ? "bg-white text-purple-950 shadow-sm" : "text-purple-200 hover:text-white"
              }`}
            >
              Editor View
            </button>
            <button
              onClick={() => setActiveView("preview")}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeView === "preview" ? "bg-white text-purple-950 shadow-sm" : "text-purple-200 hover:text-white"
              }`}
            >
              Live Preview
            </button>
          </div>

          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Notification Banner */}
      {statusMsg && (
        <div className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between animate-in fade-in ${
          statusMsg.type === "success" 
            ? "bg-emerald-50 text-emerald-900 border border-emerald-200" 
            : "bg-red-50 text-red-900 border border-red-200"
        }`}>
          <div className="flex items-center gap-2">
            {statusMsg.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />}
            <span>{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="text-xs opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Main Studio Body */}
      {activeView === "edit" ? (
        <form onSubmit={handlePublishArticle} className="space-y-6">
          
          {/* Form Meta Section */}
          <div className="bg-white/80 backdrop-blur-md border border-purple-100 rounded-3xl p-6 shadow-sm space-y-4">
            
            {/* Title Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-purple-950 uppercase tracking-wider block">
                Article Main Title
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Building High-Performance Microservices with Node.js & Redis"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-lg sm:text-xl font-black p-4 rounded-2xl border border-purple-200 bg-purple-50/20 text-purple-950 focus:outline-none focus:border-purple-600 focus:bg-white transition-all"
              />
            </div>

            {/* Tagline / Subtitle */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-purple-950 uppercase tracking-wider block">
                Tagline / Subtitle
              </label>
              <input
                type="text"
                placeholder="A comprehensive breakdown of enterprise caching patterns and distributed systems."
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full p-3 rounded-2xl border border-purple-100 bg-white text-xs font-semibold text-purple-950 focus:outline-none focus:border-purple-600"
              />
            </div>

            {/* Category & Tags Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-purple-950 uppercase tracking-wider block">
                  Category Domain / Section
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-3 rounded-2xl border border-purple-100 bg-white text-xs font-bold text-purple-950 focus:outline-none focus:border-purple-600 cursor-pointer"
                >
                  {categoriesList.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-purple-950 uppercase tracking-wider block">
                  SEO Tags (Comma Separated)
                </label>
                <input
                  type="text"
                  placeholder="NodeJS, Redis, WebDev, Backend"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full p-3 rounded-2xl border border-purple-100 bg-white text-xs font-bold text-purple-950 focus:outline-none focus:border-purple-600"
                />
              </div>
            </div>

            {/* Visibility & Publishing Options Block */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              
              {/* Public / Private Option */}
              <div className="p-4 bg-purple-50/70 border border-purple-100 rounded-2xl space-y-2">
                <label className="text-xs font-black text-purple-950 uppercase tracking-wider block flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-purple-600" />
                  <span>Article Visibility</span>
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-xs text-purple-950 font-bold cursor-pointer">
                    <input 
                      type="radio" 
                      name="studioVisibility" 
                      value="public" 
                      checked={visibility === "public"} 
                      onChange={() => setVisibility("public")} 
                      className="text-purple-600 focus:ring-purple-500" 
                    />
                    <span className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-purple-200 shadow-sm">
                      <Globe className="w-3.5 h-3.5 text-emerald-600" />
                      Public
                    </span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-purple-950 font-bold cursor-pointer">
                    <input 
                      type="radio" 
                      name="studioVisibility" 
                      value="private" 
                      checked={visibility === "private"} 
                      onChange={() => setVisibility("private")} 
                      className="text-purple-600 focus:ring-purple-500" 
                    />
                    <span className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-purple-200 shadow-sm">
                      <Lock className="w-3.5 h-3.5 text-rose-600" />
                      Private
                    </span>
                  </label>
                </div>
                <p className="text-[10px] text-gray-500">
                  Public articles are live for all readers. Private articles are saved in your control deck only.
                </p>
              </div>

              {/* Direct Publish vs Schedule */}
              <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-2">
                <label className="text-xs font-black text-indigo-950 uppercase tracking-wider block flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span>Publishing Schedule Flow</span>
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-xs text-indigo-950 font-bold cursor-pointer">
                    <input 
                      type="radio" 
                      name="studioPublishStatus" 
                      value="direct" 
                      checked={publishStatus === "direct"} 
                      onChange={() => setPublishStatus("direct")} 
                      className="text-indigo-600 focus:ring-indigo-500" 
                    />
                    <span>Direct Publish</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-indigo-950 font-bold cursor-pointer">
                    <input 
                      type="radio" 
                      name="studioPublishStatus" 
                      value="scheduled" 
                      checked={publishStatus === "scheduled"} 
                      onChange={() => setPublishStatus("scheduled")} 
                      className="text-indigo-600 focus:ring-indigo-500" 
                    />
                    <span>Schedule Date & Time</span>
                  </label>
                </div>

                {publishStatus === "scheduled" && (
                  <div className="space-y-1 pt-1 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-indigo-900 uppercase shrink-0">Publish Time:</span>
                      <input 
                        type="datetime-local" 
                        required={publishStatus === "scheduled"} 
                        value={scheduledDate} 
                        onChange={(e) => setScheduledDate(e.target.value)} 
                        className="w-full px-3 py-1.5 rounded-lg border border-indigo-200 bg-white text-xs focus:outline-none focus:border-indigo-500 font-mono" 
                      />
                    </div>
                    <p className="text-[10px] text-indigo-700 font-bold flex items-center gap-1 mt-1">
                      <span>🇵🇰 Timezone:</span>
                      <span className="underline">Pakistan Standard Time (PKT - UTC+5)</span>
                    </p>
                  </div>
                )}
              </div>

            </div>

            {/* Thumbnail Image URL & Upload */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-purple-950 uppercase tracking-wider block">
                Header Cover Image URL or Direct Upload
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/..."
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  className="flex-1 w-full p-3 rounded-2xl border border-purple-100 bg-white text-xs font-mono text-purple-950 focus:outline-none focus:border-purple-600"
                />
                
                <label className="px-4 py-3 bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-xs rounded-2xl cursor-pointer transition-colors flex items-center gap-1.5 shrink-0">
                  <ImageIcon className="w-4 h-4 text-purple-600" />
                  <span>Upload Image</span>
                  <input type="file" accept="image/*" onChange={handleUploadImage} className="hidden" />
                </label>
              </div>
            </div>

          </div>

          {/* Large Format Editor Box */}
          <div className="bg-white border border-purple-100 rounded-3xl p-6 shadow-sm space-y-4">
            
            {/* Toolbar Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-100 pb-3">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => insertFormatting("**", "**")}
                  className="p-2 rounded-xl hover:bg-purple-50 text-purple-900 font-bold text-xs cursor-pointer"
                  title="Bold Text"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting("*", "*")}
                  className="p-2 rounded-xl hover:bg-purple-50 text-purple-900 text-xs cursor-pointer"
                  title="Italic Text"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <div className="w-px h-5 bg-purple-200 mx-1" />
                <button
                  type="button"
                  onClick={() => insertFormatting("## ")}
                  className="p-2 rounded-xl hover:bg-purple-50 text-purple-900 text-xs font-bold cursor-pointer"
                  title="Heading 2"
                >
                  <Heading2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting("### ")}
                  className="p-2 rounded-xl hover:bg-purple-50 text-purple-900 text-xs font-bold cursor-pointer"
                  title="Heading 3"
                >
                  <Heading3 className="w-4 h-4" />
                </button>
                <div className="w-px h-5 bg-purple-200 mx-1" />
                <button
                  type="button"
                  onClick={() => insertFormatting("- ")}
                  className="p-2 rounded-xl hover:bg-purple-50 text-purple-900 text-xs cursor-pointer"
                  title="Bullet List"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting("> ")}
                  className="p-2 rounded-xl hover:bg-purple-50 text-purple-900 text-xs cursor-pointer"
                  title="Blockquote"
                >
                  <Quote className="w-4 h-4" />
                </button>
              </div>

              {/* Formatter Bot & Font Size Control */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-purple-50 p-1 rounded-xl">
                  <span className="text-[10px] font-bold text-purple-600 px-2 uppercase">Text Size:</span>
                  {(["normal", "large", "extra-large"] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setFontSize(sz)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                        fontSize === sz ? "bg-purple-900 text-white" : "text-purple-900 hover:bg-purple-100"
                      }`}
                    >
                      {sz === "normal" ? "1x" : sz === "large" ? "1.25x" : "1.5x"}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleRunBotFormat}
                  disabled={isBotFormatting}
                  className="px-4 py-2 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-black text-xs rounded-xl shadow cursor-pointer transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 text-purple-200 ${isBotFormatting ? "animate-spin" : ""}`} />
                  <span>{isBotFormatting ? "Formatting..." : "Format Article"}</span>
                </button>
              </div>
            </div>

            {/* Large Format Textarea */}
            <div className="space-y-1.5">
              <textarea
                id="article-content-editor"
                required
                rows={18}
                placeholder="Write your article in Markdown or plain text here... Use ## for section headings and - for bullet points."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className={`w-full p-4 rounded-2xl border border-purple-100 bg-white text-purple-950 font-sans focus:outline-none focus:border-purple-600 leading-relaxed ${
                  fontSize === "normal" ? "text-sm" : fontSize === "large" ? "text-base" : "text-lg font-medium"
                }`}
              />
            </div>
          </div>

          {/* Submit Action Bar */}
          <div className="flex items-center justify-between bg-white border border-purple-100 p-6 rounded-3xl shadow-sm">
            <button
              type="button"
              onClick={handleRunBotFormat}
              className="px-4 py-2.5 bg-purple-100 hover:bg-purple-200 text-purple-950 font-bold text-xs rounded-2xl cursor-pointer transition-colors flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-purple-600" />
              <span>Auto-Format Standards</span>
            </button>

            <button
              type="submit"
              disabled={isPublishing}
              className="px-8 py-3 bg-gradient-to-r from-purple-800 via-indigo-800 to-purple-950 hover:from-purple-900 hover:to-slate-950 text-white font-black text-sm rounded-2xl shadow-lg cursor-pointer transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isPublishing ? "Saving..." : (initialArticle ? "Update & Save Changes" : "Publish Article Live")}</span>
            </button>
          </div>

        </form>
      ) : (
        /* PREVIEW MODE */
        <div className="bg-white border border-purple-100 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="space-y-3 border-b border-purple-100 pb-6">
            <span className="bg-purple-100 text-purple-900 font-bold text-xs px-3 py-1 rounded-full uppercase">
              {category}
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-purple-950 tracking-tight">{title || "Untitled Preview"}</h1>
            {tagline && <p className="text-lg text-gray-600 italic font-serif">{tagline}</p>}
            <div className="flex items-center gap-4 text-xs text-gray-400 font-mono">
              <span>Author: {currentUser ? currentUser.name : "S Pro Coder"}</span>
              <span>•</span>
              <span>Date: {new Date().toLocaleDateString()}</span>
            </div>
          </div>

          {thumbnailUrl && (
            <img src={thumbnailUrl} alt={title} className="w-full h-80 object-cover rounded-2xl border border-purple-100" />
          )}

          <div className="prose max-w-none text-purple-950 text-base leading-relaxed space-y-4">
            {content ? (
              content.split("\n\n").map((para, i) => {
                if (para.startsWith("## ")) {
                  return <h2 key={i} className="text-xl font-black text-purple-950 mt-6 mb-2 border-l-4 border-purple-600 pl-3">{para.replace("## ", "")}</h2>;
                }
                if (para.startsWith("### ")) {
                  return <h3 key={i} className="text-lg font-bold text-purple-900 mt-4 mb-2">{para.replace("### ", "")}</h3>;
                }
                if (para.startsWith("> ")) {
                  return <blockquote key={i} className="p-4 bg-purple-50 border-l-4 border-purple-600 text-purple-900 italic rounded-r-2xl my-4">{para.replace("> ", "")}</blockquote>;
                }
                return <p key={i}>{para}</p>;
              })
            ) : (
              <p className="text-gray-400 italic">No content typed yet.</p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

