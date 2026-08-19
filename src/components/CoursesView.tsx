import React, { useState } from "react";
import { 
  BookOpen, Sparkles, Clock, Layers, ChevronRight, Search, 
  CheckCircle2, ArrowLeft, Award, User, Flame, Play, FileText
} from "lucide-react";
import { Course, CourseLesson, BlogPost } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { optimizeImageUrl } from "../utils/imageOptimizer";

interface CoursesViewProps {
  courses: Course[];
  allPosts: BlogPost[];
  onSelectCourseLesson: (course: Course, lesson: CourseLesson, matchedPost?: BlogPost) => void;
  onNavigateHome: () => void;
  selectedCourseSlug?: string | null;
  onSelectCourseBySlug?: (slug: string | null) => void;
}

export default function CoursesView({
  courses,
  allPosts,
  onSelectCourseLesson,
  onNavigateHome,
  selectedCourseSlug,
  onSelectCourseBySlug
}: CoursesViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const safeCourses = courses || [];
  const safePosts = allPosts || [];

  const activeCourse = selectedCourseSlug 
    ? safeCourses.find(c => c.slug === selectedCourseSlug || c.id === selectedCourseSlug)
    : null;

  const categories = ["All", "Web Development", "Artificial Intelligence", "AI Tools", "Coding Tutorials", "Software Architecture"];

  const filteredCourses = safeCourses.filter((course) => {
    const matchesSearch = searchQuery === "" || 
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      course.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === "All" || course.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCat;
  });

  // Helper to generate a vibrant fallback SVG thumbnail if URL is missing
  const getCourseThumbnail = (course: Course) => {
    if (course.thumbnailUrl && course.thumbnailUrl.trim().length > 5) {
      return course.thumbnailUrl;
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#4f46e5" />
          <stop offset="50%" stop-color="#7c3aed" />
          <stop offset="100%" stop-color="#2563eb" />
        </linearGradient>
      </defs>
      <rect width="800" height="450" fill="url(#g)" />
      <circle cx="700" cy="80" r="180" fill="#ffffff" opacity="0.08" />
      <circle cx="100" cy="380" r="220" fill="#ffffff" opacity="0.05" />
      <text x="40" y="380" font-family="sans-serif" font-weight="900" font-size="36" fill="#ffffff" opacity="0.95">${course.category.toUpperCase()}</text>
    </svg>`;
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  };

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 md:px-8 max-w-7xl mx-auto space-y-10" id="courses-view-root">
      {/* Detail View of a Selected Course */}
      {activeCourse ? (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Breadcrumb Back Bar */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => onSelectCourseBySlug?.(null)}
              className="flex items-center gap-2 text-xs font-black text-purple-900 bg-purple-100/80 hover:bg-purple-200 px-4 py-2 rounded-full transition-all cursor-pointer border border-purple-200/80"
              id="back-to-courses-btn"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to All Courses</span>
            </button>
            <span className="text-[10px] uppercase font-mono tracking-widest text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
              Interactive Tech Course 2026
            </span>
          </div>

          {/* Course Hero Banner Card */}
          <div className="relative rounded-[32px] overflow-hidden bg-slate-950 border border-slate-800 text-white shadow-2xl p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-purple-600/90 text-white font-extrabold text-[11px] uppercase tracking-wider">
                  {activeCourse.category}
                </span>
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-[11px] flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  <span>{activeCourse.level || "Beginner 2026"}</span>
                </span>
                <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 font-extrabold text-[11px] flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                  <span>{activeCourse.lessons ? activeCourse.lessons.length : activeCourse.articleCount} Articles</span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight text-white">
                {activeCourse.title}
              </h1>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
                {activeCourse.description}
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-6 text-xs text-slate-400 font-medium border-t border-slate-800/80">
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-purple-400" />
                  <span>Instructor: <strong className="text-slate-200">{activeCourse.author || "Shanawar Ali"}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Est. Time: <strong className="text-slate-200">{activeCourse.estimatedHours || "2 Hours"}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-rose-400" />
                  <span>Updated: <strong className="text-slate-200">{activeCourse.createdAt || "2026"}</strong></span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 relative rounded-2xl overflow-hidden border border-slate-800 shadow-xl group max-h-72">
              <img 
                src={optimizeImageUrl(getCourseThumbnail(activeCourse), 800, 80)} 
                alt={activeCourse.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
                loading="eager"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-slate-200 uppercase bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-lg border border-slate-700">
                  Full Course Curriculum
                </span>
                <span className="text-xs font-black text-emerald-400 flex items-center gap-1 bg-emerald-950/80 backdrop-blur-md px-3 py-1 rounded-lg border border-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>100% Free Access</span>
                </span>
              </div>
            </div>
          </div>

          {/* Course Curriculum Step-by-Step Lessons List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-purple-200/80 pb-3">
              <h2 className="text-lg font-black text-purple-950 flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-600" />
                <span>Course Articles & Step-by-Step Lessons</span>
              </h2>
              <span className="text-xs font-bold text-purple-700 bg-purple-100 px-3 py-1 rounded-full">
                {activeCourse.lessons ? activeCourse.lessons.length : 0} Step-by-Step Lessons
              </span>
            </div>

            <div className="space-y-3">
              {activeCourse.lessons && activeCourse.lessons.length > 0 ? (
                activeCourse.lessons.map((lesson, index) => {
                  // Check if there is a matching post in safePosts by ID or title
                  const matchedPost = safePosts.find(p => 
                    (lesson.articleId && p.id === lesson.articleId) ||
                    (lesson.articleSlug && p.title && p.title.toLowerCase().trim() === lesson.title.toLowerCase().trim()) ||
                    (p.title && p.title.toLowerCase().trim() === lesson.title.toLowerCase().trim())
                  );

                  return (
                    <motion.div
                      key={lesson.id || index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => onSelectCourseLesson(activeCourse, lesson, matchedPost)}
                      className="p-5 rounded-2xl bg-white border border-purple-100 shadow-sm hover:shadow-md hover:border-purple-300 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                      id={`course-lesson-card-${index}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-sm group-hover:bg-purple-700 transition-colors">
                          {lesson.lessonNumber || index + 1}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                              Article #{lesson.lessonNumber || index + 1}
                            </span>
                            <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-purple-400" />
                              <span>{lesson.readTime || "7 min read"}</span>
                            </span>
                          </div>
                          <h3 className="text-base font-extrabold text-purple-950 group-hover:text-purple-700 transition-colors">
                            {lesson.title}
                          </h3>
                          <p className="text-xs text-gray-600 leading-normal line-clamp-2">
                            {lesson.excerpt || lesson.tagline}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2 self-end md:self-center pt-2 md:pt-0">
                        <button className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm group-hover:scale-105 active:scale-95 cursor-pointer">
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>Read Article</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="p-10 text-center bg-purple-50/50 rounded-2xl border border-purple-100 space-y-2">
                  <FileText className="w-8 h-8 text-purple-400 mx-auto" />
                  <p className="text-sm font-bold text-purple-950">No articles attached to this course yet.</p>
                  <p className="text-xs text-gray-500">You can generate articles using the AI Course Generator in Admin Panel.</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      ) : (
        /* Courses Grid List View */
        <div className="space-y-10">
          {/* Hero Header */}
          <div className="relative rounded-[36px] bg-gradient-to-br from-purple-950 via-slate-900 to-indigo-950 p-8 sm:p-12 text-white shadow-2xl overflow-hidden border border-purple-900/50">
            <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 space-y-4 max-w-3xl">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-black uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                <span>Structured Tech & AI Learning 2026</span>
              </span>

              <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                Master Coding & Artificial Intelligence with Guided Courses
              </h1>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
                Step-by-step technical course series crafted for developers, AI researchers, and students. Learn HTML, Web Engineering, AI Models, and System Architecture with structured, hands-on articles.
              </p>

              {/* Search & Category Filter */}
              <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search courses (e.g. HTML, AI, React)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-xs sm:text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-purple-700 text-white shadow-sm"
                    : "bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Responsive Course Grid: Desktop 3 columns, Tablet 2 columns, Mobile 1 column */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="courses-grid-container">
            {filteredCourses.length > 0 ? (
              filteredCourses.map((course) => {
                const articleCount = course.lessons ? course.lessons.length : (course.articleCount || 0);

                return (
                  <motion.div
                    key={course.id || course.slug}
                    whileHover={{ y: -4 }}
                    onClick={() => onSelectCourseBySlug?.(course.slug || course.id)}
                    className="bg-white rounded-[28px] border-2 border-black overflow-hidden shadow-md hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between group"
                    id={`course-card-${course.id}`}
                  >
                    <div>
                      {/* Course Thumbnail Image Box */}
                      <div className="relative h-48 sm:h-52 overflow-hidden bg-slate-900 border-b border-purple-100">
                        <img 
                          src={optimizeImageUrl(getCourseThumbnail(course), 600, 75)} 
                          alt={course.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          decoding="async"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />

                        {/* Article Count Badge */}
                        <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-purple-950/90 backdrop-blur-md text-white text-[11px] font-black px-3 py-1 rounded-xl border border-purple-800 shadow-sm">
                          <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                          <span>{articleCount} Articles</span>
                        </div>
                      </div>

                      {/* Content Box */}
                      <div className="p-6 space-y-3">
                        <h3 className="text-lg font-black text-purple-950 group-hover:text-purple-700 transition-colors leading-snug line-clamp-2">
                          {course.title}
                        </h3>
                        <p className="text-xs text-gray-600 leading-relaxed line-clamp-3 font-normal">
                          {course.description}
                        </p>

                        {/* Category & Level Badges inside the card below title and description */}
                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
                            {course.category}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {course.level || "Beginner"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer / Action */}
                    <div className="px-6 pb-6 pt-2 border-t border-purple-50 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-purple-500" />
                        <span>Est: {course.estimatedHours || "2 Hours"}</span>
                      </span>

                      <button className="px-4 py-2 rounded-xl bg-purple-600 group-hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1 transition-all shadow-sm group-hover:translate-x-1 cursor-pointer">
                        <span>Open Course</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="col-span-1 md:col-span-2 lg:col-span-3 p-12 text-center bg-white rounded-3xl border border-purple-100 shadow-sm space-y-3">
                <BookOpen className="w-10 h-10 text-purple-400 mx-auto" />
                <h3 className="text-base font-extrabold text-purple-950">No Courses Available</h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  {searchQuery || selectedCategory !== "All"
                    ? "No courses match your active search filter. Try clearing your filter."
                    : "No courses have been published yet. Administrators can generate structured courses using the AI Course Generator in the Admin Panel."}
                </p>
                {(searchQuery || selectedCategory !== "All") && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("All");
                    }}
                    className="px-4 py-2 rounded-xl bg-purple-100 text-purple-900 font-bold text-xs hover:bg-purple-200 transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
