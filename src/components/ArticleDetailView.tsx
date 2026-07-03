import React, { useState } from "react";
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
  MessageCircle
} from "lucide-react";
import { BlogPost, Comment } from "../types";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";

interface ArticleDetailViewProps {
  post: BlogPost;
  onClose: () => void;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onLike: () => void;
  isLiked: boolean;
  onAddComment: (commentText: string) => void;
  onAddReply: (commentId: string, replyText: string) => void;
  currentUser: any;
}

export default function ArticleDetailView({
  post,
  onClose,
  isBookmarked,
  onToggleBookmark,
  onLike,
  isLiked,
  onAddComment,
  onAddReply,
  currentUser
}: ArticleDetailViewProps) {
  const [newComment, setNewComment] = useState("");
  const [activeReplyCommentId, setActiveReplyCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

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
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-zoom-out"
            id="image-lightbox-overlay"
          >
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setLightboxImg(null);
              }}
              className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-all hover:scale-115 active:scale-90"
              title="Close image popup"
              id="lightbox-close-btn"
            >
              <X className="w-6 h-6" />
            </button>
            <motion.img 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              src={lightboxImg} 
              alt="Expanded preview" 
              className="max-w-full max-h-[85vh] rounded-3xl object-contain shadow-2xl border border-white/10"
              referrerPolicy="no-referrer"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back navigation button */}
      <button
        onClick={onClose}
        className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/50 backdrop-blur-md border border-purple-100 text-purple-950 font-bold hover:bg-purple-600 hover:text-white transition-all cursor-pointer text-xs"
        id="reader-back-btn"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Stream</span>
      </button>

      {/* Main card containing content & actions */}
      <div className="bg-white/40 backdrop-blur-lg border border-white/60 rounded-[36px] p-6 sm:p-10 shadow-xl space-y-8">
        
        {/* Header Metadata info */}
        <div className="space-y-4">
          <span className="text-[10px] bg-purple-600 text-white px-3.5 py-1 rounded-full font-bold uppercase tracking-widest shadow">
            {post.category}
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-purple-950 tracking-tight leading-tight">
            {post.title}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 font-medium leading-relaxed italic">
            "{post.tagline}"
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 font-mono border-y border-purple-100 py-3">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-500" />
              <span>{post.date}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-purple-500" />
              <span>{post.readTime}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-purple-500" />
              <span>Published by {post.author}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-purple-500" />
              <span>{post.views || 0} Views</span>
            </span>
          </div>
        </div>

        {/* Thumbnail: Shown with click-to-zoom instruction */}
        <div className="w-full bg-slate-100/30 rounded-[28px] overflow-hidden p-2 border border-purple-50 flex flex-col items-center justify-center group relative">
          <img
            src={post.thumbnailUrl}
            alt={post.title}
            onClick={() => setLightboxImg(post.thumbnailUrl)}
            className="max-w-full h-auto max-h-[480px] rounded-2xl shadow-sm object-contain cursor-zoom-in group-hover:opacity-95 transition-opacity"
            id="reader-original-thumbnail"
            referrerPolicy="no-referrer"
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
              <div className="text-sm sm:text-base leading-relaxed text-slate-800 text-justify">
                <Markdown
                  components={{
                    p: ({ children }) => <p className="mb-4 leading-relaxed text-slate-800 text-justify">{children}</p>,
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
                    )
                  }}
                >
                  {post.content}
                </Markdown>
              </div>
            </article>

            {/* Hashtags and Keywords */}
            <div className="flex flex-wrap gap-1.5 pt-6 border-t border-purple-100">
              {post.tags?.map((tag) => (
                <span
                  key={tag}
                  className="bg-purple-100/60 text-purple-700 text-[10px] font-mono font-bold px-3 py-1 rounded-md"
                >
                  #{tag}
                </span>
              ))}
            </div>
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

            {/* Real-time Responsive Discussion Board */}
            <div className="p-6 rounded-3xl bg-white/50 backdrop-blur-md border border-purple-100 space-y-6 shadow-sm">
              
              <div className="flex items-center justify-between border-b border-purple-100 pb-3">
                <h3 className="font-black text-purple-950 text-xs uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-purple-600" />
                  <span>Discussions ({post.comments?.length || 0})</span>
                </h3>
              </div>

              {/* Add Comment Field (At top of Board for high usability) */}
              {currentUser ? (
                <form onSubmit={handleCommentSubmit} className="space-y-2">
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
                          <Send className="w-3 h-3" />
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
                        <div className="pl-6 ml-3 border-l-2 border-purple-100/60 space-y-3">
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
                            className="pl-6 ml-3 border-l-2 border-purple-200 space-y-2 mt-2"
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
                    No active comments registered yet. Start the code discussion above!
                  </p>
                )}
              </div>

            </div>

          </div>

        </div>

      </div>
    </motion.div>
  );
}
