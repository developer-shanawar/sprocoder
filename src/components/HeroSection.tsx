import React from "react";
import { Heart, Bookmark, ArrowRight, Sparkles, Star, Eye } from "lucide-react";
import { BlogPost } from "../types";

interface HeroSectionProps {
  post: BlogPost;
  onSelect: () => void;
  isLiked: boolean;
  onLike: () => void;
  isBookmarked: boolean;
  onBookmark: () => void;
}

export default function HeroSection({
  post,
  onSelect,
  isLiked,
  onLike,
  isBookmarked,
  onBookmark
}: HeroSectionProps) {
  return (
    <div 
      className="relative rounded-[36px] overflow-hidden border-2 border-black bg-white/35 backdrop-blur-xl shadow-xl flex flex-col md:flex-row transition-all duration-500 group"
      id="hero-featured-container"
    >
      {/* Background ambient halo */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full filter blur-3xl pointer-events-none" />

      {/* Visual Accent Badge */}
      <span className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-600 text-white font-black text-[9px] uppercase tracking-widest shadow">
        <Star className="w-3 h-3 text-amber-300 fill-amber-300 animate-spin" />
        <span>FEATURED TECHNICAL ARTICLE</span>
      </span>

      {/* Left side: Thumbnail cover */}
      <div className="w-full md:w-[48%] h-64 md:h-auto min-h-[280px] relative overflow-hidden shrink-0">
        <img
          src={post.thumbnailUrl}
          alt={post.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-purple-950/50 via-transparent to-transparent" />
      </div>

      {/* Right side: Meta and summary information */}
      <div className="p-6 md:p-10 flex-1 flex flex-col justify-between space-y-6 relative z-10">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest bg-purple-100 text-purple-700 px-2.5 py-1 rounded-md">
              {post.category}
            </span>
            <span className="text-[10px] text-gray-500 font-mono font-bold">
              {post.date}
            </span>
          </div>

          <h2 className="text-xl md:text-3xl font-black text-purple-950 tracking-tight leading-tight group-hover:text-purple-800 transition-colors">
            {post.title}
          </h2>

          <p className="text-xs text-gray-600 leading-relaxed max-w-xl">
            {post.excerpt}
          </p>
        </div>

        {/* Action segment */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-t border-purple-100 pt-5">
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLike();
              }}
              className={`p-2 rounded-xl flex items-center gap-1.5 text-xs font-bold border transition-all cursor-pointer ${
                isLiked 
                  ? "bg-rose-500 border-rose-500 text-white" 
                  : "bg-white/60 border-purple-100 text-purple-950 hover:bg-purple-50"
              }`}
              id="hero-like-btn"
              title="Like featured article"
            >
              <Heart className={`w-4 h-4 ${isLiked ? "fill-white" : ""}`} />
              <span>{post.likes}</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onBookmark();
              }}
              className={`p-2 rounded-xl flex items-center gap-1.5 text-xs font-bold border transition-all cursor-pointer ${
                isBookmarked 
                  ? "bg-purple-600 border-purple-500 text-white" 
                  : "bg-white/60 border-purple-100 text-purple-950 hover:bg-purple-50"
              }`}
              id="hero-save-btn"
              title="Bookmark featured article"
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-white" : ""}`} />
              <span>{isBookmarked ? "Saved" : "Save"}</span>
            </button>

            <span className="p-2 rounded-xl flex items-center gap-1.5 text-xs font-bold border border-purple-100 bg-white/60 text-purple-950">
              <Eye className="w-4 h-4 text-purple-500" />
              <span>{post.views || 0}</span>
            </span>
          </div>

          <button
            onClick={onSelect}
            className="px-5 py-2.5 rounded-xl bg-purple-950 hover:bg-purple-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            id="hero-read-btn"
          >
            <span>Read Complete Article</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
