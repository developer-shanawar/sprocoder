import React from "react";
import { ShieldCheck, CheckCircle2, FileText, Cpu, RefreshCw, Mail, ArrowLeft, Award, BookOpen } from "lucide-react";
import { updateDocumentSeo } from "../utils/seo";

interface EditorialPolicyPageProps {
  onNavigateHome: () => void;
  onNavigateContact?: () => void;
  onNavigateAuthor?: () => void;
}

export default function EditorialPolicyPage({
  onNavigateHome,
  onNavigateContact,
  onNavigateAuthor
}: EditorialPolicyPageProps) {
  React.useEffect(() => {
    updateDocumentSeo({
      title: "Editorial Policy & Publishing Standards",
      description: "Learn about S Pro Coder editorial policy, code testing standards, fact-checking methodology, AI disclosure, and correction procedures.",
      url: "https://www.sprocoder.online/editorial-policy",
      type: "website"
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300 py-4" id="editorial-policy-container">
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

      {/* Main card */}
      <div className="bg-white/60 border-2 border-black rounded-[32px] p-6 sm:p-12 text-purple-950 space-y-8 shadow-md relative overflow-hidden backdrop-blur-sm">
        {/* Header */}
        <div className="text-center space-y-3 border-b-2 border-black pb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-100 text-purple-900 border border-purple-300 text-xs font-black uppercase tracking-widest">
            <ShieldCheck className="w-4 h-4 text-purple-700" />
            <span>Transparency & Trust</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-purple-950 tracking-tight">
            Editorial Policy & Publishing Standards
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Our commitment to technical accuracy, hands-on code verification, editorial integrity, and transparent AI governance at <strong>S Pro Coder</strong>.
          </p>
          <div className="pt-2 flex items-center justify-center gap-4 text-[11px] text-gray-500 font-mono">
            <span>Last Updated: July 2026</span>
            <span>•</span>
            <span>Lead Editor: Shanawar Ali</span>
          </div>
        </div>

        {/* Core Principles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-purple-50/80 border border-purple-200 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h3 className="font-black text-xs uppercase tracking-wider text-purple-950">Tested Code</h3>
            <p className="text-xs text-gray-600 leading-normal">
              Every code snippet and tutorial is executed and verified in active runtime environments before publication.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
            <h3 className="font-black text-xs uppercase tracking-wider text-indigo-950">Human Oversight</h3>
            <p className="text-xs text-gray-600 leading-normal">
              All guides undergo rigorous technical review and editorial scrutiny by Shanawar Ali and our engineering team.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <RefreshCw className="w-4 h-4" />
            </div>
            <h3 className="font-black text-xs uppercase tracking-wider text-emerald-950">Living Content</h3>
            <p className="text-xs text-gray-600 leading-normal">
              We continually update legacy articles to reflect modern library versions, security patches, and best practices.
            </p>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-6 text-sm text-gray-800 leading-relaxed pt-4 border-t border-purple-100">
          
          {/* Section 1 */}
          <div className="space-y-2">
            <h2 className="text-lg font-black text-purple-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-purple-200 text-purple-950 text-xs font-mono font-bold flex items-center justify-center">1</span>
              <span>Our Editorial Mission & Independence</span>
            </h2>
            <p className="text-justify text-slate-700 pl-8">
              At <strong>S Pro Coder</strong> (https://www.sprocoder.online), our mission is to empower developers, students, software engineers, and technology enthusiasts with clear, battle-tested, and practical guides. We believe in providing actionable knowledge that helps developers build reliable web applications, master artificial intelligence tools, and understand modern software architecture.
            </p>
            <p className="text-justify text-slate-700 pl-8">
              Our editorial decisions are entirely independent. We do not accept payment in exchange for positive product reviews, nor do advertisers dictate our technical assessments or editorial conclusions.
            </p>
          </div>

          {/* Section 2 */}
          <div className="space-y-2">
            <h2 className="text-lg font-black text-purple-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-purple-200 text-purple-950 text-xs font-mono font-bold flex items-center justify-center">2</span>
              <span>Code Testing & Technical Verification</span>
            </h2>
            <p className="text-justify text-slate-700 pl-8">
              Technical inaccuracy causes broken builds and lost developer hours. To prevent this, every programming guide, CLI command, and script published on S Pro Coder is tested in isolated environments (such as Node.js, Python 3, Docker, Vite, or modern browsers).
            </p>
            <p className="text-justify text-slate-700 pl-8">
              When software libraries release major breaking changes, we update the corresponding tutorials and add version compatibility notices at the beginning of the article.
            </p>
          </div>

          {/* Section 3 */}
          <div className="space-y-2">
            <h2 className="text-lg font-black text-purple-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-purple-200 text-purple-950 text-xs font-mono font-bold flex items-center justify-center">3</span>
              <span>Authoritative Sources & Citation Standards</span>
            </h2>
            <p className="text-justify text-slate-700 pl-8">
              Our writers and contributors consult primary documentation, including MDN Web Docs, official W3C standards, official framework repositories (React, Next.js, Node.js, Python), and peer-reviewed computer science literature. We explicitly link back to official documentation to ensure readers can verify facts and explore deeper language specifications.
            </p>
          </div>

          {/* Section 4 */}
          <div className="space-y-2">
            <h2 className="text-lg font-black text-purple-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-purple-200 text-purple-950 text-xs font-mono font-bold flex items-center justify-center">4</span>
              <span>AI Governance & Human Review</span>
            </h2>
            <p className="text-justify text-slate-700 pl-8">
              Artificial intelligence tools (such as large language models) may be utilized for initial research synthesis, outlining, or formatting. However, <strong>no article is published without complete human review, editing, and code testing</strong> by our founder Shanawar Ali or verified technical staff.
            </p>
            <p className="text-justify text-slate-700 pl-8">
              We strictly forbid unreviewed automated publishing, hallucinations, recycled generic text, and keyword-stuffed content.
            </p>
          </div>

          {/* Section 5 */}
          <div className="space-y-2">
            <h2 className="text-lg font-black text-purple-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-purple-200 text-purple-950 text-xs font-mono font-bold flex items-center justify-center">5</span>
              <span>Corrections & Updates Policy</span>
            </h2>
            <p className="text-justify text-slate-700 pl-8">
              We welcome corrections from our community. If you spot a typo, an outdated dependency, or an error in any code sample, please notify us. When substantive corrections are made, we update the article and note the modification date.
            </p>
          </div>

          {/* Section 6 */}
          <div className="space-y-2">
            <h2 className="text-lg font-black text-purple-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-purple-200 text-purple-950 text-xs font-mono font-bold flex items-center justify-center">6</span>
              <span>Advertising & Commercial Disclosures</span>
            </h2>
            <p className="text-justify text-slate-700 pl-8">
              S Pro Coder displays digital advertisements (e.g. Google AdSense) to support server hosting and free educational content. Advertising units are distinctly separated from editorial content. Ads do not influence our technical recommendations or editorial grading.
            </p>
          </div>

          {/* Section 7 */}
          <div className="space-y-2">
            <h2 className="text-lg font-black text-purple-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-purple-200 text-purple-950 text-xs font-mono font-bold flex items-center justify-center">7</span>
              <span>Editorial Contact & Feedback</span>
            </h2>
            <p className="text-justify text-slate-700 pl-8">
              For questions regarding our editorial policy, article submissions, or technical corrections, please contact our editorial desk directly at <a href="mailto:developershanawar@gmail.com" className="text-purple-600 font-bold underline">developershanawar@gmail.com</a>.
            </p>
          </div>

        </div>

        {/* Author Bio Snippet */}
        <div className="p-6 rounded-2xl bg-purple-50/60 border border-purple-200 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="w-16 h-16 rounded-full bg-purple-600 text-white font-black text-xl flex items-center justify-center shrink-0 shadow-md">
            SA
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="font-extrabold text-sm text-purple-950">Shanawar Ali</h3>
            <p className="text-xs text-purple-700 font-mono font-bold">Founder & Lead Developer, S Pro Coder</p>
            <p className="text-xs text-gray-600 leading-relaxed">
              Full-stack developer and technical author passionate about open-source web technologies, developer education, and accessible AI engineering.
            </p>
          </div>
          {onNavigateAuthor && (
            <button
              onClick={onNavigateAuthor}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all cursor-pointer shrink-0 shadow-xs"
            >
              View Author Profile
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
