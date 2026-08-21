import React, { useState } from "react";
import { AlertTriangle, Search, Home, BookOpen, GraduationCap, ArrowRight, HelpCircle } from "lucide-react";
import { BlogPost } from "../types";
import { updateDocumentSeo } from "../utils/seo";

interface NotFoundPageProps {
  onNavigateHome: () => void;
  onNavigateArticles: () => void;
  onNavigateCourses: () => void;
  onSelectPost?: (post: BlogPost) => void;
  allPosts?: BlogPost[];
}

export default function NotFoundPage({
  onNavigateHome,
  onNavigateArticles,
  onNavigateCourses,
  onSelectPost,
  allPosts = []
}: NotFoundPageProps) {
  const [searchQuery, setSearchQuery] = useState("");

  React.useEffect(() => {
    updateDocumentSeo({
      title: "Page Not Found (404) | S Pro Coder",
      description: "The page you are looking for cannot be found. Search our coding tutorials, web development guides, and AI tools directory.",
      url: "https://www.sprocoder.online/404",
      type: "website"
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const searchResults = searchQuery.trim().length > 1
    ? allPosts.filter(p => 
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (p.excerpt && p.excerpt.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))
      ).slice(0, 5)
    : [];

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300 py-8 px-4" id="not-found-page-container">
      <div className="bg-white/70 border-2 border-black rounded-[32px] p-8 sm:p-14 text-center space-y-8 shadow-md relative overflow-hidden backdrop-blur-sm">
        
        {/* 404 Badge & Graphic */}
        <div className="space-y-3">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-red-100 border-2 border-red-300 text-red-600 flex items-center justify-center shadow-inner">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <span className="inline-block px-3.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-xs font-black uppercase tracking-widest">
            HTTP 404 Error
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-purple-950 tracking-tight">
            Page Not Found
          </h1>
          <p className="text-sm sm:text-base text-gray-600 max-w-md mx-auto leading-relaxed">
            The tutorial, article, or resource you requested may have been moved, updated, or does not exist.
          </p>
        </div>

        {/* Search Box */}
        <div className="max-w-md mx-auto space-y-3">
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tutorials, articles, guides..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white border-2 border-purple-200 text-purple-950 placeholder-gray-400 text-sm font-semibold focus:outline-hidden focus:border-purple-600 transition-colors shadow-2xs"
            />
          </div>

          {/* Real-time search results */}
          {searchResults.length > 0 && (
            <div className="text-left bg-white border-2 border-purple-200 rounded-2xl p-2 shadow-lg space-y-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-purple-900 px-3 py-1">
                Matching Tutorials:
              </p>
              {searchResults.map((post) => (
                <div
                  key={post.id}
                  onClick={() => onSelectPost && onSelectPost(post)}
                  className="p-2.5 rounded-xl hover:bg-purple-50 cursor-pointer transition-colors"
                >
                  <p className="text-xs font-extrabold text-purple-950 truncate">{post.title}</p>
                  <p className="text-[10px] text-gray-500">{post.category} • {post.date}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Navigation Links */}
        <div className="pt-4 border-t border-purple-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={onNavigateHome}
            className="p-3.5 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            <Home className="w-4 h-4" />
            <span>Return to Home</span>
          </button>

          <button
            onClick={onNavigateArticles}
            className="p-3.5 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-950 border border-purple-200 font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-purple-600" />
            <span>Browse Articles</span>
          </button>

          <button
            onClick={onNavigateCourses}
            className="p-3.5 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-950 border border-purple-200 font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <GraduationCap className="w-4 h-4 text-purple-600" />
            <span>Explore Courses</span>
          </button>
        </div>

        {/* Helpful Popular Topics */}
        <div className="pt-2">
          <p className="text-xs text-gray-500 font-medium mb-3">Popular Categories:</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {["Web Development", "AI Tools", "Tech News", "React Tutorials", "Google Gemini API"].map((tag, i) => (
              <span
                key={i}
                onClick={onNavigateArticles}
                className="px-3 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 text-xs font-semibold cursor-pointer transition-colors"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
