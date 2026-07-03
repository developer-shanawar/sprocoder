import React, { useState } from "react";
import { Heart, Bookmark, Calendar, Clock, User, MessageSquare, Send, X, ArrowLeft } from "lucide-react";
import { BlogPost, Comment } from "../types";
import { motion } from "motion/react";

interface ArticleDetailModalProps {
  post: BlogPost;
  onClose: () => void;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onLike: () => void;
  isLiked: boolean;
  onAddComment: (commentText: string) => void;
}

export default function ArticleDetailModal({
  post,
  onClose,
  isBookmarked,
  onToggleBookmark,
  onLike,
  isLiked,
  onAddComment
}: ArticleDetailModalProps) {
  const [newComment, setNewComment] = useState("");

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    onAddComment(newComment.trim());
    setNewComment("");
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex justify-center p-4 md:p-8">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        className="bg-white/95 rounded-[36px] w-full max-w-4xl border border-white shadow-2xl overflow-hidden relative flex flex-col md:flex-row text-purple-950"
        id="article-detail-dialog"
      >
        {/* Top Floating Close Button for Desktop */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors cursor-pointer"
          id="reader-close-btn"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Side: Thumbnail cover & Interactive Stats (Sticky/Hero on desktop) */}
        <div className="w-full md:w-[40%] bg-purple-950 relative flex flex-col text-white">
          <div className="relative h-60 md:h-[45%] w-full">
            <img
              src={post.thumbnailUrl}
              alt={post.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-purple-950 via-purple-950/40 to-transparent" />
            <span className="absolute top-4 left-4 text-[10px] bg-purple-600 px-3 py-1 rounded-full font-bold uppercase tracking-widest text-white shadow">
              {post.category}
            </span>
          </div>

          <div className="p-6 md:p-8 flex-1 flex flex-col justify-between space-y-6">
            <div>
              <p className="text-purple-300 font-mono text-[10px] uppercase tracking-widest flex items-center gap-1.5 mb-1">
                <Calendar className="w-3 h-3" />
                <span>{post.date}</span>
              </p>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight leading-tight">
                {post.title}
              </h1>
              <p className="text-xs text-purple-200 mt-2 italic leading-relaxed">
                "{post.tagline}"
              </p>
            </div>

            <div className="space-y-4 border-t border-white/10 pt-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-800 flex items-center justify-center text-xs font-bold text-purple-200 border border-white/20">
                  {post.author.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{post.author}</p>
                  <p className="text-[9px] text-purple-300">S pro coder Author</p>
                </div>
              </div>

              {/* Like / Save Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={onLike}
                  className={`flex-1 py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                    isLiked
                      ? "bg-rose-600 border-rose-500 text-white"
                      : "bg-white/10 border-white/10 text-white hover:bg-white/20"
                  }`}
                  id="reader-like-btn"
                >
                  <Heart className={`w-4 h-4 ${isLiked ? "fill-white" : ""}`} />
                  <span>{post.likes} Likes</span>
                </button>

                <button
                  onClick={onToggleBookmark}
                  className={`flex-1 py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                    isBookmarked
                      ? "bg-purple-600 border-purple-500 text-white"
                      : "bg-white/10 border-white/10 text-white hover:bg-white/20"
                  }`}
                  id="reader-save-btn"
                >
                  <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-white" : ""}`} />
                  <span>{isBookmarked ? "Saved" : "Save"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Scrollable Article Body and Realtime Comments Segment */}
        <div className="flex-1 flex flex-col h-[70vh] md:h-auto overflow-y-auto">
          {/* Article Main Text Content */}
          <div className="p-6 md:p-8 space-y-6 flex-1 select-text">
            <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span>{post.readTime}</span>
              <span>•</span>
              <span>Published by Admin</span>
            </div>

            <article className="prose prose-purple max-w-none text-purple-950">
              {/* Fallback to simple parser to support line breaks & custom content */}
              <div className="text-sm leading-relaxed space-y-4 whitespace-pre-line text-slate-800">
                {post.content}
              </div>
            </article>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 pt-4 border-t border-purple-50">
              {post.tags?.map((tag) => (
                <span
                  key={tag}
                  className="bg-purple-50 text-purple-700 text-[10px] font-mono font-bold px-2.5 py-1 rounded-md"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Comments Section */}
          <div className="p-6 md:p-8 bg-purple-50/50 border-t border-purple-100 space-y-4">
            <h3 className="font-extrabold text-purple-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-purple-500" />
              <span>Discussion ({post.comments?.length || 0})</span>
            </h3>

            {/* Existing Comments List */}
            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
              {post.comments && post.comments.length > 0 ? (
                post.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-3 rounded-2xl bg-white border border-purple-50/50 flex gap-2.5 shadow-sm"
                  >
                    <img
                      src={comment.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=50&q=80"}
                      alt={comment.author}
                      className="w-7 h-7 rounded-full object-cover border border-purple-100"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-purple-950 text-[11px]">
                          {comment.author}
                        </span>
                        <span className="text-[9px] text-gray-400 font-mono">
                          {comment.date}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 leading-normal mt-0.5 whitespace-pre-line">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[11px] text-gray-400 text-center py-4">
                  No comments yet. Start the conversation below!
                </p>
              )}
            </div>

            {/* Add Comment Form */}
            <form onSubmit={handleCommentSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder="Share your thoughts on this AI/Tech topic..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 px-4 py-2 rounded-xl bg-white border border-purple-100 text-xs text-purple-950 focus:outline-none focus:border-purple-500"
                id="comment-input-field"
              />
              <button
                type="submit"
                className="p-2.5 rounded-xl bg-purple-600 text-white hover:bg-purple-700 active:scale-95 transition-all cursor-pointer"
                id="comment-submit-btn"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
