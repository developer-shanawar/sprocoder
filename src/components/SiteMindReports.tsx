import React, { useState, useMemo } from "react";
import { 
  Brain, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Lock, 
  Globe, 
  FileText, 
  Sparkles, 
  ExternalLink, 
  TrendingUp, 
  Eye, 
  RefreshCw, 
  Download, 
  Search,
  Filter,
  BarChart3,
  Check,
  X,
  Zap,
  Info,
  Clock,
  Link as LinkIcon
} from "lucide-react";
import { ref, update, set } from "firebase/database";
import { db } from "../firebase";
import { BlogPost, UserAccount } from "../types";

interface SiteMindReportsProps {
  articles: BlogPost[];
  users: UserAccount[];
  analyticsData: any;
  onRefreshArticles?: () => void;
  onEditArticle?: (article: BlogPost) => void;
}

export default function SiteMindReports({
  articles,
  users,
  analyticsData,
  onRefreshArticles,
  onEditArticle
}: SiteMindReportsProps) {
  const [filterMode, setFilterMode] = useState<"all" | "compliant" | "sub1000" | "over1500" | "private">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditProgress, setAuditProgress] = useState<number | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState("");
  const [autoPrivatizeRunning, setAutoPrivatizeRunning] = useState(false);

  // Helper to count words accurately
  const getWordCount = (content: string): number => {
    if (!content) return 0;
    // Strip HTML and Markdown tags
    const cleanText = content
      .replace(/<[^>]*>/g, " ")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[#*`_~>-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!cleanText) return 0;
    return cleanText.split(/\s+/).filter(Boolean).length;
  };

  // Check for external authoritative referral links (MDN, W3C, GitHub, official docs)
  const getReferralLinks = (content: string): string[] => {
    if (!content) return [];
    const linkMatches = content.match(/href=["']([^"']+)["']|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi) || [];
    const links: string[] = [];
    linkMatches.forEach((match) => {
      const urlMatch = match.match(/https?:\/\/[^\s"')]+/i);
      if (urlMatch && urlMatch[0]) {
        links.push(urlMatch[0]);
      }
    });
    return Array.from(new Set(links));
  };

  // AI Cliche word checker
  const bannedAICliches = [
    "tapestry",
    "delve",
    "delving",
    "in conclusion",
    "in today's fast-paced world",
    "testament to",
    "beacon of",
    "game-changer",
    "revolutionize",
    "embark",
    "furthermore",
    "pivotal",
    "unleash",
    "harnessing the power"
  ];

  const checkAICliches = (content: string): string[] => {
    if (!content) return [];
    const lower = content.toLowerCase();
    return bannedAICliches.filter((cliche) => lower.includes(cliche));
  };

  // Comprehensive Article Audit Analysis
  const auditedArticles = useMemo(() => {
    return articles.map((art) => {
      const words = getWordCount(art.content || "");
      const isCompliant = words >= 1000 && words <= 1500;
      const isSub1000 = words < 1000;
      const isOver1500 = words > 1500;
      const referralLinks = getReferralLinks(art.content || "");
      const hasAuthReferral = referralLinks.some((l) => 
        l.includes("developer.mozilla.org") || 
        l.includes("w3.org") || 
        l.includes("github.com") || 
        l.includes("nodejs.org") || 
        l.includes("react.dev") || 
        l.includes("python.org") || 
        l.includes("wikipedia.org") ||
        l.includes("google.com")
      );
      const cliches = checkAICliches(art.content || "");
      
      // Calculate Quality Score (0 - 100)
      let score = 100;
      if (isSub1000) score -= 40;
      if (isOver1500) score -= 15;
      if (!hasAuthReferral) score -= 15;
      if (referralLinks.length === 0) score -= 10;
      if (cliches.length > 0) score -= Math.min(20, cliches.length * 5);
      if (!art.thumbnailUrl) score -= 10;

      return {
        ...art,
        wordCount: words,
        isCompliant,
        isSub1000,
        isOver1500,
        referralLinks,
        hasAuthReferral,
        cliches,
        qualityScore: Math.max(0, score)
      };
    });
  }, [articles]);

  // Overall Site Mind Statistics
  const stats = useMemo(() => {
    const total = auditedArticles.length;
    if (total === 0) {
      return {
        total: 0,
        publicCount: 0,
        privateCount: 0,
        compliantCount: 0,
        sub1000Count: 0,
        over1500Count: 0,
        avgWordCount: 0,
        totalWords: 0,
        avgQualityScore: 0,
        eeatReadinessScore: 0,
        authoritativeLinkCoverage: 0
      };
    }

    const publicCount = auditedArticles.filter((a) => a.visibility !== "private").length;
    const privateCount = auditedArticles.filter((a) => a.visibility === "private").length;
    const compliantCount = auditedArticles.filter((a) => a.isCompliant).length;
    const sub1000Count = auditedArticles.filter((a) => a.isSub1000).length;
    const over1500Count = auditedArticles.filter((a) => a.isOver1500).length;
    const totalWords = auditedArticles.reduce((acc, a) => acc + a.wordCount, 0);
    const avgWordCount = Math.round(totalWords / total);
    const avgQualityScore = Math.round(auditedArticles.reduce((acc, a) => acc + a.qualityScore, 0) / total);
    const authLinkCount = auditedArticles.filter((a) => a.hasAuthReferral).length;
    const authoritativeLinkCoverage = Math.round((authLinkCount / total) * 100);

    // EEAT & AdSense Monetization Readiness Score
    let eeatScore = 0;
    if (compliantCount / total >= 0.8) eeatScore += 35;
    else eeatScore += Math.round((compliantCount / total) * 35);

    if (authoritativeLinkCoverage >= 70) eeatScore += 25;
    else eeatScore += Math.round((authoritativeLinkCoverage / 100) * 25);

    if (total >= 10) eeatScore += 20;
    else eeatScore += Math.round((total / 10) * 20);

    if (publicCount > 0 && sub1000Count === 0) eeatScore += 20;
    else if (sub1000Count < 3) eeatScore += 10;

    return {
      total,
      publicCount,
      privateCount,
      compliantCount,
      sub1000Count,
      over1500Count,
      avgWordCount,
      totalWords,
      avgQualityScore,
      eeatReadinessScore: Math.min(100, eeatScore),
      authoritativeLinkCoverage
    };
  }, [auditedArticles]);

  // Filtered Articles for the Report List
  const filteredList = useMemo(() => {
    return auditedArticles.filter((art) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        art.title.toLowerCase().includes(q) || 
        art.category.toLowerCase().includes(q) || 
        art.id.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (filterMode === "compliant") return art.isCompliant;
      if (filterMode === "sub1000") return art.isSub1000;
      if (filterMode === "over1500") return art.isOver1500;
      if (filterMode === "private") return art.visibility === "private";
      return true;
    });
  }, [auditedArticles, filterMode, searchQuery]);

  // Auto-Privatize Bot Action: Automatically set visibility="private" for all articles below 1000 words
  const handleAutoPrivatizeSub1000 = async () => {
    const sub1000Posts = auditedArticles.filter((a) => a.isSub1000 && a.visibility !== "private");
    if (sub1000Posts.length === 0) {
      setActionSuccessMsg("All sub-1,000 word articles are already quarantined/private!");
      setTimeout(() => setActionSuccessMsg(""), 4000);
      return;
    }

    setAutoPrivatizeRunning(true);
    let updatedCount = 0;

    try {
      for (const post of sub1000Posts) {
        await update(ref(db, `articles/${post.id}`), {
          visibility: "private"
        });
        updatedCount++;
      }
      setActionSuccessMsg(`Watchdog Bot successfully quarantined ${updatedCount} sub-1,000 word article(s) to Private!`);
      if (onRefreshArticles) onRefreshArticles();
    } catch (err) {
      console.error("Auto privatize error:", err);
      setActionSuccessMsg("Error executing watchdog privatize operation.");
    } finally {
      setAutoPrivatizeRunning(false);
      setTimeout(() => setActionSuccessMsg(""), 5000);
    }
  };

  // Toggle Visibility directly from report table
  const handleTogglePostVisibility = async (post: BlogPost) => {
    const nextVis = post.visibility === "private" ? "public" : "private";
    try {
      await update(ref(db, `articles/${post.id}`), {
        visibility: nextVis
      });
      setActionSuccessMsg(`Article "${post.title.substring(0, 30)}..." marked as ${nextVis.toUpperCase()}!`);
      setTimeout(() => setActionSuccessMsg(""), 3000);
      if (onRefreshArticles) onRefreshArticles();
    } catch (err) {
      console.error("Visibility toggle error:", err);
    }
  };

  // Export Full Site Mind Audit Report as Markdown
  const handleExportReport = () => {
    const now = new Date().toLocaleString();
    let report = `# 🧠 S PRO CODER — WEBSITE MIND & CONTENT QUALITY REPORT\n`;
    report += `Generated at: ${now}\n\n`;
    report += `## 📊 Executive Summary\n`;
    report += `- Total Articles: ${stats.total}\n`;
    report += `- Public Articles: ${stats.publicCount}\n`;
    report += `- Private / Quarantined Articles: ${stats.privateCount}\n`;
    report += `- Compliant (1,000 - 1,500 words): ${stats.compliantCount} (${Math.round((stats.compliantCount / (stats.total || 1)) * 100)}%)\n`;
    report += `- Sub-1,000 Words (Non-Compliant): ${stats.sub1000Count}\n`;
    report += `- Average Article Word Count: ${stats.avgWordCount} words\n`;
    report += `- Total Site Corpus: ${stats.totalWords.toLocaleString()} words\n`;
    report += `- Authoritative Reference Link Coverage: ${stats.authoritativeLinkCoverage}%\n`;
    report += `- Google AdSense & EEAT Quality Score: ${stats.eeatReadinessScore}/100\n\n`;

    report += `## 📑 Detailed Article Quality Breakdown\n\n`;
    report += `| ID | Title | Category | Words | Status | Ref Links | Quality Score |\n`;
    report += `|---|---|---|---|---|---|---|\n`;
    auditedArticles.forEach((a) => {
      report += `| ${a.id} | ${a.title.replace(/\|/g, "-")} | ${a.category} | ${a.wordCount} | ${a.visibility || "public"} | ${a.referralLinks.length} | ${a.qualityScore}/100 |\n`;
    });

    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sprocoder-mind-report-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="site-mind-reports-container">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-purple-100 pb-4">
        <div>
          <h3 className="text-sm font-black text-purple-950 uppercase tracking-wider flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600 animate-pulse" />
            <span>Site Mind, AI Watchdog & Activity Intelligence</span>
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Real-time algorithmic auditor for all website activities, article quality standards (1,000–1,500 words), authoritative citation links, and Google AdSense EEAT readiness.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportReport}
            className="px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Download full analysis report"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
          <button
            type="button"
            onClick={handleAutoPrivatizeSub1000}
            disabled={autoPrivatizeRunning || stats.sub1000Count === 0}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
              stats.sub1000Count > 0
                ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-100 animate-bounce-subtle"
                : "bg-emerald-600 text-white shadow-emerald-100 opacity-90"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>
              {autoPrivatizeRunning ? "Quarantining..." : stats.sub1000Count > 0 ? `Auto-Privatize ${stats.sub1000Count} Sub-1000 Posts` : "Watchdog Clean (0 Offending)"}
            </span>
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold rounded-2xl flex items-center justify-between animate-in zoom-in-95">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            {actionSuccessMsg}
          </span>
          <button onClick={() => setActionSuccessMsg("")} className="text-emerald-600 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: EEAT Readiness Index */}
        <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-900">
              AdSense EEAT Score
            </span>
            <div className="p-1.5 bg-purple-100 rounded-lg text-purple-700">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-950">{stats.eeatReadinessScore}</span>
            <span className="text-xs font-bold text-gray-500">/ 100</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                stats.eeatReadinessScore >= 80 ? "bg-emerald-500" : stats.eeatReadinessScore >= 60 ? "bg-amber-500" : "bg-rose-500"
              }`}
              style={{ width: `${stats.eeatReadinessScore}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-500 font-medium">
            {stats.eeatReadinessScore >= 80 ? "✅ Excellent AdSense Compliance" : "⚠️ Needs More 1,000+ Word Articles"}
          </p>
        </div>

        {/* Metric 2: 1000 - 1500 Words Compliance */}
        <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-900">
              1,000–1,500 Word Compliance
            </span>
            <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-700">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-950">{stats.compliantCount}</span>
            <span className="text-xs font-bold text-gray-500">/ {stats.total} articles</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div 
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${stats.total > 0 ? (stats.compliantCount / stats.total) * 100 : 0}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-500 font-medium">
            {stats.sub1000Count > 0 ? `🚨 ${stats.sub1000Count} articles under 1,000 words` : "✨ 100% word-count compliant"}
          </p>
        </div>

        {/* Metric 3: Average Word Count */}
        <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-900">
              Corpus Average Words
            </span>
            <div className="p-1.5 bg-blue-100 rounded-lg text-blue-700">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-950">{stats.avgWordCount.toLocaleString()}</span>
            <span className="text-xs font-bold text-gray-500">words/art</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1">
            <span>Total: <strong>{stats.totalWords.toLocaleString()}</strong> words</span>
            <span className="text-emerald-600 font-bold">Standard: 1,000–1,500</span>
          </div>
        </div>

        {/* Metric 4: Authority Reference Link Coverage */}
        <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-900">
              Citation Authority Links
            </span>
            <div className="p-1.5 bg-amber-100 rounded-lg text-amber-700">
              <ExternalLink className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-950">{stats.authoritativeLinkCoverage}%</span>
            <span className="text-xs font-bold text-gray-500">coverage</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div 
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${stats.authoritativeLinkCoverage}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-500 font-medium">
            MDN, W3C, GitHub & Official Docs
          </p>
        </div>
      </div>

      {/* Interactive Filter and Search Controls */}
      <div className="bg-white border border-purple-200 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setFilterMode("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterMode === "all" ? "bg-purple-600 text-white shadow-sm" : "bg-purple-50 text-purple-900 hover:bg-purple-100"
              }`}
            >
              All Articles ({stats.total})
            </button>
            <button
              onClick={() => setFilterMode("sub1000")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterMode === "sub1000" ? "bg-rose-600 text-white shadow-sm" : "bg-rose-50 text-rose-800 hover:bg-rose-100"
              }`}
            >
              🚨 Sub-1,000 Words ({stats.sub1000Count})
            </button>
            <button
              onClick={() => setFilterMode("compliant")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterMode === "compliant" ? "bg-emerald-600 text-white shadow-sm" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              }`}
            >
              ✅ 1,000–1,500 Words ({stats.compliantCount})
            </button>
            <button
              onClick={() => setFilterMode("over1500")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterMode === "over1500" ? "bg-amber-600 text-white shadow-sm" : "bg-amber-50 text-amber-800 hover:bg-amber-100"
              }`}
            >
              ⚠️ Over 1,500 Words ({stats.over1500Count})
            </button>
            <button
              onClick={() => setFilterMode("private")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterMode === "private" ? "bg-gray-800 text-white shadow-sm" : "bg-gray-100 text-gray-800 hover:bg-gray-200"
              }`}
            >
              🔒 Private ({stats.privateCount})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search audited articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-purple-200 bg-purple-50/30 text-xs focus:outline-none focus:border-purple-600"
            />
          </div>
        </div>

        {/* Audited Articles Table */}
        <div className="overflow-x-auto border border-purple-100 rounded-2xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-purple-50/70 border-b border-purple-100 text-purple-950 font-black uppercase text-[10px] tracking-wider">
                <th className="p-3">Article</th>
                <th className="p-3">Word Count</th>
                <th className="p-3">Compliance</th>
                <th className="p-3">Citation Links</th>
                <th className="p-3">Quality Score</th>
                <th className="p-3">Visibility</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50">
              {filteredList.map((art) => (
                <tr key={`audited-${art.id}`} className="hover:bg-purple-50/30 transition-colors">
                  <td className="p-3 max-w-xs">
                    <div className="flex items-start gap-2.5">
                      <img
                        src={art.thumbnailUrl}
                        alt="thumb"
                        className="w-10 h-8 object-cover rounded-lg border border-purple-100 shrink-0 mt-0.5"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-purple-950 truncate leading-snug">{art.title}</p>
                        <span className="text-[10px] text-purple-700 font-semibold">{art.category}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 font-mono font-bold">
                    <span className={art.isSub1000 ? "text-rose-600" : art.isOver1500 ? "text-amber-600" : "text-emerald-700"}>
                      {art.wordCount.toLocaleString()} words
                    </span>
                  </td>
                  <td className="p-3">
                    {art.isSub1000 ? (
                      <span className="inline-flex items-center gap-1 text-[9px] bg-rose-100 text-rose-800 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                        <AlertTriangle className="w-3 h-3 text-rose-600" /> Sub-1,000
                      </span>
                    ) : art.isOver1500 ? (
                      <span className="inline-flex items-center gap-1 text-[9px] bg-amber-100 text-amber-800 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                        <Info className="w-3 h-3 text-amber-600" /> Over 1,500
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                        <Check className="w-3 h-3 text-emerald-600" /> Compliant
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <LinkIcon className="w-3.5 h-3.5 text-purple-600" />
                      <span className="font-mono text-purple-900 font-bold">{art.referralLinks.length}</span>
                      {art.hasAuthReferral && (
                        <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-bold">
                          Official Docs
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-purple-950">{art.qualityScore}%</span>
                      <div className="w-12 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            art.qualityScore >= 80 ? "bg-emerald-500" : art.qualityScore >= 60 ? "bg-amber-500" : "bg-rose-500"
                          }`}
                          style={{ width: `${art.qualityScore}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    {art.visibility === "private" ? (
                      <span className="inline-flex items-center gap-1 text-[9px] bg-gray-100 text-gray-700 font-bold px-2 py-0.5 rounded uppercase">
                        <Lock className="w-2.5 h-2.5" /> Private
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded uppercase">
                        <Globe className="w-2.5 h-2.5" /> Public
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right space-x-1.5">
                    <button
                      type="button"
                      onClick={() => handleTogglePostVisibility(art)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                        art.visibility === "private"
                          ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-200"
                          : "bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-200"
                      }`}
                    >
                      {art.visibility === "private" ? "Make Public" : "Make Private"}
                    </button>
                    {onEditArticle && (
                      <button
                        type="button"
                        onClick={() => onEditArticle(art)}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-purple-100 hover:bg-purple-200 text-purple-900 transition-colors cursor-pointer"
                      >
                        Edit / Expand
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400 font-medium">
                    No articles found matching this filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Automated Watchdog Rules & Policy Explanation */}
      <div className="p-5 bg-purple-50/60 border border-purple-200 rounded-3xl space-y-3">
        <h4 className="text-xs font-black text-purple-950 uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-purple-700" />
          <span>Active Watchdog Enforcement Rules</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px] text-gray-700">
          <div className="bg-white p-3.5 rounded-2xl border border-purple-100 space-y-1">
            <span className="font-bold text-purple-950 block">📏 1,000 - 1,500 Words Rule</span>
            <p className="text-gray-500 leading-relaxed">
              Articles below 1,000 words are automatically flagged or quarantined to private to protect Google AdSense and search ranking authority.
            </p>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-purple-100 space-y-1">
            <span className="font-bold text-purple-950 block">🔗 Authoritative Referral Links</span>
            <p className="text-gray-500 leading-relaxed">
              Every tutorial and guide includes working hyperlinks to verified documentation (MDN, W3C, GitHub, official software download sources).
            </p>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-purple-100 space-y-1">
            <span className="font-bold text-purple-950 block">🚫 Anti-AI Cliche Filter</span>
            <p className="text-gray-500 leading-relaxed">
              Detects and removes robotic filler phrases ("tapestry", "delve into", arbitrary hashtag spam) in favor of clear human writing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
