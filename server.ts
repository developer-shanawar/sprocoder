import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { INITIAL_POSTS } from "./src/data";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper to slugify titles on the server side
const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
};

// Helper to convert basic markdown to HTML for pre-rendering
function parseMarkdown(md: string): string {
  if (!md) return "";
  return md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Headers
    .replace(/^### (.*$)/gim, '<h3 style="font-size: 1.25rem; font-weight: 700; color: #1e1b4b; margin-top: 1.5rem; margin-bottom: 0.5rem; font-family: system-ui, -apple-system, sans-serif;">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 style="font-size: 1.5rem; font-weight: 800; color: #0f172a; margin-top: 2rem; margin-bottom: 0.75rem; font-family: system-ui, -apple-system, sans-serif; border-left: 4px solid #7c3aed; padding-left: 0.75rem;">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 style="font-size: 1.875rem; font-weight: 950; color: #0f172a; margin-top: 2.5rem; margin-bottom: 1rem; font-family: system-ui, -apple-system, sans-serif;">$1</h1>')
    // Blockquotes
    .replace(/^\> (.*$)/gim, '<blockquote style="border-left: 4px solid #7c3aed; padding: 0.75rem 1rem; font-style: italic; color: #4b5563; background-color: rgba(124, 58, 237, 0.05); border-radius: 0 0.75rem 0.75rem 0; margin: 1.5rem 0;">$1</blockquote>')
    // Bold
    .replace(/\*\*(.*)\*\*/gim, '<strong style="color: #0f172a; font-weight: 700;">$1</strong>')
    // Lists
    .replace(/^\- (.*$)/gim, '<li style="margin-left: 1.5rem; list-style-type: disc; color: #334155; margin-bottom: 0.5rem; line-height: 1.75;">$1</li>')
    // Paragraphs
    .split('\n\n')
    .map(para => {
      const trimmed = para.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith('<h') || trimmed.startsWith('<blockquote') || trimmed.startsWith('<li')) {
        return trimmed;
      }
      return `<p style="color: #334155; line-height: 1.75; margin-bottom: 1.25rem; text-align: justify; font-size: 1rem;">${trimmed}</p>`;
    })
    .join('\n');
}

// Renders structured metadata tables for LLMs and Search Crawlers
function renderStaticLLMMetadataTable(article: any): string {
  const specs = [
    { label: "Document Type", value: "Technical Insights & News Article" },
    { label: "Primary Title", value: article.title || "Untitled" },
    { label: "Category & Domain", value: article.category || "General Technology" },
    { label: "Authoring Authority", value: article.author || "S Pro Coder" },
    { label: "Publication Date", value: article.date || "July 2026" },
    { label: "Estimated Reading Time", value: article.readTime || "5 minutes" },
    { label: "Key Focus Keywords", value: article.tags ? article.tags.join(", ") : "technology, artificial intelligence" },
    { label: "Indexed URL", value: `https://www.sprocoder.online/blog/${slugify(article.title)}.html` }
  ];

  let rows = specs.map(spec => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 0.75rem 1rem; font-weight: 700; color: #1e1b4b; background-color: #f8fafc; font-size: 0.825rem; font-family: monospace; width: 35%; text-transform: uppercase; letter-spacing: 0.05em;">${spec.label}</td>
      <td style="padding: 0.75rem 1rem; color: #334155; font-size: 0.875rem;">${spec.value}</td>
    </tr>
  `).join("");

  return `
  <section style="margin-top: 3rem; margin-bottom: 3rem; border: 2px solid #000000; border-radius: 16px; overflow: hidden; background-color: #ffffff; box-shadow: 4px 4px 0px 0px #000000;" id="llm-data-extraction-table">
    <div style="background-color: #f4f0ff; padding: 1rem; border-bottom: 2px solid #000000; display: flex; align-items: center; gap: 0.5rem;">
      <span style="font-size: 1.25rem;">📊</span>
      <h3 style="margin: 0; font-size: 0.9rem; font-weight: 900; letter-spacing: 0.05em; color: #1e1b4b; text-transform: uppercase;">LLM Knowledge Graph & GEO Data Index</h3>
    </div>
    <table style="width: 100%; border-collapse: collapse; text-align: left;">
      <tbody>
        ${rows}
      </tbody>
    </table>
  </section>
  `;
}

// Inject standard SEO, Open Graph, Twitter, Canonical, and Schema.org tags into template
function injectDynamicSEOTags(template: string, title: string, desc: string, image: string, canonicalUrl: string, articleSchema?: any): string {
  // Remove existing title, description, og, twitter, and canonical tags to avoid duplicates
  let cleaned = template
    .replace(/<title>.*?<\/title>/gi, "")
    .replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/gi, "")
    .replace(/<meta\s+property="og:.*?"\s+content=".*?"\s*\/?>/gi, "")
    .replace(/<meta\s+name="twitter:.*?"\s+content=".*?"\s*\/?>/gi, "")
    .replace(/<link\s+rel="canonical"\s+href=".*?"\s*\/?>/gi, "")
    .replace(/<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/gi, "");

  const seoMetaHtml = `
  <title>${title} | S pro coder</title>
  <meta name="description" content="${desc.replace(/"/g, '&quot;')}" />
  <link rel="canonical" href="${canonicalUrl}" />
  
  <!-- Open Graph -->
  <meta property="og:type" content="${articleSchema ? 'article' : 'website'}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:title" content="${title} | S pro coder" />
  <meta property="og:description" content="${desc.replace(/"/g, '&quot;')}" />
  <meta property="og:image" content="${image}" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${canonicalUrl}" />
  <meta name="twitter:title" content="${title} | S pro coder" />
  <meta name="twitter:description" content="${desc.replace(/"/g, '&quot;')}" />
  <meta name="twitter:image" content="${image}" />
  `;

  let schemaHtml = "";
  if (articleSchema) {
    schemaHtml = `
  <script type="application/ld+json">
    ${JSON.stringify(articleSchema, null, 2)}
  </script>
    `;
  } else {
    const websiteJsonLd = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "S Pro Coder",
      "url": "https://www.sprocoder.online/",
      "description": "Premium dynamic publishing portal covering Tech News, AI News, AI Tools, and Games.",
      "publisher": {
        "@type": "Organization",
        "name": "S Pro Coder",
        "logo": {
          "@type": "ImageObject",
          "url": image
        }
      },
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://www.sprocoder.online/blog?search={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    };
    schemaHtml = `
  <script type="application/ld+json">
    ${JSON.stringify(websiteJsonLd, null, 2)}
  </script>
    `;
  }

  cleaned = cleaned.replace("</head>", `${seoMetaHtml}\n${schemaHtml}\n</head>`);
  return cleaned;
}

// Global Vite reference for server-side pre-rendering transformation in development
let viteDevServerInstance: any = null;

// Global memory cache to prevent blocking fetch timeouts and double-reload issues
let cachedArticles: any[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 30000; // 30 seconds

async function getArticlesCached(): Promise<any[]> {
  const now = Date.now();
  if (cachedArticles && (now - cacheTime < CACHE_TTL)) {
    return cachedArticles;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1200); // 1.2s rapid timeout

  try {
    const dbUrl = "https://fir-pro-coder-default-rtdb.firebaseio.com/articles.json";
    const response = await fetch(dbUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (response.ok) {
      const articlesMap: Record<string, any> = await response.json() || {};
      const articles = Object.values(articlesMap).filter(Boolean);
      cachedArticles = articles;
      cacheTime = now;
      return articles;
    }
  } catch (dbErr) {
    console.warn("Database fetch failed or timed out during pre-rendering, using local fallbacks...", dbErr);
  } finally {
    clearTimeout(timeoutId);
  }

  if (cachedArticles) {
    return cachedArticles;
  }
  return [];
}

// Clean router for dynamic article pre-rendering to serve fast HTML payload
app.get([
  "/blog/:slug",
  "/articles/:slug",
  "/blog/:slug.html",
  "/articles/:slug.html"
], async (req, res, next) => {
  const rawSlug = req.params.slug;
  if (!rawSlug || rawSlug === "" || rawSlug === "index.html") {
    return next();
  }

  const slug = rawSlug.replace(/\.html$/, "");

  try {
    let articles: any[] = [];
    try {
      articles = await getArticlesCached();
    } catch (dbErr) {
      console.warn("getArticlesCached failed during pre-rendering, falling back...", dbErr);
    }

    let matched = articles.find((article: any) => {
      if (!article) return false;
      return slugify(article.title) === slug || article.id === slug;
    });

    // Fallback Reset Engine: Check static INITIAL_POSTS if no database article is matched
    if (!matched) {
      matched = INITIAL_POSTS.find((article: any) => {
        if (!article) return false;
        return slugify(article.title) === slug || article.id === slug;
      });
    }

    if (matched) {
      const isProduction = process.env.NODE_ENV === "production";
      const templatePath = isProduction
        ? path.resolve(process.cwd(), "dist", "index.html")
        : path.resolve(process.cwd(), "index.html");

      const fs = await import("fs");
      if (fs.existsSync(templatePath)) {
        let template = fs.readFileSync(templatePath, "utf-8");

        // Transform index.html if we are in development mode to load Vite modules correctly
        if (!isProduction && viteDevServerInstance) {
          template = await viteDevServerInstance.transformIndexHtml(req.originalUrl, template);
        }

        if (matched.visibility === "private") {
          const privateMeta = `
    <title>Private Article | S pro coder</title>
    <meta name="robots" content="noindex, nofollow" />
          `;
          if (template.includes("<title>")) {
            template = template.replace(/<title>.*?<\/title>/i, privateMeta);
          } else {
            template = template.replace("</head>", `${privateMeta}\n</head>`);
          }

          const privateLayout = `
<div style="min-height: 100vh; background-color: #0b0514; color: #cbd5e1; font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; padding: 2rem;">
  <div style="max-width: 28rem; text-align: center; background-color: rgba(255, 255, 255, 0.03); backdrop-filter: blur(12px); padding: 2.5rem; border-radius: 2rem; border: 1px solid rgba(168, 85, 247, 0.2); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);">
    <div style="width: 4rem; height: 4rem; border-radius: 1rem; background-color: rgba(244, 63, 94, 0.15); display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; border: 1px solid rgba(244, 63, 94, 0.3);">
      <svg style="width: 2rem; height: 2rem; color: #f43f5e;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    </div>
    <h1 style="font-size: 1.5rem; font-weight: 800; color: #ffffff; margin-bottom: 0.75rem;">Private Article</h1>
    <p style="color: #94a3b8; font-size: 0.875rem; line-height: 1.5; margin-bottom: 1.5rem;">This article has been set to private by the administrator and is not accessible publicly.</p>
    <a href="/" style="display: inline-block; background-color: #7c3aed; color: #ffffff; padding: 0.75rem 1.5rem; border-radius: 0.75rem; font-size: 0.875rem; font-weight: 700; text-decoration: none; transition: background-color 0.2s;">Return Home</a>
  </div>
</div>
          `;
          template = template.replace('<div id="root"></div>', `<div id="root">${privateLayout}</div>`);
          template = await injectCustomCode(template);
          return res.status(403).set({ "Content-Type": "text/html" }).end(template);
        }

        const articleJsonLd = {
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          "headline": matched.title,
          "datePublished": matched.date || "2026-07-16",
          "image": [
            matched.thumbnailUrl || "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=80"
          ],
          "author": {
            "@type": "Person",
            "name": matched.author || "S Pro Coder Writer",
            "url": "https://www.sprocoder.online"
          },
          "publisher": {
            "@type": "Organization",
            "name": "S Pro Coder",
            "logo": {
              "@type": "ImageObject",
              "url": "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=200&q=80"
            }
          },
          "description": matched.excerpt || matched.tagline || ""
        };

        // Inject dynamic SEO tags dynamically using the clean helper to prevent duplicates
        template = injectDynamicSEOTags(
          template,
          matched.title,
          matched.excerpt || matched.tagline || "",
          matched.thumbnailUrl || "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=80",
          `https://www.sprocoder.online/blog/${slugify(matched.title)}.html`,
          articleJsonLd
        );

        // Inject the Hydration State
        const hydrationScript = `
    <script>
      window.__INITIAL_POST__ = ${JSON.stringify(matched).replace(/</g, '\\u003c')};
    </script>
        `;
        template = template.replace("</head>", `${hydrationScript}\n</head>`);

        // Render static layout of the article instantly matching our design tokens (Slate Theme) with Off-White Neo-brutalist styling to completely solve the direct load flash issue
        const staticLayout = `
<div style="min-height: 100vh; background-color: #f8fafc; color: #334155; font-family: system-ui, -apple-system, sans-serif; -webkit-font-smoothing: antialiased; padding: 2rem 1rem;">
  <div style="max-width: 56rem; margin: 0 auto;">
    <header style="background-color: #f4f0ff; border: 2px solid #000000; border-radius: 20px; padding: 1rem 1.5rem; display: flex; align-items: center; justify-content: space-between; margin-bottom: 2.5rem; box-shadow: 4px 4px 0px 0px #000000;">
      <a href="/" style="display: flex; align-items: center; gap: 0.75rem; text-decoration: none;">
        <div style="width: 2.5rem; height: 2.5rem; border-radius: 0.75rem; background-color: #7c3aed; display: flex; align-items: center; justify-content: center; font-weight: 900; color: #ffffff; font-size: 1.25rem;">S</div>
        <span style="font-weight: 900; color: #1e1b4b; letter-spacing: 0.05em; font-size: 1rem; text-transform: uppercase;">S PRO CODER</span>
      </a>
      <nav style="display: flex; gap: 1rem;">
        <a href="/" style="color: #1e1b4b; font-size: 0.825rem; font-weight: 800; text-decoration: none; border-bottom: 1.5px solid transparent; padding-bottom: 2px;">Home</a>
        <a href="/tech-news.html" style="color: #1e1b4b; font-size: 0.825rem; font-weight: 800; text-decoration: none; border-bottom: 1.5px solid transparent; padding-bottom: 2px;">Tech News</a>
        <a href="/ai-news.html" style="color: #1e1b4b; font-size: 0.825rem; font-weight: 800; text-decoration: none; border-bottom: 1.5px solid transparent; padding-bottom: 2px;">AI News</a>
        <a href="/ai-tools.html" style="color: #1e1b4b; font-size: 0.825rem; font-weight: 800; text-decoration: none; border-bottom: 1.5px solid transparent; padding-bottom: 2px;">AI Tools</a>
        <a href="/games.html" style="color: #1e1b4b; font-size: 0.825rem; font-weight: 800; text-decoration: none; border-bottom: 1.5px solid transparent; padding-bottom: 2px;">Games</a>
      </nav>
    </header>

    <main style="background-color: #ffffff; border: 2px solid #000000; border-radius: 24px; padding: 2rem md:padding: 3rem; box-shadow: 6px 6px 0px 0px #000000; margin-bottom: 3rem;">
      <div style="margin-bottom: 2rem;">
        <a href="/" style="text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; font-weight: 800; color: #7c3aed; transition: color 0.2s;">
          ← Back to Tech Stream
        </a>
      </div>

      <header style="margin-bottom: 2.5rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 2rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap;">
          <span style="padding: 0.25rem 0.75rem; font-size: 0.75rem; font-weight: 800; background-color: #f4f0ff; color: #7c3aed; border: 1.5px solid #000000; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.05em;">${matched.category || "Tech News"}</span>
          <span style="font-size: 0.75rem; color: #64748b; font-family: monospace; font-weight: 700;">${matched.readTime || '5 min read'}</span>
          <span style="font-size: 0.75rem; color: #64748b; font-weight: 700;">${matched.date || 'July 2026'}</span>
        </div>
        <h1 style="font-size: 2.25rem; font-weight: 950; color: #0f172a; letter-spacing: -0.025em; line-height: 1.25; margin-bottom: 1rem; font-family: system-ui, -apple-system, sans-serif;">${matched.title}</h1>
        <p style="font-size: 1.125rem; color: #475569; font-style: italic; line-height: 1.625; margin-bottom: 1.5rem;">${matched.tagline || ""}</p>

        ${matched.thumbnailUrl ? `
        <div style="width: 100%; border-radius: 16px; overflow: hidden; margin-bottom: 2rem; border: 2px solid #000000;">
          <img src="${matched.thumbnailUrl}" alt="${matched.title.replace(/"/g, '&quot;')}" style="width: 100%; height: auto; display: block; object-fit: cover;" loading="lazy" referrerPolicy="no-referrer" />
        </div>
        ` : ""}

        <div style="display: flex; align-items: center; gap: 1rem; margin-top: 1.5rem;">
          <div style="width: 2.5rem; height: 2.5rem; border-radius: 0.75rem; background-color: #7c3aed; color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 0.875rem;">${matched.author ? matched.author.charAt(0).toUpperCase() : 'S'}</div>
          <div>
            <p style="font-size: 0.875rem; font-weight: 800; color: #0f172a; margin: 0;">${matched.author || 'S Pro Coder'}</p>
            <p style="font-size: 0.75rem; color: #64748b; margin: 0; font-family: monospace;">Published: ${matched.date || 'Just now'}</p>
          </div>
        </div>
      </header>

      <!-- LLM & GEO Structural Knowledge Extraction Table (renders beautifully on the page, fully readable by AI search engines and crawler bots) -->
      ${renderStaticLLMMetadataTable(matched)}

      <article style="font-size: 1.05rem; color: #334155; line-height: 1.8;" id="pre-rendered-article-body">
        ${parseMarkdown(matched.content || "")}
      </article>
    </main>
  </div>
</div>
        `;

        template = template.replace('<div id="root"></div>', `<div id="root">${staticLayout}</div>`);
        template = await injectCustomCode(template);
        return res.status(200).set({ "Content-Type": "text/html" }).end(template);
      }
    }
  } catch (error) {
    console.error("Failed to pre-render requested article page:", error);
  }

  next();
});

// Dynamic pre-rendering for the main pages and category hubs
app.get([
  "/",
  "/tech-news",
  "/ai-news",
  "/ai-tools",
  "/games",
  "/home",
  "/tech-news.html",
  "/ai-news.html",
  "/ai-tools.html",
  "/games.html",
  "/home.html"
], async (req, res, next) => {
  const targetPath = req.path.replace(/\.html$/, "");
  
  try {
    const articlesRaw = await getArticlesCached();
    const articles = articlesRaw.filter((a: any) => a && a.visibility !== "private");

    let pageTitle = "S Pro Coder | Tech News, AI News, AI Tools & Games";
    let pageDesc = "Stay updated with S Pro Coder! Explore the latest tech news, breakthrough AI news, professional reviews of AI tools, and gaming guides and updates.";
    let pageH1 = "S Pro Coder | Premium Technology Portal, AI Insights & Gaming Hub";
    let seoCopy = "";
    let filteredArticles = [...articles];

    if (targetPath === "/tech-news") {
      pageTitle = "Tech News & Latest Technology Updates | S Pro Coder";
      pageDesc = "Read the latest tech news, software development trends, and gadget reviews on S Pro Coder. Expert analysis on modern technology updates.";
      pageH1 = "Latest Technology News & Software Development Trends";
      seoCopy = `Welcome to the S Pro Coder Tech News division, your primary source for up-to-the-minute updates, reviews, and deep-dive analysis on consumer hardware, enterprise software, and global tech industry movements. We monitor the fast-paced world of technology to deliver highly accurate, bite-sized, and expert-level news to developers, system administrators, and technology enthusiasts globally.

      Our tech news coverage spans across multiple critical domains, including cloud computing advancements, serverless database infrastructures, mobile computing, cybersecurity, and open-source frameworks. We break down complex technical announcements into accessible insights, helping you understand how industry shifts impact your daily coding workflows, business decisions, and tech stack choices.

      In addition to major product launches and industry mergers, we place a strong emphasis on developer-centric news. We cover updates from key web development platforms like Vite, React, Next.js, and Tailwind CSS. Understanding changes in these ecosystems is vital for maintaining scalable, secure, and modern applications. We provide comparative analyses, performance benchmarks, and implementation advice for newly released APIs.

      Security is another cornerstone of our technology coverage. With threat landscapes growing more sophisticated each day, our cybersecurity updates highlight vital vulnerability reports, patch notes, and best practices for securing cloud workloads. From encryption protocol updates to zero-trust architecture guidelines, we help you keep your applications safe.

      Explore our extensive repository of technology articles, comparative guides, and reviews. Whether you are interested in the physical hardware powering the servers of tomorrow or the software packages driving frontend interfaces today, our tech news portal is designed to keep you informed, inspired, and prepared for what comes next.`;
      
      filteredArticles = articles.filter((a: any) => {
        const cat = (a.category || "").toLowerCase();
        return cat.includes("tech") || cat.includes("web") || cat.includes("code") || cat.includes("programming") || cat.includes("security") || cat.includes("cloud");
      });
    } else if (targetPath === "/ai-news") {
      pageTitle = "AI News & Artificial Intelligence Breakthroughs | S Pro Coder";
      pageDesc = "Stay ahead with latest AI news, generative AI developments, machine learning breakthroughs, and expert AI research news on S Pro Coder.";
      pageH1 = "Breakthrough AI News & Generative Machine Learning Updates";
      seoCopy = `Step into the future with the S Pro Coder Artificial Intelligence News hub, where we decode the latest advancements, research, and ethics surrounding machine learning, deep neural networks, and generative AI systems. AI is transforming every major sector of human industry, and our goal is to provide a clear, technical, yet highly readable chronicle of this historical transition.

      We cover breakthroughs from top artificial intelligence research labs and industry giants, tracking the release of new large language models (LLMs), multimodal transformers, image synthesis systems, and automated agentic pipelines. Our coverage explains how these complex technologies operate under the hood, translating theoretical research papers into practical developer insights.

      Beyond model architectures, we discuss the societal and business implications of the AI revolution. We explore the rise of cognitive compute clusters, natural language understanding, generative design patterns, and deep learning algorithms. Our analysis dives into topics such as model fine-tuning, retrieval-augmented generation (RAG), and cost-efficient edge execution.

      Whether you are an AI developer looking to integrate advanced Gemini API features into your web application, or a tech enthusiast curious about the ethical considerations of autonomous decision-making systems, our AI news section is your intellectual companion. We cover topics like bias mitigation, alignment protocols, and open-weights vs proprietary model debates.

      Stay informed about the tools, researchers, and companies shaping the next decade of computer science. Our AI news feeds are updated regularly to ensure you never miss a milestone in this exponentially accelerating field. Read our articles today and explore how neural computation is rewriting the rules of software development and human productivity.`;
      
      filteredArticles = articles.filter((a: any) => {
        const cat = (a.category || "").toLowerCase();
        return cat.includes("artificial") || cat.includes("intelligence") || cat.includes("ai news") || cat.includes("machine learning");
      });
    } else if (targetPath === "/ai-tools") {
      pageTitle = "AI Tools Reviews, Directory & Productivity Guides | S Pro Coder";
      pageDesc = "Discover the latest AI tools and platforms to boost your productivity. In-depth reviews, comparative guides, and tutorials for AI tools.";
      pageH1 = "Latest AI Tools Directory, Reviews & Productivity Guides";
      seoCopy = `Maximize your operational efficiency with the S Pro Coder AI Tools review portal, a comprehensive directory and evaluation playground for the world's most innovative artificial intelligence utilities. As hundreds of new AI-powered applications launch every single day, our team separates the high-signal systems from the noise, providing unbiased reviews, comparison grids, and setup tutorials.

      Our reviews focus on key productivity niches, including AI code assistants, automated content generators, video rendering systems, intelligent design interfaces, and developer-centric API tools. We evaluate each platform based on concrete criteria: response speed, API ease of use, formatting precision, price-to-value ratio, and data security standards.

      We understand that choosing the right AI helper can make or break your team's workflow. That is why our guides do not just list features—they provide end-to-end integration walkthroughs. Learn how to plug model endpoints into your existing web services, write optimal prompts for generative workflows, and leverage local edge processors for private data processing.

      Our directory covers general productivity helpers as well as advanced dev tools like GitHub Copilot, Cursor, Gemini Studio, and Hugging Face pipelines. We help you find the best tool for code generation, layout styling, database modeling, and unit testing.

      Whether you are a solo freelancer looking to double your daily output or an enterprise engineering lead seeking to streamline your development lifecycle, our AI tools directory provides the actionable guidance you need to succeed. Browse our latest tool reviews, check our comparisons, and start integrating artificial intelligence into your daily routines today.`;
      
      filteredArticles = articles.filter((a: any) => {
        const cat = (a.category || "").toLowerCase();
        return cat.includes("tool") || cat.includes("ai tool");
      });
    } else if (targetPath === "/games") {
      pageTitle = "Gaming News, Game Reviews & Expert Guides | S Pro Coder";
      pageDesc = "Get the latest gaming news, upcoming game reviews, and gaming guides for console, PC, and mobile gaming. Your ultimate gaming hub at S Pro Coder.";
      pageH1 = "Latest Gaming News, Game Reviews & Strategy Guides";
      seoCopy = `Immerse yourself in the world of gaming with the S Pro Coder Gaming portal, a dedicated space for reviews, news, patch details, and comprehensive gameplay guides. From hardware updates on cutting-edge graphics cards and next-gen consoles to exhaustive strategy reviews of indie hits and triple-A releases, we cover everything a passionate gamer needs.

      Our gaming coverage is driven by a simple belief: gaming is a major pillar of modern technology and creative expression. We track the development of advanced rendering pipelines, real-time physics engines, and virtual environments, explaining how game developers push hardware to its absolute limits to craft immersive experiences.

      We cover gaming news across all platforms, including PlayStation, Xbox, Nintendo Switch, PC, and mobile gaming ecosystems. Our news feeds bring you immediate updates on release dates, trailers, console patches, and industry developer updates. When a major title is announced, we analyze its mechanics, engine, and hardware requirements.

      In addition to news, our detailed strategy guides and gameplay walkthroughs help you conquer difficult levels, optimize your character builds, and master game mechanics. Whether you are looking for secrets in an expansive open-world RPG, competitive tactics for multiplayer shooters, or system optimization tips for PC games, we write guides that are easy to follow and highly detailed.

      Read our latest game reviews to make informed choices before purchasing your next title. We assess games on narrative depth, mechanical fluidity, visual art direction, and sound design. Our gaming corner is where technology and play collide—explore our articles and take your gaming experience to the next level.`;
      
      filteredArticles = articles.filter((a: any) => {
        const cat = (a.category || "").toLowerCase();
        return cat.includes("game") || cat.includes("gaming") || cat.includes("play");
      });
    } else {
      // Homepage /
      seoCopy = `Welcome to S Pro Coder, the ultimate online sanctuary built for software developers, technology enthusiasts, AI practitioners, and passionate gamers. Our platform is dedicated to bringing you the most precise, high-fidelity updates from the ever-evolving landscapes of modern consumer technology, artificial intelligence breakthroughs, emerging web tools, and immersive gaming experiences.

      In the era of rapid technological disruption, staying informed is no longer a luxury—it is a necessity. Our mission is to filter the noise and provide deep, structured, and informative coverage of the latest tech updates. Whether you are searching for reviews of next-generation smartphones, in-depth coding tutorials, artificial intelligence algorithm breakthroughs, or the latest patches and guides for trending video games, S Pro Coder has you covered.

      Our artificial intelligence section explores the boundaries of generative AI systems, natural language models, and agentic workflows. We review the latest AI tools to help developers and creatives automate their workflows, optimize their processes, and build intelligent products. From LLM comparison guides to hands-on reviews of neural design software, we give you the exact technical details you need to make informed decisions.

      For the development community, we specialize in modern framework walkthroughs, focusing on React, Vite, Node.js, and serverless edge databases. Our tutorials are written by experienced engineers who understand the nuances of building high-performance, real-time web applications.

      Furthermore, our gaming corner delivers comprehensive news on upcoming titles, console hardware, gaming guides, and game reviews. We believe that technology and gaming go hand-in-hand, and we aim to foster a community where developers and gamers alike can find high-quality, readable content. Explore our curated categories and start your journey towards technological mastery today.`;
    }

    const isProduction = process.env.NODE_ENV === "production";
    const templatePath = isProduction
      ? path.resolve(process.cwd(), "dist", "index.html")
      : path.resolve(process.cwd(), "index.html");

    const fs = await import("fs");
    if (fs.existsSync(templatePath)) {
      let template = fs.readFileSync(templatePath, "utf-8");

      if (!isProduction && viteDevServerInstance) {
        template = await viteDevServerInstance.transformIndexHtml(req.originalUrl, template);
      }

      // Inject custom SEO title and description meta tags using the clean helper to prevent duplicates
      template = injectDynamicSEOTags(
        template,
        pageH1,
        pageDesc,
        "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=80",
        `https://www.sprocoder.online${targetPath}`
      );

      // Render static HTML layout matching S Pro Coder elegant Slate-theme styles with Off-White Neo-brutalist elements
      let articlesHtml = "";
      if (filteredArticles.length > 0) {
        articlesHtml = filteredArticles.map((art: any) => {
          const slug = slugify(art.title);
          const excerpt = art.excerpt || art.tagline || "";
          const thumbnail = art.thumbnailUrl || "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=600&q=80";
          return `
        <article style="background: #ffffff; border: 2px solid #000000; border-radius: 20px; padding: 2rem; margin-bottom: 2rem; box-shadow: 4px 4px 0px 0px #000000; max-width: 100%;">
          <div style="display: flex; gap: 1.5rem; flex-wrap: wrap-reverse; align-items: start;">
            <div style="flex: 1; min-width: 280px;">
              <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem; flex-wrap: wrap;">
                <span style="background-color: #f4f0ff; color: #7c3aed; border: 1.5px solid #000000; padding: 0.25rem 0.75rem; font-size: 0.75rem; font-weight: 800; border-radius: 8px; text-transform: uppercase;">${art.category || "General"}</span>
                <span style="color: #64748b; font-size: 0.75rem; font-family: monospace; font-weight: 700;">${art.date || "July 2026"}</span>
                <span style="color: #64748b; font-size: 0.75rem; font-weight: 700;">${art.readTime || "5 min read"}</span>
              </div>
              <h2 style="font-size: 1.5rem; font-weight: 900; color: #0f172a; margin-top: 0; margin-bottom: 0.75rem; line-height: 1.35; letter-spacing: -0.02em;">
                <a href="/blog/${slug}.html" style="color: #0f172a; text-decoration: none; border-bottom: 2px solid transparent; transition: border-bottom 0.2s;">${art.title}</a>
              </h2>
              <p style="color: #475569; font-size: 1rem; line-height: 1.6; margin-bottom: 1.5rem; font-style: italic;">${art.tagline || ""}</p>
              <p style="color: #334155; font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.5rem;">${excerpt}</p>
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                <span style="font-size: 0.875rem; color: #0f172a; font-weight: 800;">By ${art.author || "S Pro Coder"}</span>
                <a href="/blog/${slug}.html" style="display: inline-flex; align-items: center; font-size: 0.875rem; font-weight: 800; color: #7c3aed; text-decoration: none; border-bottom: 1.5px solid #7c3aed;">Read Full Article →</a>
              </div>
            </div>
            <div style="width: 140px; height: 100px; overflow: hidden; border-radius: 12px; border: 1.5px solid #000000;">
              <img src="${thumbnail}" alt="${art.title.replace(/"/g, '&quot;')}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover;" />
            </div>
          </div>
        </article>
          `;
        }).join("");
      } else {
        articlesHtml = `
        <div style="background: #ffffff; border: 2px solid #000000; border-radius: 20px; padding: 3rem; text-align: center; box-shadow: 4px 4px 0px 0px #000000;">
          <p style="color: #64748b; font-size: 1rem; font-weight: 700;">No articles found in this category yet. Check back soon for premium updates!</p>
        </div>
        `;
      }

      const staticLayout = `
<div style="background-color: #f8fafc; color: #334155; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; min-height: 100vh; padding: 2rem 1rem; -webkit-font-smoothing: antialiased;">
  <div style="max-width: 64rem; margin: 0 auto;">
    
    <!-- Header -->
    <header style="background-color: #f4f0ff; border: 2px solid #000000; border-radius: 20px; padding: 1rem 1.5rem; display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem; box-shadow: 4px 4px 0px 0px #000000; flex-wrap: wrap; gap: 1.5rem;">
      <div style="display: flex; align-items: center; gap: 1rem;">
        <div style="width: 2.5rem; height: 2.5rem; background-color: #7c3aed; border-radius: 0.75rem; display: flex; align-items: center; justify-content: center; font-weight: 900; color: #ffffff; font-size: 1.25rem;">S</div>
        <span style="font-size: 1.25rem; font-weight: 950; letter-spacing: 0.05em; color: #1e1b4b;">S PRO CODER</span>
      </div>
      <nav style="display: flex; gap: 1.5rem; flex-wrap: wrap;">
        <a href="/" style="color: #1e1b4b; font-size: 0.875rem; font-weight: 800; text-decoration: none;">Home</a>
        <a href="/tech-news.html" style="color: #1e1b4b; font-size: 0.875rem; font-weight: 800; text-decoration: none;">Tech News</a>
        <a href="/ai-news.html" style="color: #1e1b4b; font-size: 0.875rem; font-weight: 800; text-decoration: none;">AI News</a>
        <a href="/ai-tools.html" style="color: #1e1b4b; font-size: 0.875rem; font-weight: 800; text-decoration: none;">AI Tools</a>
        <a href="/games.html" style="color: #1e1b4b; font-size: 0.875rem; font-weight: 800; text-decoration: none;">Games</a>
      </nav>
    </header>

    <!-- H1 Heading & SEO Copy -->
    <main style="background-color: #ffffff; border: 2px solid #000000; border-radius: 24px; padding: 2rem; md:padding: 3rem; box-shadow: 6px 6px 0px 0px #000000; margin-bottom: 3rem;">
      <section style="margin-bottom: 4rem;">
        <h1 style="font-size: 2.25rem; font-weight: 950; letter-spacing: -0.04em; color: #0f172a; margin-top: 0; margin-bottom: 1.5rem; line-height: 1.15;">${pageH1}</h1>
        <div style="font-size: 1.1rem; line-height: 1.75; color: #334155; max-width: 52rem; border-left: 4px solid #7c3aed; padding-left: 1.5rem; margin-bottom: 2rem;">
          ${seoCopy.split("\n\n").map(p => `<p style="margin-bottom: 1.25rem;">${p.trim()}</p>`).join("")}
        </div>
      </section>

      <!-- Articles Grid -->
      <section style="margin-top: 4rem;">
        <h2 style="font-size: 1.75rem; font-weight: 900; color: #0f172a; margin-bottom: 2rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.75rem;">Latest Published Stories</h2>
        <div style="display: grid; grid-template-columns: 1fr; gap: 1.5rem;">
          ${articlesHtml}
        </div>
      </section>
    </main>

    <!-- Footer -->
    <footer style="margin-top: 6rem; padding: 2rem; border-top: 2px solid #e2e8f0; text-align: center; color: #64748b; font-size: 0.875rem;">
      <p>© 2026 S PRO CODER. All Rights Reserved. Crafted for maximum performance and premium speed.</p>
    </footer>

  </div>
</div>
      `;

      template = template.replace('<div id="root"></div>', `<div id="root">${staticLayout}</div>`);
      template = await injectCustomCode(template);
      return res.status(200).set({ "Content-Type": "text/html" }).end(template);
    }
  } catch (error) {
    console.error("Failed to pre-render route:", error);
  }
  next();
});

// Initialize Gemini SDK securely
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
} else {
  console.warn("GEMINI_API_KEY environment variable is not defined. AI blog generation will be unavailable.");
}

// Schema for Gemini JSON output matching our blog post structure
const blogPostSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "Main title of the blog post, elegant and catchy." },
    tagline: { type: Type.STRING, description: "A catchy 1-sentence subtitle or tagline." },
    category: { type: Type.STRING, description: "One of: Design, Technology, Philosophy, Future, or Lifestyle." },
    content: { type: Type.STRING, description: "Full-length detailed blog post body in rich markdown. Include beautiful section headers (##, ###), blockquotes, lists, bold elements, and code snippets where relevant. Must be highly informative and engaging (at least 450 words)." },
    readTime: { type: Type.STRING, description: "Calculated read time based on length, e.g., '5 min read'." },
    tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Array of 3-4 lowercase keyword tags suitable for filtering."
    },
    excerpt: { type: Type.STRING, description: "A brief, compelling 2-sentence summary of the article for list views." },
    author: { type: Type.STRING, description: "An elegant name matching the blog's ambient theme, e.g., Aura Writer, Cosmic Sage, Luminous Mind, Chroma Scholar." }
  },
  required: ["title", "tagline", "category", "content", "readTime", "tags", "excerpt", "author"]
};

// API Endpoint: Generate high-quality blog posts via Gemini
app.post("/api/blog/generate", async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({
        error: "Gemini API client is not configured. Please add your GEMINI_API_KEY in Settings > Secrets."
      });
    }

    const { topic, category, tone } = req.body;
    if (!topic || typeof topic !== "string") {
      return res.status(400).json({ error: "Missing required parameter: topic" });
    }

    const prompt = `Write a high-quality blog post about: "${topic}". ${category ? `Make it fit into the '${category}' category.` : ""} ${tone ? `Write in a ${tone} tone.` : "Write in an insightful, engaging, and slightly poetic yet clear tone."} Include concrete examples, interesting concepts, and deep reflection.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an elite, award-winning blogger and tech philosopher who writes deeply engaging, polished articles. You construct gorgeous articles with clear formatting, rich descriptions, and elegant structures.",
        responseMimeType: "application/json",
        responseSchema: blogPostSchema
      }
    });

    const jsonStr = response.text;
    if (!jsonStr) {
      throw new Error("Empty response received from Gemini");
    }

    const blogPost = JSON.parse(jsonStr.trim());
    // Attach date and random placeholder ID for the frontend to manage if needed
    blogPost.id = "post-" + Date.now();
    blogPost.date = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    blogPost.likes = 0;
    blogPost.isAiGenerated = true;

    return res.json(blogPost);
  } catch (error: any) {
    console.error("Error generating blog post:", error);
    return res.status(500).json({
      error: error.message || "Failed to generate blog post. Please check server logs."
    });
  }
});

// New AI schema for Q&A article formatting with EEO, SEO, GEO optimization
const aiBlogPostSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "Highly engaging and catchy SEO-optimized & GEO-optimized article title." },
    tagline: { type: Type.STRING, description: "Compelling tagline highlighting expertise (EEO)." },
    category: { type: Type.STRING, description: "The category of the article (matches or fits requested or trending category)." },
    content: { 
      type: Type.STRING, 
      description: "Q&A formatted article body. Formulate intriguing questions and answers in simple, conversational, human-like English. Avoid high-level academic English or complex vocabulary. Each question must be wrapped exactly in: <div class=\"p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-xl text-emerald-900 font-bold my-4\">Q: [Question Text]</div>. Keep answers highly informative yet very concise, punchy, and dense to minimize token usage." 
    },
    readTime: { type: Type.STRING, description: "Calculated read time, e.g., '3 min read'." },
    tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Array of 3-4 lowercase keyword tags suitable for filtering."
    },
    excerpt: { type: Type.STRING, description: "A brief, compelling 2-sentence summary." },
    author: { type: Type.STRING, description: "Author name, e.g., 'Chroma Analyst' or 'S Pro Sage'." },
    imageSearchKeyword: { type: Type.STRING, description: "Unsplash search keyword, e.g., 'artificial intelligence' or 'coding'." },
    keywords: { type: Type.STRING, description: "Comma-separated target SEO, EEO, and GEO keywords." },
    competitiveTrends: { type: Type.STRING, description: "A summary of the current competitive trends and search patterns for this topic." }
  },
  required: ["title", "tagline", "category", "content", "readTime", "tags", "excerpt", "author", "imageSearchKeyword", "keywords", "competitiveTrends"]
};

// Robust helper to extract and parse JSON from AI models
function safeJsonParse(text: string): any {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch (e) {
    // Attempt to extract the JSON structure if there's markdown or extra words
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      const candidate = trimmed.substring(start, end + 1);
      try {
        return JSON.parse(candidate);
      } catch (innerError) {
        // Try replacing unescaped newlines inside strings if any
        try {
          const escaped = candidate.replace(/\n/g, "\\n").replace(/\r/g, "\\r");
          return JSON.parse(escaped);
        } catch (finalError) {
          throw new Error("Failed to parse AI-generated content as valid JSON.");
        }
      }
    }
    throw new Error("Could not find a valid JSON object block in the AI response.");
  }
}

// API Endpoint: Advanced AI Article generation & Auto-System
app.post("/api/blog/generate-ai", async (req, res) => {
  try {
    const { option, category, publishTime, huggingFaceKey, imgbbKey } = req.body;
    let blogPost: any = null;

    let prompt = "";
    if (option === "manual") {
      prompt = `Write an optimized tech/science article for the category: "${category}".
The article MUST be structured strictly as a sequence of Questions and Answers (Q&A format).
For each section, formulate an intriguing question and follow it with a conversational, professional, and educational answer.
Each Question MUST be wrapped exactly in the following HTML container:
<div class="p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-xl text-emerald-900 font-bold my-4">Q: [Target Question]</div>

Ensure the article is optimized for EEO (Experience, Expertise, Authoritativeness, and Trustworthiness), SEO (Search Engine Optimization), and GEO (Generative Engine Optimization).
Ensure you include highly relevant target keywords, optimized title, and highlight the latest competitive trends for this topic.
Keep the language extremely simple, direct, conversational, and human-like. Strictly avoid high-level academic English, complex jargon, and robotic transition phrases (avoid words like 'delve', 'moreover', 'tapestry', 'in conclusion').
Ensure the minimum tokens are used: make the answers punchy, dense, high-signal, and extremely concise without any fluff or verbose padding. Limit the total content to the absolute essentials.`;
    } else {
      // Auto system
      prompt = `First, scan the market trends to identify a trending, powerful tech or science category (e.g. AI Agents, Web3 development, Quantum Computing, Serverless Edge, or advanced cybersecurity). 
Select the absolute best trending category and store it in the 'category' field.
Then, write an elite, highly optimized tech/science article for this selected category.
The article MUST be structured strictly as a sequence of Questions and Answers (Q&A format).
For each section, formulate an intriguing question and follow it with a conversational, professional, and educational answer.
Each Question MUST be wrapped exactly in the following HTML container:
<div class="p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-xl text-emerald-900 font-bold my-4">Q: [Target Question]</div>

Ensure the article is optimized for EEO (Experience, Expertise, Authoritativeness, and Trustworthiness), SEO (Search Engine Optimization), and GEO (Generative Engine Optimization).
Ensure you include highly relevant target keywords, optimized title, and highlight the latest competitive trends for this topic.
Keep the language extremely simple, direct, conversational, and human-like. Strictly avoid high-level academic English, complex jargon, and robotic transition phrases.
Ensure the minimum tokens are used: make the answers punchy, dense, high-signal, and extremely concise without any fluff or verbose padding. Limit the total content to the absolute essentials.`;
    }

    if (!ai) {
      return res.status(503).json({
        error: "Secure local Gemini client is not configured on S pro coder. Please add your GEMINI_API_KEY in Settings > Secrets."
      });
    }

    console.log("Generating text content via secure server-side Gemini SDK client...");
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a world-class technology analyst who writes helpful, human-like technical Q&As. Your writing is optimized for EEO, SEO, and GEO. You use direct, conversational, and simple English, completely avoiding high-level complex academic terminology or robotic transition clichés. You keep answers high-signal and extremely concise to minimize token usage.",
        responseMimeType: "application/json",
        responseSchema: aiBlogPostSchema
      }
    });

    const jsonStr = response.text;
    if (!jsonStr) {
      throw new Error("Empty response received from Gemini SDK");
    }
    blogPost = safeJsonParse(jsonStr);
    
    // Select high-quality, relevant image URLs based on keywords or categories as base fallback
    const kw = (blogPost.imageSearchKeyword || "").toLowerCase() + " " + (blogPost.category || "").toLowerCase();
    let selectedImage = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80"; // fallback gorgeous minimalist abstract violet
    
    if (kw.includes("security") || kw.includes("hack") || kw.includes("cyber")) {
      selectedImage = "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80";
    } else if (kw.includes("web") || kw.includes("code") || kw.includes("develop") || kw.includes("program")) {
      selectedImage = "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80";
    } else if (kw.includes("ai") || kw.includes("intelligence") || kw.includes("neural") || kw.includes("robotic")) {
      selectedImage = "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=800&q=80";
    } else if (kw.includes("cloud") || kw.includes("server") || kw.includes("network") || kw.includes("database")) {
      selectedImage = "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80";
    } else if (kw.includes("quantum") || kw.includes("physic") || kw.includes("science")) {
      selectedImage = "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80";
    } else if (kw.includes("blockchain") || kw.includes("crypto") || kw.includes("coin")) {
      selectedImage = "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=800&q=80";
    }

    // Attempt Hugging Face custom visual generation if HF key is provided
    if (huggingFaceKey) {
      try {
        console.log("Generating visual thumbnail via Hugging Face FLUX.1...");
        const imagePrompt = `high resolution professional tech science blog cover: ${blogPost.title}, styled as clean minimalist digital artwork, purple and cyan modern neon developer aesthetic, no text, award winning illustration`;
        
        const hfRes = await fetch("https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${huggingFaceKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ inputs: imagePrompt })
        });

        if (hfRes.ok) {
          const arrayBuffer = await hfRes.arrayBuffer();
          const base64Image = Buffer.from(arrayBuffer).toString("base64");
          
          console.log("Uploading HF generated image to ImgBB cloud storage...");
          const activeImgbbKey = imgbbKey || "95bfa2c260a52e93433daf349259e043";
          const imgbbForm = new URLSearchParams();
          imgbbForm.append("image", base64Image);
          
          const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${activeImgbbKey}`, {
            method: "POST",
            body: imgbbForm
          });
          
          if (imgbbRes.ok) {
            const imgbbData = await imgbbRes.json();
            if (imgbbData?.data?.url) {
              selectedImage = imgbbData.data.url;
              console.log("HF generated image uploaded successfully:", selectedImage);
            }
          } else {
            console.warn("ImgBB upload failed, falling back to Unsplash preset...");
          }
        } else {
          console.warn("HF API returned error, falling back to Unsplash preset...");
        }
      } catch (imgErr) {
        console.error("HF Image generation flow failed, using Unsplash fallback:", imgErr);
      }
    }

    blogPost.thumbnailUrl = selectedImage;
    blogPost.id = "post-ai-" + Date.now();
    blogPost.date = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    blogPost.likes = 0;
    blogPost.savesCount = 0;
    blogPost.isAiGenerated = true;
    blogPost.publishStatus = publishTime ? "scheduled" : "direct";
    blogPost.scheduledDate = publishTime || "";
    blogPost.visibility = "public";

    return res.json(blogPost);
  } catch (error: any) {
    console.error("Error generating AI article:", error);
    return res.status(500).json({
      error: error.message || "Failed to generate AI article. Please check server logs."
    });
  }
});

// Dynamic helper to inject AdSense, verification codes, and custom meta tags into HTML template
async function injectCustomCode(template: string): Promise<string> {
  try {
    const response = await fetch("https://fir-pro-coder-default-rtdb.firebaseio.com/settings.json");
    if (response.ok) {
      const settings = await response.json();
      const customCode = settings?.customCode || {};
      const headCode = customCode.headCode || "";
      const bodyCode = customCode.bodyCode || "";
      
      let modified = template;
      if (headCode && typeof headCode === "string" && headCode.trim().length > 0) {
        if (modified.includes("</head>")) {
          // Put custom code right before closing </head> so that it parses with max compatibility
          modified = modified.replace("</head>", `${headCode}\n</head>`);
        } else {
          modified = `${headCode}\n${modified}`;
        }
      }
      if (bodyCode && typeof bodyCode === "string" && bodyCode.trim().length > 0) {
        if (modified.includes("</body>")) {
          modified = modified.replace("</body>", `${bodyCode}\n</body>`);
        } else {
          modified = `${modified}\n${bodyCode}`;
        }
      }
      return modified;
    }
  } catch (err) {
    console.error("Error fetching or injecting customCode inside server.ts:", err);
  }
  return template;
}

// Dynamic Google AdSense ads.txt crawler endpoint
app.get(["/ads.txt", "/add.txt", "/s/add.txt", "/s/ads.txt"], async (req, res) => {
  try {
    const dbUrl = "https://fir-pro-coder-default-rtdb.firebaseio.com/settings/adsTxt.json";
    const response = await fetch(dbUrl);
    let data = "";
    if (response.ok) {
      data = await response.json() || "";
    }
    
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    if (data && typeof data === "string" && data.trim().length > 0 && !data.includes("pub-0000000000000000")) {
      return res.send(data);
    } else {
      // Default verified AdSense compliant ads.txt/add.txt structure
      const defaultAdsTxt = `google.com, pub-8457467726305206, DIRECT, f08c47fec0942fa0`;
      return res.send(defaultAdsTxt);
    }
  } catch (err) {
    console.error("Error fetching ads.txt:", err);
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.send("google.com, pub-8457467726305206, DIRECT, f08c47fec0942fa0");
  }
});

// Configure Vite or Static files depending on environment
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    viteDevServerInstance = vite;
    app.use(vite.middlewares);

    // Support clean client-side routing on page refresh / copy-pasted URLs in development
    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      
      // Allow API endpoints and standard static assets with dot extensions to fall through (except .html paths which we pre-render)
      if (url.startsWith("/api") || (url.includes(".") && !url.endsWith(".html"))) {
        return next();
      }

      try {
        const fs = await import("fs");
        const templatePath = path.resolve(process.cwd(), "index.html");
        if (fs.existsSync(templatePath)) {
          let template = fs.readFileSync(templatePath, "utf-8");
          template = await vite.transformIndexHtml(url, template);
          template = await injectCustomCode(template);
          res.status(200).set({ "Content-Type": "text/html" }).end(template);
        } else {
          next();
        }
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    // Serve static files with index: false to prevent serving raw index.html on root
    app.use(express.static(distPath, { index: false }));
    
    // Serve index.html with custom code (AdSense and meta verification tags) injected dynamically
    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      
      // Allow API endpoints and standard static assets with dot extensions to fall through (except .html paths which we pre-render)
      if (url.startsWith("/api") || (url.includes(".") && !url.endsWith(".html"))) {
        return next();
      }

      try {
        const fs = await import("fs");
        const templatePath = path.join(distPath, "index.html");
        if (fs.existsSync(templatePath)) {
          let template = fs.readFileSync(templatePath, "utf-8");
          template = await injectCustomCode(template);
          return res.status(200).set({ "Content-Type": "text/html" }).send(template);
        } else {
          return next();
        }
      } catch (err) {
        console.error("Failed to serve production index.html:", err);
        return next();
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

setupViteOrStatic().catch((err) => {
  console.error("Failed to start server:", err);
});
