import React, { useState } from "react";
import { Play, Eye, Flame, Youtube, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface VideoItem {
  id: string;
  title: string;
  views: string;
  duration: string;
  thumbnail: string;
  embedCode: string;
  channel: string;
}

export default function YouTubeShowcase() {
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);

  const videos: VideoItem[] = [
    {
      id: "vid-1",
      title: "Building full-stack AI applications in minutes using Gemini 3.5 & React",
      views: "124K views",
      duration: "14:20",
      thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80",
      embedCode: "dQw4w9WgXcQ", // Rickroll as safe placeholder or standard youtube id
      channel: "S pro coder Studio"
    },
    {
      id: "vid-2",
      title: "TypeScript Best Practices: Advanced utility types & clean architecture",
      views: "89K views",
      duration: "22:05",
      thumbnail: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=300&q=80",
      embedCode: "dQw4w9WgXcQ",
      channel: "S pro coder Dev"
    }
  ];

  return (
    <div className="p-5 rounded-3xl border border-white/40 bg-white/20 backdrop-blur-md shadow-sm space-y-4" id="youtube-showcase-container">
      <div className="flex items-center justify-between">
        <h3 className="font-sans font-bold text-purple-950 text-sm flex items-center gap-2">
          <Youtube className="w-5 h-5 text-red-500 fill-red-500" />
          <span>S pro coder Tube</span>
        </h3>
        <span className="text-[9px] bg-red-500/10 text-red-600 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
          <Flame className="w-2.5 h-2.5 text-red-500" />
          <span>LATEST VIDEOS</span>
        </span>
      </div>

      <p className="text-xs text-gray-600 leading-relaxed">
        Watch our technical tutorials and tool breakdowns on YouTube.
      </p>

      <div className="space-y-3">
        {videos.map((vid) => (
          <div
            key={vid.id}
            onClick={() => setActiveVideo(vid)}
            className="group relative rounded-2xl overflow-hidden border border-white/50 bg-white/40 hover:border-purple-300 transition-all duration-300 cursor-pointer"
            id={`youtube-card-${vid.id}`}
          >
            {/* Thumbnail */}
            <div className="relative h-28 w-full overflow-hidden">
              <img
                src={vid.thumbnail}
                alt={vid.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/35 group-hover:bg-black/25 transition-all duration-300 flex items-center justify-center">
                <div className="w-9 h-9 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 active:scale-95 transition-transform duration-300">
                  <Play className="w-4 h-4 fill-white ml-0.5" />
                </div>
              </div>
              <span className="absolute bottom-2 right-2 bg-black/75 px-1.5 py-0.5 rounded font-mono text-[10px] text-white">
                {vid.duration}
              </span>
            </div>

            {/* Meta */}
            <div className="p-3">
              <p className="text-[10px] text-red-600 font-bold uppercase tracking-wider">
                {vid.channel}
              </p>
              <h4 className="text-xs font-bold text-purple-950 leading-snug mt-1 group-hover:text-purple-700 transition-colors line-clamp-2">
                {vid.title}
              </h4>
              <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-500">
                <Eye className="w-3 h-3 text-purple-400" />
                <span>{vid.views}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Video Lightbox Player */}
      <AnimatePresence>
        {activeVideo && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveVideo(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-black rounded-3xl border border-white/20 w-full max-w-2xl overflow-hidden shadow-2xl relative z-10"
              id="youtube-player-dialog"
            >
              <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <Youtube className="w-5 h-5 text-red-500" />
                  <span className="text-xs font-bold line-clamp-1">{activeVideo.title}</span>
                </div>
                <button
                  onClick={() => setActiveVideo(null)}
                  className="p-1 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-all"
                >
                  ✕
                </button>
              </div>
              {/* Responsive Iframe Container */}
              <div className="relative aspect-video bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${activeVideo.embedCode}?autoplay=1`}
                  title={activeVideo.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute top-0 left-0 w-full h-full"
                />
              </div>
              <div className="p-4 bg-zinc-900 flex justify-between items-center text-zinc-400 text-xs">
                <span>Channel: {activeVideo.channel}</span>
                <a
                  href={`https://youtube.com/watch?v=${activeVideo.embedCode}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 hover:text-white transition-colors text-red-400 font-semibold"
                >
                  <span>Open YouTube</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
