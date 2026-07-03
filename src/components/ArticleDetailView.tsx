import React, { useState } from "react";
import { Heart, Bookmark, Calendar, Clock, User, MessageSquare, Send, ArrowLeft } from "lucide-react";
import { BlogPost, Comment } from "../types";
import { motion } from "motion/react";

interface ArticleDetailViewProps {
  post: BlogPost;
  onClose: () => void;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onLike: () => void;
  isLiked: boolean;
  onAddComment: (commentText: string) => void;
}

export default function ArticleDetailView({
  post,
  onClose,
  isBookmarked,
  onToggleBookmark,
  onLike,
  isLiked,
  onAddComment
}: ArticleDetailViewProps) {
  const [newComment, setNewComment] = useState("");

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    onAddComment(newComment.trim());
    setNewComment("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      className="space-y-8 pb-16 animate-in fade-in duration-300"
      id="article-detail-view-container"
    >
      {/* Back navigation button */}
      <button
        onClick={onClose}
        className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/50 backdrop-blur-md border border-purple-100 text-purple-950 font-bold hover:bg-purple-600 hover:text-white transition-all cursor-pointer text-xs"
        id="reader-back-btn"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Stream</span>
      </button>

      {/* Main card */}
      <div className="bg-white/40 backdrop-blur-lg border border-white/60 rounded-[36px] overflow-hidden p-6 sm:p-10 shadow-xl space-y-8">
        
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
          </div>
        </div>

        {/* Thumbnail: Shown in original form, clear, with absolutely NO filters or overlays */}
        <div className="w-full bg-slate-100/30 rounded-[28px] overflow-hidden p-2 border border-purple-50 flex items-center justify-center">
          <img
            src={post.thumbnailUrl}
            alt={post.title}
            className="max-w-full h-auto rounded-2xl shadow-sm object-contain"
            id="reader-original-thumbnail"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Two column breakdown for content & actions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Article Body */}
          <div className="lg:col-span-8 space-y-6">
            <article className="prose prose-purple max-w-none text-purple-950">
              <div className="text-sm sm:text-base leading-relaxed space-y-5 whitespace-pre-line text-slate-800 text-justify">
                {post.content}
              </div>
            </article>

            {/* Tags */}
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

          {/* Right Action Side Desk */}
          <div className="lg:col-span-4 space-y-6">
            <div className="p-6 rounded-3xl bg-purple-50/50 border border-purple-100 space-y-4">
              <h4 className="font-sans font-extrabold text-xs text-purple-950 uppercase tracking-wider">
                Article Interactions
              </h4>
              <p className="text-[11px] text-gray-500 leading-normal">
                Enjoyed this tech read? Support the author with a quick reaction or bookmark this publication to your active reading list.
              </p>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={onLike}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                    isLiked
                      ? "bg-rose-600 border-rose-500 text-white shadow-sm"
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
                      ? "bg-purple-600 border-purple-500 text-white shadow-sm"
                      : "bg-white hover:bg-purple-50 border-purple-100 text-purple-950 hover:text-purple-600"
                  }`}
                  id="reader-save-btn"
                >
                  <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-white" : ""}`} />
                  <span>{isBookmarked ? "Saved to Dashboard" : "Save Publication"}</span>
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Real-time Comments Segment */}
        <div className="border-t border-purple-100 pt-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-purple-950 text-sm uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-500" />
              <span>Discussion Board ({post.comments?.length || 0})</span>
            </h3>
          </div>

          {/* Existing Comments List */}
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {post.comments && post.comments.length > 0 ? (
              post.comments.map((comment) => (
                <div
                  key={comment.id}
                  className="p-4 rounded-2xl bg-white/60 border border-purple-50/50 flex gap-3 shadow-sm hover:shadow transition-shadow"
                >
                  <img
                    src={comment.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(comment.author)}`}
                    alt={comment.author}
                    className="w-8 h-8 rounded-full object-cover border border-purple-100 shrink-0"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-purple-950 text-xs">
                        {comment.author}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {comment.date}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed mt-1 whitespace-pre-line text-justify">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400 text-center py-6 bg-white/20 border border-purple-50/20 rounded-2xl">
                No comments registered on this guide yet. Start the conversation below!
              </p>
            )}
          </div>

          {/* Add Comment Form */}
          <form onSubmit={handleCommentSubmit} className="flex gap-2 max-w-2xl pt-2">
            <input
              type="text"
              placeholder="Join the technical discussion..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 px-4 py-3 rounded-2xl bg-white border border-purple-100 text-xs text-purple-950 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-400/20"
              id="comment-input-field"
            />
            <button
              type="submit"
              className="px-5 rounded-2xl bg-purple-600 text-white hover:bg-purple-700 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 font-bold text-xs"
              id="comment-submit-btn"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Comment</span>
            </button>
          </form>
        </div>

      </div>
    </motion.div>
  );
}
