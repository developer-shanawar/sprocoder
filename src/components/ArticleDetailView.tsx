import React, { useState, useEffect } from "react";
import { 
  Heart, 
  Bookmark, 
  Calendar, 
  Clock, 
  User, 
  MessageSquare, 
  Send, 
  ArrowLeft, 
  Eye, 
  X, 
  CornerDownRight,
  MessageCircle,
  Tag,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Award,
  Sparkles,
  Layers,
  Play
} from "lucide-react";
import { BlogPost, Comment, Course } from "../types";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import AdRenderer from "./AdRenderer";
import SprinkleConfetti from "./SprinkleConfetti";
import { slugify } from "../utils/slugify";
import { updateDocumentSeo } from "../utils/seo";
import { getRecommendedArticles, recordUserInterest } from "../utils/recommendations";

interface ArticleDetailViewProps {
  post: BlogPost;
  allPosts: BlogPost[];
  onSelectPost: (post: BlogPost) => void;
  onClose: () => void;
  onReturnToHome?: () => void;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onLike: () => void;
  isLiked: boolean;
  onAddComment: (commentText: string) => void;
  onAddReply: (commentId: string, replyText: string) => void;
  currentUser: any;
  adsConfig?: any;
  onSearchKeyword?: (keyword: string) => void;
  activeCourseContext?: { course: Course; lessonIndex: number } | null;
  onNavigateCourseLesson?: (direction: "next" | "prev") => void;
  onReturnToCourse?: () => void;
}

function decodeHtmlEntities(str: string): string {
  if (!str) return "";
  return str
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function preprocessArticleContent(rawContent: string): string {
  if (!rawContent) return "";
  let text = decodeHtmlEntities(rawContent);
  text = text.replace(/\\"/g, '"').replace(/\\'/g, "'");
  text = text.replace(/<mark\s+style="[^"]*">/gi, "<mark>");
  text = text.replace(/<mark\s+style='[^']*'>/gi, "<mark>");
  return text;
}

const CodeBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [copied, setCopied] = useState(false);

  const extractText = (node: any): string => {
    if (typeof node === "string") return node;
    if (Array.isArray(node)) return node.map(extractText).join("");
    if (node?.props?.children) return extractText(node.props.children);
    return "";
  };

  const handleCopy = () => {
    const text = extractText(children);
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="my-6 max-w-full rounded-2xl bg-[#0f172a] border border-slate-700 shadow-xl overflow-hidden group">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#1e293b] border-b border-slate-700/80 text-slate-200 text-xs font-mono select-none">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
          </div>
          <span className="text-[11px] font-extrabold text-slate-200 ml-2 tracking-wider uppercase">Source Code / Example</span>
        </div>
        <button
          onClick={handleCopy}
          type="button"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-[11px] font-bold transition-all cursor-pointer border border-slate-600 active:scale-95 shadow-xs"
        >
          {copied ? (
            <span className="text-emerald-400 font-extrabold">✓ Copied</span>
          ) : (
            <span className="text-slate-200 font-bold">Copy Code</span>
          )}
        </button>
      </div>

      <div className="p-4 sm:p-5 overflow-x-auto bg-[#0b1329]">
        <pre className="font-mono text-xs sm:text-sm text-emerald-300 font-semibold leading-relaxed whitespace-pre break-words max-w-full tracking-wide">
          {children}
        </pre>
      </div>
    </div>
  );
};

export default function ArticleDetailView({
  post,
  allPosts,
  onSelectPost,
  onClose,
  onReturnToHome,
  isBookmarked,
  onToggleBookmark,
  onLike,
  isLiked,
  onAddComment,
  onAddReply,
  currentUser,
  adsConfig = null,
  onSearchKeyword,
  activeCourseContext = null,
  onNavigateCourseLesson,
  onReturnToCourse
}: ArticleDetailViewProps) {
  const [newComment, setNewComment] = useState("");
  const [activeReplyCommentId, setActiveReplyCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [showCourseCompletedModal, setShowCourseCompletedModal] = useState<boolean>(true);

  // Extract unique keywords for interactive Keywords Box
  const keywordList = React.useMemo(() => {
    const set = new Set<string>();
    if (post.tags && Array.isArray(post.tags)) {
      post.tags.forEach((t) => {
        if (t && t.trim()) set.add(t.trim());
      });
    }
    if (post.keywords) {
      if (typeof post.keywords === "string") {
        post.keywords.split(",").forEach((k) => {
          if (k && k.trim()) set.add(k.trim());
        });
      } else if (Array.isArray(post.keywords)) {
        (post.keywords as string[]).forEach((k) => {
          if (k && k.trim()) set.add(k.trim());
        });
      }
    }
    return Array.from(set);
  }, [post]);

  // Dynamic SEO Update and User Interest Tracking on Article Mount / Change
  useEffect(() => {
    if (post) {
      recordUserInterest(post);
      updateDocumentSeo({
        title: post.title,
        description: post.metaDescription || post.excerpt || post.tagline,
        image: post.thumbnailUrl,
        url: `https://www.sprocoder.online/blog/${slugify(post.title)}`,
        category: post.category,
        date: post.date,
        author: post.author,
        tags: post.tags,
        type: "article"
      });
    }
  }, [post]);

  // Related / Recommended articles calculation (max 5)
  const relatedArticles = React.useMemo(() => {
    if (!allPosts || allPosts.length === 0) return [];
    return getRecommendedArticles(allPosts, post, 5);
  }, [allPosts, post]);

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    onAddComment(newComment.trim());
    setNewComment("");
  };

  const handleReplySubmit = (e: React.FormEvent, commentId: string) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    onAddReply(commentId, replyText.trim());
    setReplyText("");
    setActiveReplyCommentId(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      className="space-y-8 pb-16 animate-in fade-in duration-300"
      id="article-detail-view-container"
    >
      {/* Lightbox Modal / Popup for clicked images */}
      <AnimatePresence>
        {lightboxImg && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxImg(null)}
            className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md cursor-zoom-out"
            id="image-lightbox-overlay"
          >
            {/* Clear close button */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setLightboxImg(null);
              }}
              className="absolute top-4 right-4 z-[100001] p-3 rounded-full bg-red-600 hover:bg-red-700 text-white border border-white/20 transition-all hover:scale-110 active:scale-90 flex items-center justify-center cursor-pointer shadow-lg"
              title="Close image popup"
              id="lightbox-close-btn"
            >
              <X className="w-5 h-5" />
            </button>
            <motion.img 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              src={lightboxImg} 
              alt="Expanded preview" 
              className="max-w-full max-h-[90vh] rounded-2xl object-contain shadow-2xl border border-white/10"
              referrerPolicy="no-referrer"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back navigation & Course Sequence Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={() => {
            if (activeCourseContext && onReturnToCourse) {
              onReturnToCourse();
            } else {
              onClose();
            }
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/80 backdrop-blur-md border border-purple-200 text-purple-950 font-extrabold hover:bg-purple-700 hover:text-white transition-all cursor-pointer text-xs shadow-xs shrink-0 self-start sm:self-auto"
          id="reader-back-btn"
        >
          <ArrowLeft className="w-4 h-4 text-purple-600 group-hover:text-white" />
          <span>{activeCourseContext ? `Back to Course Curriculum (${activeCourseContext.course.title})` : "Back to All Articles"}</span>
        </button>

        {activeCourseContext && (
          <div className="flex items-center gap-2 bg-purple-100/90 text-purple-950 px-3.5 py-1.5 rounded-2xl border border-purple-200 text-xs font-black">
            <BookOpen className="w-4 h-4 text-purple-700 shrink-0" />
            <span className="truncate">
              Lesson #{activeCourseContext.lessonIndex + 1} of {activeCourseContext.course.lessons?.length || 1}: {activeCourseContext.course.title}
            </span>
          </div>
        )}
      </div>

      {/* Main card containing content & actions */}
      <div className="bg-white/40 backdrop-blur-lg border border-white/60 rounded-3xl sm:rounded-[36px] p-4 sm:p-10 shadow-xl space-y-6 sm:space-y-8">
        
        {/* Header Metadata info */}
        <div className="space-y-4">
          <span className="text-[10px] bg-purple-600 text-white px-3.5 py-1 rounded-full font-bold uppercase tracking-widest shadow">
            {post.category}
          </span>
          <h1 className="text-xl sm:text-4xl font-black text-purple-950 tracking-tight leading-tight">
            {post.title}
          </h1>
          <p className="text-xs sm:text-base text-gray-600 font-medium leading-relaxed italic">
            "{post.tagline}"
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500 font-mono border-y border-purple-100 py-3">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-500" />
              <span>{post.date}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-purple-500" />
              <span>{post.readTime}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-purple-500" />
              <span>{post.views || 0} Views</span>
            </span>
          </div>
        </div>

        {/* Thumbnail: Shown with click-to-zoom instruction */}
        <div className="w-full bg-slate-100/30 rounded-2xl sm:rounded-[28px] overflow-hidden p-2 border border-purple-50 flex flex-col items-center justify-center group relative">
          <img
            src={post.thumbnailUrl}
            alt={post.title}
            onClick={() => setLightboxImg(post.thumbnailUrl)}
            className="max-w-full h-auto max-h-[480px] rounded-2xl shadow-sm object-contain cursor-zoom-in group-hover:opacity-95 transition-opacity"
            id="reader-original-thumbnail"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
          <span className="absolute bottom-4 right-4 bg-purple-950/80 backdrop-blur-md text-white text-[9px] px-2.5 py-1 rounded-lg font-mono font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            Click Image to Expand
          </span>
        </div>

        {/* Two-Column Responsive Layout: Content on Left (8/12), Comments & Actions on Right (4/12) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Article Body (8 cols on desktop) */}
          <div className="lg:col-span-8 space-y-6">
            <article className="prose prose-purple max-w-none text-purple-950">
              <div className="text-sm sm:text-base leading-relaxed text-slate-800 text-left sm:text-justify">
                {(() => {
                  if (!post.content) return null;
                  const parts = post.content.split(/\[AD_CODE_START\]([\s\S]*?)\[AD_CODE_END\]/g);
                  return parts.map((part, index) => {
                    if (index % 2 === 0) {
                      if (!part.trim()) return null;
                      return (
                        <Markdown
                          key={`md-chunk-${index}`}
                          rehypePlugins={[rehypeRaw]}
                          components={{
                            p: ({ children }) => <p className="mb-4 leading-relaxed text-slate-800 text-left sm:text-justify">{children}</p>,
                            a: ({ href, children }) => (
                              <a 
                                href={href} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-purple-600 font-bold hover:text-purple-850 underline decoration-purple-400 decoration-2 transition-colors cursor-pointer"
                              >
                                {children}
                              </a>
                            ),
                            img: ({ src, alt }) => (
                              <div className="group relative my-4 cursor-zoom-in" onClick={() => src && setLightboxImg(src)}>
                                <img 
                                  src={src} 
                                  alt={alt} 
                                  className="w-full max-h-[400px] object-cover rounded-2xl border border-purple-100 group-hover:opacity-90 transition-all duration-300 shadow-sm"
                                  referrerPolicy="no-referrer"
                                  loading="lazy"
                                />
                                <span className="absolute bottom-3 right-3 bg-purple-950/80 backdrop-blur-sm text-white text-[8px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-all">
                                  Zoom
                                </span>
                              </div>
                            ),
                            h1: ({ children }) => <h1 className="text-xl font-bold text-purple-950 mt-6 mb-2">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-lg font-bold text-purple-950 mt-5 mb-2">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-base font-bold text-purple-950 mt-4 mb-1">{children}</h3>,
                            ul: ({ children }) => <ul className="list-disc pl-5 mb-4 space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 space-y-1">{children}</ol>,
                            li: ({ children }) => <li className="text-slate-800">{children}</li>,
                            blockquote: ({ children }) => (
                              <blockquote className="border-l-4 border-purple-500 pl-4 italic text-slate-600 my-4 bg-purple-50/50 py-1.5 pr-2 rounded-r-xl">
                                {children}
                              </blockquote>
                            ),
                            pre: ({ children }: any) => <CodeBlock>{children}</CodeBlock>,
                            mark: ({ children }: any) => (
                              <mark className="bg-emerald-100 text-emerald-950 font-extrabold px-1.5 py-0.5 rounded-md border border-emerald-300/80 shadow-xs mx-0.5 inline-block">
                                {children}
                              </mark>
                            ),
                            code: ({ inline, className, children, ...props }: any) => {
                              if (inline) {
                                return (
                                  <code className="px-2 py-0.5 rounded-md bg-slate-900 text-emerald-300 font-mono text-xs font-extrabold border border-slate-700 shadow-xs break-words mx-0.5 inline-block" {...props}>
                                    {children}
                                  </code>
                                );
                              }
                              return (
                                <code className="font-mono text-xs sm:text-sm text-emerald-300 font-semibold whitespace-pre break-words block max-w-full" {...props}>
                                  {children}
                                </code>
                               );
                            },
                            table: ({ children }) => (
                              <div className="my-4 max-w-full overflow-x-auto rounded-xl border border-purple-100 shadow-sm">
                                <table className="min-w-full divide-y divide-purple-100 text-xs sm:text-sm">
                                  {children}
                                </table>
                              </div>
                            )
                          }}
                        >
                          {preprocessArticleContent(part)}
                        </Markdown>
                      );
                    } else {
                      return <AdRenderer key={`ad-chunk-${index}`} code={part} placementId="articleBody" />;
                    }
                  });
                })()}
              </div>
            </article>

            {/* Course Next Article Sequence & Larger Lesson Exchange Box */}
            {activeCourseContext && (
              <div className="p-8 rounded-[32px] bg-slate-950 text-white space-y-6 shadow-2xl border border-purple-900/60 my-10 animate-in fade-in relative overflow-hidden" id="course-sequence-nav-box">
                {/* Visual Background Glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
                
                <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-purple-600/30 text-purple-300 border border-purple-500/40">
                      <BookOpen className="w-5 h-5 text-purple-400" />
                    </span>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-wider text-purple-200">
                        Course Curriculum • Lesson {activeCourseContext.lessonIndex + 1} of {activeCourseContext.course.lessons?.length || 1}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-medium">{activeCourseContext.course.title}</p>
                    </div>
                  </div>
                  <button
                    onClick={onReturnToCourse || onClose}
                    className="text-xs font-bold text-purple-300 hover:text-white bg-purple-950/80 hover:bg-purple-900 px-4 py-2 rounded-full transition-colors cursor-pointer border border-purple-800 shadow-sm"
                  >
                    Back to Full Course
                  </button>
                </div>

                {/* Lesson Navigation Buttons */}
                <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
                  {activeCourseContext.lessonIndex > 0 ? (
                    <button
                      onClick={() => onNavigateCourseLesson?.("prev")}
                      className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-700 active:scale-95 shadow-md"
                    >
                      <ChevronLeft className="w-4 h-4 text-purple-400" />
                      <span>Previous Article Lesson</span>
                    </button>
                  ) : <div />}

                  {activeCourseContext.course.lessons && activeCourseContext.lessonIndex < activeCourseContext.course.lessons.length - 1 ? (
                    <button
                      onClick={() => onNavigateCourseLesson?.("next")}
                      className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xl shadow-purple-950 active:scale-95 ml-auto"
                    >
                      <span>Next Lesson in Course Sequence</span>
                      <ChevronRight className="w-4.5 h-4.5 text-amber-300" />
                    </button>
                  ) : (
                    <div className="text-xs font-black text-emerald-300 flex items-center gap-2 bg-emerald-950/90 px-5 py-3 rounded-2xl border border-emerald-700/80 shadow-lg ml-auto">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span>All Lessons Completed!</span>
                    </div>
                  )}
                </div>

                {/* Larger Course Lesson Exchange & Replacement Boxes */}
                {activeCourseContext.course.lessons && activeCourseContext.course.lessons.length > 0 && (
                  <div className="relative z-10 pt-4 border-t border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-purple-400" />
                        <span>All Lessons in this Course (Click to Exchange / View)</span>
                      </span>
                      <span className="text-[10px] font-mono text-purple-400 font-bold bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
                        {activeCourseContext.course.lessons.length} Modules
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
                      {activeCourseContext.course.lessons.map((lesson: any, idx: number) => {
                        const isCurrent = idx === activeCourseContext.lessonIndex;
                        const isDone = idx < activeCourseContext.lessonIndex;
                        return (
                          <div
                            key={lesson.id || idx}
                            onClick={() => {
                              if (idx !== activeCourseContext.lessonIndex) {
                                if (idx > activeCourseContext.lessonIndex) {
                                  onNavigateCourseLesson?.("next");
                                } else {
                                  onNavigateCourseLesson?.("prev");
                                }
                              }
                            }}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 ${
                              isCurrent
                                ? "bg-purple-900/60 border-purple-500 text-white shadow-lg shadow-purple-950/50 scale-[1.01]"
                                : isDone
                                ? "bg-slate-900/80 border-slate-800/80 text-slate-300 hover:border-slate-700"
                                : "bg-slate-900/40 border-slate-800/60 text-slate-400 hover:border-purple-800 hover:text-white"
                            }`}
                          >
                            <div className={`w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                              isCurrent ? "bg-purple-500 text-white" : isDone ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-slate-800 text-slate-400"
                            }`}>
                              {isDone ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-mono uppercase text-purple-300 font-bold">
                                {isCurrent ? "Currently Reading" : isDone ? "Completed" : `Module #${idx + 1}`}
                              </p>
                              <h5 className="text-xs font-bold truncate">{lesson.title}</h5>
                            </div>
                            {isCurrent ? (
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Course Completed Pop-Up Modal & Fullscreen Confetti Overlay */}
                {activeCourseContext.lessonIndex === (activeCourseContext.course.lessons?.length || 1) - 1 && (
                  <>
                    <SprinkleConfetti 
                      show={true} 
                      courseTitle={activeCourseContext.course.title} 
                    />

                    {/* COURSE COMPLETED POP-UP MODAL */}
                    {showCourseCompletedModal && (
                      <AnimatePresence>
                        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                          {/* Backdrop */}
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => {
                              setShowCourseCompletedModal(false);
                              if (onReturnToHome) onReturnToHome();
                              else onClose();
                            }}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                          />

                          {/* Animated Pop-Up Card */}
                          <motion.div
                            initial={{ scale: 0.7, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.7, opacity: 0, y: 20 }}
                            transition={{ type: "spring", stiffness: 300, damping: 22 }}
                            className="relative z-10 w-full max-w-lg bg-slate-900 border-2 border-amber-400 text-white p-8 rounded-[36px] shadow-2xl text-center space-y-6"
                            id="course-completed-popup-modal"
                          >
                            {/* Animated Green Checkmark Badge with Glow */}
                            <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                              <motion.div 
                                initial={{ scale: 0, rotate: -45 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                className="w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-2xl shadow-emerald-500/50"
                              >
                                <CheckCircle2 className="w-12 h-12 text-white stroke-[2.5]" />
                              </motion.div>
                              <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-30 pointer-events-none" />
                            </div>

                            <div className="space-y-2">
                              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-widest shadow-md">
                                <Sparkles className="w-4 h-4 text-slate-950" />
                                <span>Sprinkle Coder Passed</span>
                              </div>
                              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                                Course completed successfully.
                              </h2>
                              <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed max-w-md mx-auto">
                                Congratulations! You have successfully mastered all lessons in <strong>{activeCourseContext.course.title}</strong>!
                              </p>
                            </div>

                            <div className="pt-2">
                              <button
                                onClick={() => {
                                  setShowCourseCompletedModal(false);
                                  if (onReturnToHome) onReturnToHome();
                                  else onClose();
                                }}
                                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-amber-400 to-amber-500 hover:from-emerald-400 hover:to-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-xl active:scale-95 flex items-center justify-center gap-2"
                              >
                                <Award className="w-4.5 h-4.5 text-slate-950" />
                                <span>Return to Homepage</span>
                              </button>
                            </div>
                          </motion.div>
                        </div>
                      </AnimatePresence>
                    )}

                    <div className="relative z-10 p-6 rounded-3xl bg-gradient-to-r from-purple-900 via-indigo-900 to-emerald-900 border-2 border-amber-400/80 shadow-2xl space-y-3 mt-4 text-center animate-in zoom-in duration-300">
                      <div className="flex items-center justify-center gap-2">
                        <Sparkles className="w-6 h-6 text-amber-300 animate-spin" />
                        <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-widest">
                          Sprinkle Celebration
                        </span>
                        <Sparkles className="w-6 h-6 text-amber-300 animate-spin" />
                      </div>

                      <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                        🎉 Course completed successfully.
                      </h3>

                      <p className="text-xs sm:text-sm text-purple-100 font-medium max-w-lg mx-auto leading-relaxed">
                        You have successfully completed <strong>{activeCourseContext.course.title}</strong> on the Sprinkle platform of <strong>sprocoder.online</strong>!
                      </p>

                      <div className="pt-2 flex justify-center gap-3">
                        <button
                          onClick={() => {
                            if (onReturnToHome) onReturnToHome();
                            else onClose();
                          }}
                          className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95"
                        >
                          <Award className="w-4 h-4" />
                          <span>Return to Homepage</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}

              </div>
            )}
          </div>

          {/* Right Column: Actions & Live Discussions (4 cols on desktop, naturally flows below on mobile) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Quick Reactions Widget */}
            <div className="p-6 rounded-3xl bg-purple-50/50 border border-purple-100 space-y-4 shadow-sm">
              <h4 className="font-sans font-extrabold text-[10px] text-purple-950 uppercase tracking-widest block">
                Article Actions
              </h4>
              <div className="flex flex-col gap-2">
                <button
                  onClick={onLike}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                    isLiked
                      ? "bg-rose-600 border-rose-500 text-white shadow-md shadow-rose-100"
                      : "bg-white hover:bg-rose-50 border-purple-100 text-purple-950 hover:text-rose-600"
                  }`}
                  id="reader-like-btn"
                >
                  <Heart className={`w-4 h-4 ${isLiked ? "fill-white" : ""}`} />
                  <span>{post.likes} Likes</span>
                </button>

                <button
                  onClick={onToggleBookmark}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                    isBookmarked
                      ? "bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-100"
                      : "bg-white hover:bg-purple-50 border-purple-100 text-purple-950 hover:text-purple-600"
                  }`}
                  id="reader-save-btn"
                >
                  <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-white" : ""}`} />
                  <span>{isBookmarked ? "Saved to Dashboard" : "Save Publication"}</span>
                </button>
              </div>
            </div>

            {/* Related Articles Widget (max 5) */}
            {relatedArticles.length > 0 && (
              <div className="p-6 rounded-3xl bg-white/45 border border-purple-100 space-y-4 shadow-sm" id="related-articles-sidebar">
                <h4 className="font-sans font-extrabold text-[10px] text-purple-950 uppercase tracking-widest flex items-center gap-1.5 border-b border-purple-50 pb-2">
                  <span>Related Articles</span>
                  <span className="text-purple-600 font-bold">•</span>
                  <span className="text-gray-400 font-mono text-[9px] lowercase font-normal">matched on keywords</span>
                </h4>
                <div className="space-y-3">
                  {relatedArticles.map((relPost) => {
                    const relUrl = `/blog/${slugify(relPost.title)}`;
                    return (
                      <a
                        key={relPost.id}
                        href={relUrl}
                        onClick={(e) => {
                          if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                            e.preventDefault();
                            onSelectPost(relPost);
                          }
                        }}
                        className="flex gap-3 items-start group cursor-pointer border-b border-purple-100/30 last:border-none pb-2.5 last:pb-0 no-underline"
                      >
                        <img
                          src={relPost.thumbnailUrl}
                          alt={relPost.title}
                          className="w-12 h-12 rounded-xl object-cover border border-purple-100/50 group-hover:scale-105 transition-transform shrink-0"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />
                        <div className="min-w-0 flex-1">
                          <h5 className="text-[11px] font-extrabold text-purple-950 leading-tight line-clamp-2 group-hover:text-purple-700 transition-colors">
                            {relPost.title}
                          </h5>
                          <p className="text-[9px] text-gray-500 font-mono mt-0.5">{relPost.category}</p>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ARTICLE SIDEBAR AD SLOT */}
            {adsConfig?.enableAds && adsConfig?.articleSidebar && (
              <div id="article-sidebar-ad-slot" className="animate-in fade-in">
                <AdRenderer code={adsConfig.articleSidebar} className="max-w-[320px] mx-auto bg-slate-100/40 border border-slate-200/50" placementId="articleSidebar" />
              </div>
            )}

            {/* Real-time Responsive Discussion Board */}
            <div className="p-6 rounded-3xl bg-white/50 backdrop-blur-md border border-purple-100 space-y-6 shadow-sm">
              
              <div className="flex items-center justify-between border-b border-purple-100 pb-3">
                <h3 className="font-black text-purple-950 text-xs uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-purple-600" />
                  <span>Discussions ({post.comments?.length || 0})</span>
                </h3>
              </div>

              {/* Threaded Discussion List */}
              <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1" id="discussion-board-list">
                {post.comments && post.comments.length > 0 ? (
                  post.comments.map((comment) => (
                    <div key={comment.id} className="space-y-3 border-b border-purple-50 pb-4 last:border-0 last:pb-0">
                      
                      {/* Main Comment Node */}
                      <div className="flex gap-2 text-left">
                        <img
                          src={comment.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(comment.author)}`}
                          alt={comment.author}
                          className="w-7 h-7 rounded-full object-cover border border-purple-100 shrink-0 mt-0.5"
                        />
                        <div className="flex-1">
                          <div className="flex flex-wrap items-baseline justify-between gap-1">
                            <div className="flex items-center gap-1">
                              <span className="font-extrabold text-purple-950 text-xs">
                                {comment.author}
                              </span>
                              {comment.username && (
                                <span className="text-[9px] text-purple-600 font-semibold">
                                  @{comment.username}
                                </span>
                              )}
                            </div>
                            <span className="text-[9px] text-gray-400 font-mono">
                              {comment.date}
                            </span>
                          </div>
                          
                          <p className="text-[11px] text-slate-700 mt-0.5 leading-relaxed text-justify whitespace-pre-line">
                            {comment.content}
                          </p>

                          {/* Reply Toggle Actions */}
                          {currentUser && (
                            <div className="mt-1">
                              <button
                                onClick={() => {
                                  if (activeReplyCommentId === comment.id) {
                                    setActiveReplyCommentId(null);
                                  } else {
                                    setActiveReplyCommentId(comment.id);
                                    setReplyText("");
                                  }
                                }}
                                className="text-[9px] text-purple-600 hover:text-purple-900 font-bold flex items-center gap-0.5 cursor-pointer"
                              >
                                <MessageCircle className="w-2.5 h-2.5" />
                                <span>Reply</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Nesting Replies */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="pl-3 sm:pl-6 ml-1 sm:ml-3 border-l border-purple-100/60 space-y-3">
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="flex gap-2 text-left">
                              <img
                                src={reply.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(reply.author)}`}
                                alt={reply.author}
                                className="w-5 h-5 rounded-full object-cover border border-purple-100 shrink-0 mt-0.5"
                              />
                              <div className="flex-1">
                                <div className="flex flex-wrap items-baseline justify-between gap-1">
                                  <div className="flex items-center gap-1">
                                    <span className="font-extrabold text-purple-950 text-[10px]">
                                      {reply.author}
                                    </span>
                                    {reply.username && (
                                      <span className="text-[8px] text-purple-600 font-semibold">
                                        @{reply.username}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[8px] text-gray-400 font-mono">
                                    {reply.date}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-700 leading-normal text-justify whitespace-pre-line mt-0.5">
                                  {reply.content}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Inline Thread Reply Input Form */}
                      <AnimatePresence>
                        {activeReplyCommentId === comment.id && (
                          <motion.form
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            onSubmit={(e) => handleReplySubmit(e, comment.id)}
                            className="pl-3 sm:pl-6 ml-1 sm:ml-3 border-l border-purple-200 space-y-2 mt-2"
                          >
                            <div className="flex items-start gap-1.5">
                              <CornerDownRight className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-2" />
                              <div className="flex-1 space-y-1">
                                <input
                                  type="text"
                                  placeholder={`Reply to ${comment.author}...`}
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-purple-100 text-[11px] text-purple-950 focus:outline-none focus:border-purple-500"
                                  id={`reply-input-comment-${comment.id}`}
                                  autoFocus
                                />
                                <div className="flex gap-1.5 justify-end">
                                  <button
                                    type="button"
                                    onClick={() => setActiveReplyCommentId(null)}
                                    className="px-2 py-0.5 rounded-md text-[9px] font-bold text-gray-500 hover:bg-gray-100 cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="submit"
                                    disabled={!replyText.trim()}
                                    className="px-2.5 py-0.5 rounded-md bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 font-bold text-[9px] flex items-center gap-0.5 cursor-pointer"
                                  >
                                    <span>Send</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </motion.form>
                        )}
                      </AnimatePresence>

                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-gray-400 text-center py-6 bg-purple-50/20 border border-purple-50/20 rounded-2xl leading-normal">
                    No active comments registered yet. Start the code discussion below!
                  </p>
                )}
              </div>

              {/* Add Comment Field (Adjusted properly to the bottom, below the recently posted comments) */}
              {currentUser ? (
                <form onSubmit={handleCommentSubmit} className="space-y-2 pt-4 border-t border-purple-100/60">
                  <div className="flex items-start gap-2">
                    <img
                      src={currentUser.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(currentUser.name)}`}
                      alt={currentUser.name}
                      className="w-7 h-7 rounded-full object-cover border border-purple-100 shrink-0 mt-1"
                    />
                    <div className="flex-1 space-y-1.5">
                      <textarea
                        rows={2}
                        placeholder="Share your thoughts on this write-up..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-purple-100 text-xs text-purple-950 focus:outline-none focus:border-purple-500 resize-none leading-normal"
                        id="comment-input-field"
                      />
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={!newComment.trim()}
                          className="px-3.5 py-1.5 rounded-xl bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 active:scale-95 transition-all cursor-pointer flex items-center gap-1 font-bold text-[10px]"
                          id="comment-submit-btn"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Comment</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="p-3 bg-purple-50/50 border border-purple-100/60 rounded-xl text-center">
                  <p className="text-[10px] text-purple-950 font-bold">
                    Join the tech conversation
                  </p>
                  <p className="text-[9px] text-gray-500 mt-0.5">
                    Please log in or register on the top right to comment & reply.
                  </p>
                </div>
              )}

            </div>

            {/* Keywords Box (below Related Articles & Comments) */}
            {keywordList.length > 0 && (
              <div className="p-6 rounded-3xl bg-white/50 backdrop-blur-md border border-purple-100 space-y-4 shadow-sm" id="article-keywords-container">
                <div className="flex items-center gap-2 border-b border-purple-100 pb-3">
                  <Tag className="w-4 h-4 text-purple-600" />
                  <h3 className="font-black text-purple-950 text-xs uppercase tracking-wider">
                    Keywords & SEO Tags
                  </h3>
                </div>
                <p className="text-[10px] text-gray-500 font-medium">
                  Click any keyword tag below to search and view all related articles & tutorials across the platform:
                </p>
                <div className="flex flex-wrap gap-2">
                  {keywordList.map((kw) => (
                    <button
                      key={kw}
                      onClick={() => {
                        if (onSearchKeyword) {
                          onSearchKeyword(kw);
                        } else {
                          onClose();
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold font-mono bg-purple-50 hover:bg-purple-600 hover:text-white text-purple-800 border border-purple-200/80 hover:border-purple-600 shadow-sm transition-all duration-200 cursor-pointer flex items-center gap-1.5 active:scale-95 group"
                      title={`Click to search articles matching "${kw}"`}
                    >
                      <span className="text-purple-400 group-hover:text-white transition-colors">#</span>
                      <span>{kw}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </motion.div>
  );
}
