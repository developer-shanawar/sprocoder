import React from "react";
import { User, Code2, Globe, Mail, Sparkles, BookOpen, ArrowLeft, ExternalLink, Award, Terminal, CheckCircle } from "lucide-react";
import { BlogPost } from "../types";
import { updateDocumentSeo } from "../utils/seo";

interface AuthorProfilePageProps {
  onNavigateHome: () => void;
  onSelectPost: (post: BlogPost) => void;
  allPosts: BlogPost[];
}

export default function AuthorProfilePage({
  onNavigateHome,
  onSelectPost,
  allPosts
}: AuthorProfilePageProps) {
  React.useEffect(() => {
    updateDocumentSeo({
      title: "Shanawar Ali | Founder & Lead Developer at S Pro Coder",
      description: "Learn about Shanawar Ali, founder and lead technical author at S Pro Coder. Explore his technical guides, software architecture insights, and tutorials.",
      url: "https://www.sprocoder.online/author/shanawar-ali",
      type: "profile"
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Filter posts written by Shanawar Ali or general posts where author matches
  const authorPosts = allPosts.filter(
    (p) => !p.author || p.author.toLowerCase().includes("shanawar") || p.author.toLowerCase().includes("s pro") || p.author.toLowerCase().includes("admin")
  );

  const skills = [
    "TypeScript & JavaScript",
    "React & Next.js",
    "Node.js & Express",
    "Google Gemini API & AI Engineering",
    "Tailwind CSS & Neo-Brutalism",
    "Firebase & Cloud SQL",
    "Web Performance & Technical SEO",
    "System Architecture"
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300 py-4" id="author-profile-container">
      {/* Back button */}
      <div>
        <button
          onClick={onNavigateHome}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/80 backdrop-blur-md border border-purple-200 text-purple-950 font-extrabold hover:bg-purple-700 hover:text-white transition-all cursor-pointer text-xs shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 text-purple-600 group-hover:text-white" />
          <span>Back to Homepage</span>
        </button>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white/60 border-2 border-black rounded-[32px] p-6 sm:p-12 text-purple-950 space-y-8 shadow-md relative overflow-hidden backdrop-blur-sm">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 border-b-2 border-black pb-8 text-center md:text-left">
          <div className="relative">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-tr from-purple-700 via-indigo-600 to-purple-500 text-white font-black text-4xl flex items-center justify-center shadow-lg border-2 border-black">
              SA
            </div>
            <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-full border-2 border-white shadow-xs" title="Verified Author">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>

          <div className="flex-1 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-300 text-[11px] font-black uppercase tracking-wider">
              <Award className="w-3.5 h-3.5 text-purple-700" />
              <span>Founder & Lead Technical Author</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-purple-950 tracking-tight">
              Shanawar Ali
            </h1>
            <p className="text-xs sm:text-sm text-purple-800 font-mono font-bold">
              Software Engineer • AI System Architect • Tech Educator
            </p>
            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed max-w-2xl">
              Shanawar Ali is a full-stack engineer and the founder of <strong>S Pro Coder</strong>. He specializes in designing responsive frontend web applications, architecting modern backend microservices, and integrating advanced generative AI tools into production software. Through S Pro Coder, he has authored comprehensive guides, video tutorials, and interactive coding exercises for thousands of developers worldwide.
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-2">
              <a
                href="mailto:developershanawar@gmail.com"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-900 border border-purple-200 text-xs font-bold hover:bg-purple-100 transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-purple-600" />
                <span>developershanawar@gmail.com</span>
              </a>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-900 border border-purple-200 text-xs font-bold">
                <Globe className="w-3.5 h-3.5 text-purple-600" />
                <span>www.sprocoder.online</span>
              </span>
            </div>
          </div>
        </div>

        {/* Technical Competencies / Skills */}
        <div className="space-y-3">
          <h2 className="text-sm font-black uppercase tracking-wider text-purple-950 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-purple-600" />
            <span>Technical Expertise & Specialties</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill, index) => (
              <span
                key={index}
                className="px-3 py-1 rounded-xl bg-purple-50 text-purple-900 border border-purple-200 text-xs font-semibold"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Bio & Background */}
        <div className="space-y-4 pt-4 border-t border-purple-100 text-sm text-gray-800 leading-relaxed">
          <h2 className="text-lg font-black text-purple-950 flex items-center gap-2">
            <Code2 className="w-5 h-5 text-purple-600" />
            <span>About Shanawar & Editorial Philosophy</span>
          </h2>
          <p className="text-slate-700">
            With years of hands-on experience building web applications and debugging complex production systems, Shanawar founded <strong>S Pro Coder</strong> to bridge the gap between high-level theory and real-world implementation.
          </p>
          <p className="text-slate-700">
            His tutorial philosophy is simple: <em>"Zero fluff, verified code, and clear conceptual foundations."</em> Every article is written with beginner-to-intermediate developers in mind, breaking down complex engineering principles into straightforward steps with runnable examples, live code sandboxes, and direct official reference links.
          </p>
        </div>

        {/* Articles Written by Shanawar Ali */}
        <div className="space-y-4 pt-6 border-t-2 border-black">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-purple-950 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-600" />
              <span>Published Articles & Guides ({authorPosts.length})</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {authorPosts.slice(0, 8).map((post) => (
              <div
                key={post.id}
                onClick={() => onSelectPost(post)}
                className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200 hover:border-purple-600 hover:bg-purple-100/50 transition-all cursor-pointer space-y-2 group shadow-2xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-purple-200 text-purple-950 text-[10px] font-bold uppercase tracking-wider">
                    {post.category || "Tech"}
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">{post.date}</span>
                </div>
                <h3 className="font-extrabold text-sm text-purple-950 group-hover:text-purple-700 transition-colors line-clamp-2">
                  {post.title}
                </h3>
                <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                  {post.excerpt || post.tagline}
                </p>
                <div className="pt-2 flex items-center text-[11px] font-bold text-purple-600 group-hover:underline">
                  Read Article →
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
