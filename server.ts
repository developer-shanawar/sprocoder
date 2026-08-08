import express from "express";
import path from "path";
import crypto from "crypto";
import zlib from "zlib";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { INITIAL_POSTS } from "./src/data";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper to slugify titles on the server side
const slugify = (text: any): string => {
  if (!text) return "";
  return String(text)
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
    { label: "Indexed URL", value: `https://www.sprocoder.online/blog/${slugify(article.title)}` }
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

  const safeDesc = escapeHtml(desc);
  const safeTitle = escapeHtml(title);

  const seoMetaHtml = `
  <title>${safeTitle} | S pro coder</title>
  <meta name="description" content="${safeDesc}" />
  <link rel="canonical" href="${canonicalUrl}" />
  
  <!-- Open Graph -->
  <meta property="og:type" content="${articleSchema ? 'article' : 'website'}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:title" content="${safeTitle} | S pro coder" />
  <meta property="og:description" content="${safeDesc}" />
  <meta property="og:image" content="${image}" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${canonicalUrl}" />
  <meta name="twitter:title" content="${safeTitle} | S pro coder" />
  <meta name="twitter:description" content="${safeDesc}" />
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

// Serve SEO and AI indexing files explicitly
app.get("/robots.txt", async (req, res) => {
  try {
    const fs = await import("fs");
    const filePath = path.resolve(process.cwd(), "public", "robots.txt");
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      return res.status(200).set({ "Content-Type": "text/plain" }).send(content);
    }
  } catch (e) {}
  return res.status(200).set({ "Content-Type": "text/plain" }).send("User-agent: *\nAllow: /\n\nSitemap: https://www.sprocoder.online/sitemap.xml\n");
});

app.get("/sitemap.xml", async (req, res) => {
  try {
    const fs = await import("fs");
    const filePath = path.resolve(process.cwd(), "public", "sitemap.xml");
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      return res.status(200).set({ "Content-Type": "application/xml" }).send(content);
    }
  } catch (e) {}
  return res.status(404).end();
});

app.get("/llms.txt", async (req, res) => {
  try {
    const fs = await import("fs");
    const filePath = path.resolve(process.cwd(), "public", "llms.txt");
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      return res.status(200).set({ "Content-Type": "text/plain" }).send(content);
    }
  } catch (e) {}
  return res.status(404).end();
});

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
          `https://www.sprocoder.online/blog/${slugify(matched.title)}`,
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
        <a href="/tech-news" style="color: #1e1b4b; font-size: 0.825rem; font-weight: 800; text-decoration: none; border-bottom: 1.5px solid transparent; padding-bottom: 2px;">Tech News</a>
        <a href="/ai-news" style="color: #1e1b4b; font-size: 0.825rem; font-weight: 800; text-decoration: none; border-bottom: 1.5px solid transparent; padding-bottom: 2px;">AI News</a>
        <a href="/ai-tools" style="color: #1e1b4b; font-size: 0.825rem; font-weight: 800; text-decoration: none; border-bottom: 1.5px solid transparent; padding-bottom: 2px;">AI Tools</a>
        <a href="/games" style="color: #1e1b4b; font-size: 0.825rem; font-weight: 800; text-decoration: none; border-bottom: 1.5px solid transparent; padding-bottom: 2px;">Games</a>
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
          <img src="${matched.thumbnailUrl}" alt="${escapeHtml(matched.title || '')}" style="width: 100%; height: auto; display: block; object-fit: cover;" loading="lazy" referrerPolicy="no-referrer" />
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
                <a href="/blog/${slug}" style="color: #0f172a; text-decoration: none; border-bottom: 2px solid transparent; transition: border-bottom 0.2s;">${art.title}</a>
              </h2>
              <p style="color: #475569; font-size: 1rem; line-height: 1.6; margin-bottom: 1.5rem; font-style: italic;">${art.tagline || ""}</p>
              <p style="color: #334155; font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.5rem;">${excerpt}</p>
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                <span style="font-size: 0.875rem; color: #0f172a; font-weight: 800;">By ${art.author || "S Pro Coder"}</span>
                <a href="/blog/${slug}" style="display: inline-flex; align-items: center; font-size: 0.875rem; font-weight: 800; color: #7c3aed; text-decoration: none; border-bottom: 1.5px solid #7c3aed;">Read Full Article →</a>
              </div>
            </div>
            <div style="width: 140px; height: 100px; overflow: hidden; border-radius: 12px; border: 1.5px solid #000000;">
              <img src="${thumbnail}" alt="${escapeHtml(art.title || '')}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover;" />
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
        <a href="/tech-news" style="color: #1e1b4b; font-size: 0.875rem; font-weight: 800; text-decoration: none;">Tech News</a>
        <a href="/ai-news" style="color: #1e1b4b; font-size: 0.875rem; font-weight: 800; text-decoration: none;">AI News</a>
        <a href="/ai-tools" style="color: #1e1b4b; font-size: 0.875rem; font-weight: 800; text-decoration: none;">AI Tools</a>
        <a href="/games" style="color: #1e1b4b; font-size: 0.875rem; font-weight: 800; text-decoration: none;">Games</a>
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

// Helper function to escape XML strings for SVG generation
function escapeXml(unsafe: string): string {
  return String(unsafe || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapTextLines(text: string, maxCharsPerLine: number = 28): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if ((currentLine + " " + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + " " + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.slice(0, 3); // Max 3 lines
}

// Dynamic 16:9 SVG Thumbnail Generator with Multiple Color & Shape Variants
export // 12 Modern Visual Themes for Thumbnails
const THUMBNAIL_VARIANTS = [
  // 0: Emerald Cyberspace
  {
    bgGrad: `<stop offset="0%" stop-color="#051016"/><stop offset="50%" stop-color="#022c22"/><stop offset="100%" stop-color="#064e3b"/>`,
    accentGrad: `<stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#06b6d4"/>`,
    stroke: "#34d399", webColor: "#10b981", webSub: "#6ee7b7", badgeText: "#ffffff",
    shapes: `<circle cx="160" cy="140" r="280" fill="#10b981" opacity="0.18" filter="blur(70px)"/>
             <circle cx="1120" cy="580" r="280" fill="#06b6d4" opacity="0.18" filter="blur(70px)"/>
             <path d="M 0 120 L 1280 120 M 0 240 L 1280 240 M 0 360 L 1280 360 M 0 480 L 1280 480 M 0 600 L 1280 600" stroke="#ffffff" stroke-opacity="0.04" stroke-width="1"/>
             <path d="M 213 0 L 213 720 M 426 0 L 426 720 M 640 0 L 640 720 M 853 0 L 853 720 M 1066 0 L 1066 720" stroke="#ffffff" stroke-opacity="0.04" stroke-width="1"/>`
  },
  // 1: Cyber Violet & Electric Neon
  {
    bgGrad: `<stop offset="0%" stop-color="#0d0722"/><stop offset="50%" stop-color="#2e1065"/><stop offset="100%" stop-color="#4c1d95"/>`,
    accentGrad: `<stop offset="0%" stop-color="#a855f7"/><stop offset="100%" stop-color="#ec4899"/>`,
    stroke: "#c084fc", webColor: "#a855f7", webSub: "#e9d5ff", badgeText: "#ffffff",
    shapes: `<circle cx="200" cy="520" r="300" fill="#a855f7" opacity="0.22" filter="blur(80px)"/>
             <circle cx="1080" cy="160" r="260" fill="#ec4899" opacity="0.2" filter="blur(80px)"/>
             <rect x="100" y="480" width="120" height="120" rx="20" fill="none" stroke="#a855f7" stroke-opacity="0.15" stroke-width="2" transform="rotate(25 100 480)"/>
             <rect x="1000" y="100" width="160" height="160" rx="30" fill="none" stroke="#ec4899" stroke-opacity="0.15" stroke-width="2" transform="rotate(-15 1000 100)"/>`
  },
  // 2: Sunset Crimson & Amber Gold
  {
    bgGrad: `<stop offset="0%" stop-color="#180309"/><stop offset="50%" stop-color="#450a0a"/><stop offset="100%" stop-color="#7f1d1d"/>`,
    accentGrad: `<stop offset="0%" stop-color="#f43f5e"/><stop offset="100%" stop-color="#f59e0b"/>`,
    stroke: "#fb7185", webColor: "#f43f5e", webSub: "#fecdd3", badgeText: "#ffffff",
    shapes: `<circle cx="150" cy="150" r="280" fill="#f43f5e" opacity="0.2" filter="blur(75px)"/>
             <circle cx="1100" cy="550" r="300" fill="#f59e0b" opacity="0.18" filter="blur(75px)"/>
             <line x1="-100" y1="200" x2="1380" y2="500" stroke="#f59e0b" stroke-opacity="0.08" stroke-width="3"/>
             <line x1="-100" y1="240" x2="1380" y2="540" stroke="#f43f5e" stroke-opacity="0.08" stroke-width="2"/>`
  },
  // 3: Oceanic Azure & Sapphire
  {
    bgGrad: `<stop offset="0%" stop-color="#030712"/><stop offset="50%" stop-color="#0f172a"/><stop offset="100%" stop-color="#1e3a8a"/>`,
    accentGrad: `<stop offset="0%" stop-color="#0284c7"/><stop offset="100%" stop-color="#38bdf8"/>`,
    stroke: "#38bdf8", webColor: "#38bdf8", webSub: "#bae6fd", badgeText: "#ffffff",
    shapes: `<circle cx="1100" cy="180" r="320" fill="#0284c7" opacity="0.22" filter="blur(80px)"/>
             <circle cx="180" cy="580" r="260" fill="#38bdf8" opacity="0.18" filter="blur(80px)"/>
             <polygon points="1100,50 1200,200 1000,180" fill="#0284c7" opacity="0.06"/>
             <polygon points="100,500 250,650 50,600" fill="#38bdf8" opacity="0.06"/>`
  },
  // 4: Obsidian Gold & Emerald Luxe
  {
    bgGrad: `<stop offset="0%" stop-color="#080b10"/><stop offset="50%" stop-color="#111827"/><stop offset="100%" stop-color="#1f2937"/>`,
    accentGrad: `<stop offset="0%" stop-color="#eab308"/><stop offset="100%" stop-color="#10b981"/>`,
    stroke: "#fde047", webColor: "#eab308", webSub: "#fef08a", badgeText: "#000000",
    shapes: `<circle cx="200" cy="160" r="280" fill="#eab308" opacity="0.16" filter="blur(75px)"/>
             <circle cx="1080" cy="560" r="280" fill="#10b981" opacity="0.18" filter="blur(75px)"/>
             <rect x="80" y="80" width="1120" height="560" rx="20" fill="none" stroke="#eab308" stroke-opacity="0.1" stroke-width="1.5"/>`
  },
  // 5: Matrix Cyan & Neon Mint
  {
    bgGrad: `<stop offset="0%" stop-color="#021013"/><stop offset="50%" stop-color="#042f2e"/><stop offset="100%" stop-color="#115e59"/>`,
    accentGrad: `<stop offset="0%" stop-color="#14b8a6"/><stop offset="100%" stop-color="#0ea5e9"/>`,
    stroke: "#2dd4bf", webColor: "#2dd4bf", webSub: "#99f6e4", badgeText: "#ffffff",
    shapes: `<circle cx="160" cy="540" r="300" fill="#14b8a6" opacity="0.2" filter="blur(80px)"/>
             <circle cx="1100" cy="140" r="280" fill="#0ea5e9" opacity="0.2" filter="blur(80px)"/>
             <pattern id="dotPattern" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
               <circle cx="15" cy="15" r="1.5" fill="#ffffff" opacity="0.08"/>
             </pattern>
             <rect width="1280" height="720" fill="url(#dotPattern)"/>`
  },
  // 6: Solar Plasma & Fire Amber
  {
    bgGrad: `<stop offset="0%" stop-color="#1a0200"/><stop offset="50%" stop-color="#450d00"/><stop offset="100%" stop-color="#7c2d12"/>`,
    accentGrad: `<stop offset="0%" stop-color="#ff5722"/><stop offset="100%" stop-color="#ffb300"/>`,
    stroke: "#ff8f00", webColor: "#ff8f00", webSub: "#ffe082", badgeText: "#ffffff",
    shapes: `<circle cx="640" cy="360" r="450" fill="#ff5722" opacity="0.12" filter="blur(100px)"/>
             <circle cx="1150" cy="120" r="220" fill="#ffb300" opacity="0.2" filter="blur(60px)"/>
             <path d="M 100 600 Q 640 100 1180 600" stroke="#ff8f00" stroke-opacity="0.15" stroke-width="3" fill="none"/>`
  },
  // 7: Quantum Indigo & Ultra Magenta
  {
    bgGrad: `<stop offset="0%" stop-color="#090314"/><stop offset="50%" stop-color="#1e1035"/><stop offset="100%" stop-color="#3b0764"/>`,
    accentGrad: `<stop offset="0%" stop-color="#8b5cf6"/><stop offset="100%" stop-color="#d946ef"/>`,
    stroke: "#e879f9", webColor: "#d946ef", webSub: "#f5d0fe", badgeText: "#ffffff",
    shapes: `<circle cx="1100" cy="500" r="320" fill="#d946ef" opacity="0.22" filter="blur(80px)"/>
             <circle cx="200" cy="200" r="280" fill="#8b5cf6" opacity="0.2" filter="blur(75px)"/>
             <polygon points="640,100 700,220 580,220" fill="#d946ef" opacity="0.08"/>
             <polygon points="200,450 280,580 120,580" fill="#8b5cf6" opacity="0.08"/>`
  },
  // 8: Deep Space Aurora & Ice Blue
  {
    bgGrad: `<stop offset="0%" stop-color="#020617"/><stop offset="50%" stop-color="#0f172a"/><stop offset="100%" stop-color="#1e293b"/>`,
    accentGrad: `<stop offset="0%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#818cf8"/>`,
    stroke: "#a5f3fc", webColor: "#38bdf8", webSub: "#c7d2fe", badgeText: "#000000",
    shapes: `<circle cx="150" cy="580" r="300" fill="#38bdf8" opacity="0.2" filter="blur(80px)"/>
             <circle cx="1100" cy="180" r="300" fill="#818cf8" opacity="0.2" filter="blur(80px)"/>
             <line x1="0" y1="0" x2="1280" y2="720" stroke="#38bdf8" stroke-opacity="0.06" stroke-width="2"/>`
  },
  // 9: Midnight Titanium & Neon Lime
  {
    bgGrad: `<stop offset="0%" stop-color="#05080a"/><stop offset="50%" stop-color="#141c22"/><stop offset="100%" stop-color="#1f2d36"/>`,
    accentGrad: `<stop offset="0%" stop-color="#84cc16"/><stop offset="100%" stop-color="#06b6d4"/>`,
    stroke: "#a3e635", webColor: "#84cc16", webSub: "#d9f99d", badgeText: "#000000",
    shapes: `<circle cx="220" cy="180" r="280" fill="#84cc16" opacity="0.18" filter="blur(70px)"/>
             <circle cx="1060" cy="540" r="280" fill="#06b6d4" opacity="0.18" filter="blur(70px)"/>
             <rect x="80" y="80" width="1120" height="560" rx="16" fill="none" stroke="#84cc16" stroke-opacity="0.12" stroke-width="2" stroke-dasharray="10 10"/>`
  },
  // 10: Cosmic Amethyst & Cobalt
  {
    bgGrad: `<stop offset="0%" stop-color="#0a0518"/><stop offset="50%" stop-color="#1e1145"/><stop offset="100%" stop-color="#311b92"/>`,
    accentGrad: `<stop offset="0%" stop-color="#7c4dff"/><stop offset="100%" stop-color="#00b0ff"/>`,
    stroke: "#b388ff", webColor: "#00b0ff", webSub: "#80d8ff", badgeText: "#ffffff",
    shapes: `<circle cx="1080" cy="200" r="310" fill="#7c4dff" opacity="0.25" filter="blur(85px)"/>
             <circle cx="200" cy="520" r="270" fill="#00b0ff" opacity="0.2" filter="blur(75px)"/>
             <circle cx="640" cy="360" r="320" fill="none" stroke="#7c4dff" stroke-opacity="0.08" stroke-width="2"/>`
  },
  // 11: Dark Prism Ruby & Rose Gold
  {
    bgGrad: `<stop offset="0%" stop-color="#120207"/><stop offset="50%" stop-color="#2d0612"/><stop offset="100%" stop-color="#4a0e17"/>`,
    accentGrad: `<stop offset="0%" stop-color="#fb7185"/><stop offset="100%" stop-color="#f43f5e"/>`,
    stroke: "#fecdd3", webColor: "#fb7185", webSub: "#ffe4e6", badgeText: "#ffffff",
    shapes: `<circle cx="180" cy="180" r="290" fill="#fb7185" opacity="0.22" filter="blur(75px)"/>
             <circle cx="1100" cy="520" r="290" fill="#f43f5e" opacity="0.2" filter="blur(75px)"/>
             <rect x="120" y="120" width="1040" height="480" rx="24" fill="none" stroke="#fb7185" stroke-opacity="0.1" stroke-width="2"/>`
  }
];

function generateArticleThumbnailSvg({
  category,
  title,
  websiteName = "sprocoder.online",
  variantIndex
}: {
  category: string;
  title: string;
  websiteName?: string;
  variantIndex?: number;
}): string {
  const safeCat = escapeXml((category || "TECH").toUpperCase());
  const safeWeb = escapeXml(websiteName || "sprocoder.online");
  const lines = wrapTextLines(title || "Latest 2026 Web Tech & AI News", 26);

  // Determine color and shape variant across 12 themes
  const titleHash = String(title || "article").split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const v = (variantIndex !== undefined && !isNaN(variantIndex)) 
    ? Math.abs(variantIndex) % THUMBNAIL_VARIANTS.length 
    : Math.abs(titleHash) % THUMBNAIL_VARIANTS.length;

  const theme = THUMBNAIL_VARIANTS[v];

  const tspanLines = lines
    .map(
      (line, idx) =>
        `<tspan x="100" dy="${idx === 0 ? "0" : "58"}">${escapeXml(line)}</tspan>`
    )
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
    <defs>
      <linearGradient id="bgGrad_${v}" x1="0%" y1="0%" x2="100%" y2="100%">
        ${theme.bgGrad}
      </linearGradient>
      <linearGradient id="accentGrad_${v}" x1="0%" y1="0%" x2="100%" y2="0%">
        ${theme.accentGrad}
      </linearGradient>
      <linearGradient id="cardGrad_${v}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.09"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0.02"/>
      </linearGradient>
    </defs>

    <!-- 16:9 Aspect Ratio Canvas Background -->
    <rect width="1280" height="720" fill="url(#bgGrad_${v})"/>

    <!-- Dynamic Theme Ambient Shapes -->
    ${theme.shapes}

    <!-- Modern Framed Glass Card -->
    <rect x="60" y="60" width="1160" height="600" rx="28" fill="url(#cardGrad_${v})" stroke="${theme.stroke}" stroke-opacity="0.25" stroke-width="2"/>

    <!-- Corner Decorative Mounting Brackets -->
    <path d="M 60 100 L 60 60 L 100 60" stroke="${theme.stroke}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M 1220 100 L 1220 60 L 1180 60" stroke="${theme.stroke}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M 60 620 L 60 660 L 100 660" stroke="${theme.stroke}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M 1220 620 L 1220 660 L 1180 660" stroke="${theme.stroke}" stroke-width="4" fill="none" stroke-linecap="round"/>

    <!-- Category Tag Badge (Top Left) -->
    <g transform="translate(100, 110)">
      <rect width="250" height="52" rx="26" fill="url(#accentGrad_${v})"/>
      <text x="125" y="33" fill="${theme.badgeText}" font-family="system-ui, -apple-system, Roboto, sans-serif" font-weight="900" font-size="19" text-anchor="middle" letter-spacing="1.5">
        ${safeCat}
      </text>
    </g>

    <!-- Website Branding (Right Side) -->
    <g transform="translate(1180, 130)">
      <text x="0" y="0" fill="${theme.webColor}" font-family="system-ui, -apple-system, Roboto, sans-serif" font-weight="900" font-size="24" text-anchor="end" letter-spacing="1">
        ${safeWeb}
      </text>
      <text x="0" y="28" fill="${theme.webSub}" font-family="system-ui, -apple-system, Roboto, sans-serif" font-weight="700" font-size="14" text-anchor="end" opacity="0.85">
        S PRO CODER OFFICIAL
      </text>
    </g>

    <!-- Article Main Title (Center) -->
    <g transform="translate(100, 310)">
      <text fill="#ffffff" font-family="system-ui, -apple-system, Roboto, sans-serif" font-weight="900" font-size="46" letter-spacing="-0.5">
        ${tspanLines}
      </text>
    </g>

    <!-- Bottom Accent Line -->
    <rect x="100" y="580" width="980" height="6" rx="3" fill="url(#accentGrad_${v})"/>
  </svg>`;

  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

// 2026 Category-Specific Tech Trends Seed Topics
const CATEGORY_TREND_SEEDS: Record<string, string[]> = {
  "Artificial Intelligence": [
    "GPT-5 vs Gemini 3.5: Next-Gen Multimodal Reasoning and Architectural Benchmarks",
    "Claude 3.5 Sonnet & Computer Use: Autonomous AI Workflows and Enterprise Agents",
    "OpenAI Sora v2 & Veo: High-Fidelity Generative Video & Physics Engine Breakthroughs",
    "DeepSeek V3 & Open-Weight MoE Models: Cost-Effective AI Inference at Scale",
    "Real-time Multimodal Voice Models & Audio-to-Audio AI Neural Pipelines in 2026",
    "AGI Benchmarks & Alignment Frameworks: Autonomous AI Decision Making",
    "Fine-Tuning Llama 3.3 & DeepSeek MoE with LoRA and QLoRA on Enterprise Datasets"
  ],
  "AI Tools": [
    "Top 10 AI Productivity Tools in 2026 for Automated Research and Workflow Execution",
    "Best AI Coding Assistants in 2026: Cursor, GitHub Copilot, Gemini Code Assist, and Claude Dev",
    "Autonomous AI Agents for Data Analysis, SEO Content Generation, and Enterprise Automation",
    "Top Generative AI Video & Image Generators for Designers in 2026",
    "Local AI Runner Tools: Ollama, LM Studio, and Jan.ai for Private LLM Deployment"
  ],
  "Tech News": [
    "Silicon Tech War: Custom AI Chips (NVIDIA B200, Google TPU v6, Apple M5) Shaking the Industry",
    "Quantum Computing Milestones in 2026: Error-Corrected Qubits and Commercial Quantum Encryption",
    "Autonomous EV Innovations & Solid-State Battery Breakthroughs in 2026",
    "The 2026 Global Tech Outlook: AI Regulations, Semiconductor Alliances, and Market Shifts",
    "Satellite Direct-to-Cell Broadband and 6G Network Standardization Progress"
  ],
  "Web Development": [
    "React 19 Server Components, Actions, and Compiler Optimizations in 2026",
    "Next.js 15+ App Router, Partial Prerendering, and Micro-Frontend Architecture",
    "Tailwind CSS v4 Engine: CSS-First Theme Architecture & Ultra-Fast Builds",
    "Vite 6 and Rolldown: Replacing Legacy Bundlers in Modern Web Applications",
    "TypeScript 5.8+ Best Practices: Advanced Type Inference and Performance Tuning"
  ],
  "Games": [
    "Unreal Engine 5.5+ & Photorealistic Ray Tracing in Next-Gen Games",
    "AI-Driven Non-Player Characters (NPCs) & Dynamic Procedural World Generation",
    "Handheld Gaming PCs in 2026: Steam Deck 2, Custom ARM APUs, and Thermal Efficiency",
    "WebGPU & Browser Game Engines: Console-Quality Graphics in JS & WASM",
    "Game Engine Optimization: DLSS 4, Frame Generation, and Shader Compilation Techniques"
  ],
  "Coding Tutorials": [
    "Step-by-Step Practical Guide: Building High-Performance REST & GraphQL APIs",
    "Mastering Async Rust & Concurrency for High-Throughput Systems",
    "Building Scalable Microservices with Go and gRPC: Production Testing & Deployment",
    "Python 3.13+ Performance Guide: Free-Threaded No-GIL Multithreading in Practice",
    "Data Structures & Algorithms: Solving Complex Graph and DP Problems in 2026"
  ],
  "Software Architecture": [
    "Event-Driven Architecture with Kafka & RabbitMQ in High-Throughput Systems",
    "Microservices vs Distributed Monolith: Architecture Lessons Learned at Scale",
    "Database Sharding & Distributed SQL (CockroachDB, YugabyteDB) Architecture",
    "Zero-Trust Architecture & Cloud-Native Security Enforcement in Kubernetes",
    "Domain-Driven Design (DDD) for Complex Enterprise Systems"
  ],
  "Cybersecurity": [
    "Post-Quantum Cryptography & Lattice-Based Encryption Standards in 2026",
    "AI-Powered Cyber Threats vs Autonomous Security Operations Center (SOC) Defense",
    "Zero-Day Vulnerability Mitigation & Automated Binary Exploit Patching",
    "Cloud Infrastructure Security: Identity-Based Access Control and Cloud Guardrails",
    "Ransomware Defenses: Immutable Backups, Air-Gapped Storage, and EDR Solutions"
  ]
};

// New AI schema for 1500-word article formatting
const aiBlogPostSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "Highly engaging, catchy, human-like SEO-optimized article title (headline only, 8 to 14 words)." },
    tagline: { type: Type.STRING, description: "Compelling tagline highlighting article value and practical insights." },
    category: { type: Type.STRING, description: "Target category matching the user selection." },
    content: { 
      type: Type.STRING, 
      description: "A detailed, comprehensive 1500-word article body formatted in clean HTML/Markdown. MUST be completely distinct from the title. Write in simple, clear, direct, human-like English with NO meaningless symbols or robotic AI boilerplate. Use H2/H3 headings and short readable paragraphs. Include code snippets where appropriate. Highlight key terms and main words in green using: <mark>[keyword]</mark>. Conclude with an explicit FAQ section using <h2>Frequently Asked Questions (FAQs)</h2> containing 3-5 clear Q&As." 
    },
    readTime: { type: Type.STRING, description: "Estimated read time, e.g., '7 min read'." },
    tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Array of 4-6 lowercase keyword tags."
    },
    excerpt: { type: Type.STRING, description: "A brief 2-sentence summary." },
    author: { type: Type.STRING, description: "Author name, e.g., 'S Pro Coder AI'." },
    keywords: { type: Type.STRING, description: "Comma-separated target SEO keywords." }
  },
  required: ["title", "tagline", "category", "content", "readTime", "tags", "excerpt", "author", "keywords"]
};

// Robust helper to extract and parse JSON from AI models
function safeJsonParse(text: string): any {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch (e) {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      const candidate = trimmed.substring(start, end + 1);
      try {
        return JSON.parse(candidate);
      } catch (innerError) {
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

// API Endpoint: AI Article Generation Engine
const handleAiArticleGeneration = async (req: express.Request, res: express.Response) => {
  try {
    const { category, apiKey, apiKeys, publishTime, huggingFaceKey, imgbbKey } = req.body;
    let blogPost: any = null;

    const targetCategory = category || "Artificial Intelligence";
    
    // Resolve seeds for specific category
    let seeds = CATEGORY_TREND_SEEDS[targetCategory];
    if (!seeds) {
      const catLower = targetCategory.toLowerCase();
      for (const [key, val] of Object.entries(CATEGORY_TREND_SEEDS)) {
        if (catLower.includes(key.toLowerCase()) || key.toLowerCase().includes(catLower)) {
          seeds = val;
          break;
        }
      }
    }
    if (!seeds || seeds.length === 0) {
      seeds = CATEGORY_TREND_SEEDS["Artificial Intelligence"];
    }
    const randomTrendSeed = seeds[Math.floor(Math.random() * seeds.length)];

    // Build strict category boundary directive
    const catLower = targetCategory.toLowerCase();
    let categoryBoundaryRule = "";

    if (catLower.includes("intelligence") || catLower.includes("ai")) {
      categoryBoundaryRule = `STRICT CATEGORY BOUNDARY (ARTIFICIAL INTELLIGENCE / AI TOOLS):
- Focus EXCLUSIVELY on Artificial Intelligence (AI models like GPT-5 / Gemini 3.5 / Claude 3.5, LLM benchmarks, neural architectures, AI agents, machine learning algorithms, or generative AI breakthroughs).
- DO NOT mention React, Next.js, web frameworks, HTML, CSS, or unrelated web development.
- Include an AI-focused technical block or code example (e.g. Python script using Google GenAI SDK / OpenAI API, cURL request, JSON schema, or prompt engineering configuration).`;
    } else if (catLower.includes("web") || catLower.includes("coding") || catLower.includes("tutorial")) {
      categoryBoundaryRule = `STRICT CATEGORY BOUNDARY (WEB DEVELOPMENT / CODING TUTORIALS):
- Focus EXCLUSIVELY on modern web development or programming concepts (frameworks, APIs, TypeScript/JavaScript, backend/frontend engineering, CSS, Vite, Node.js).
- Include clean, modern programming code snippets (TypeScript, JavaScript, Python, HTML/CSS).`;
    } else if (catLower.includes("game")) {
      categoryBoundaryRule = `STRICT CATEGORY BOUNDARY (GAMES / GAMING):
- Focus EXCLUSIVELY on 2026 video games, gaming technology, game development engines (Unreal Engine, Unity), GPU graphics, or gaming hardware.
- DO NOT mention web frameworks like React or unrelated web development.
- Include a game dev script or graphics code block (C#, C++, GLSL shader, or Game Config YAML/JSON).`;
    } else if (catLower.includes("security") || catLower.includes("cyber")) {
      categoryBoundaryRule = `STRICT CATEGORY BOUNDARY (CYBERSECURITY):
- Focus EXCLUSIVELY on cybersecurity, cryptography, vulnerability analysis, zero-trust architecture, cloud security, or network defense.
- DO NOT mention unrelated web frameworks like React.
- Include a security configuration snippet, bash command block, or Python security script.`;
    } else if (catLower.includes("architecture")) {
      categoryBoundaryRule = `STRICT CATEGORY BOUNDARY (SOFTWARE ARCHITECTURE):
- Focus EXCLUSIVELY on software architecture, system design, microservices, cloud infrastructure, or database scaling.
- Include an architecture configuration block, Docker/Kubernetes manifest, or system code block.`;
    } else if (catLower.includes("news")) {
      categoryBoundaryRule = `STRICT CATEGORY BOUNDARY (TECH NEWS):
- Focus EXCLUSIVELY on 2026 major tech industry updates, silicon chips, mobile tech, gadget innovation, or corporate tech shifts.
- Include a technical specification table, benchmark data block, or hardware configuration commands.`;
    } else {
      categoryBoundaryRule = `STRICT CATEGORY BOUNDARY (${targetCategory.toUpperCase()}):
- Write strictly within the boundary of ${targetCategory}. Do not mix unrelated topics.
- Include relevant code or technical specification blocks matching ${targetCategory}.`;
    }

    // 1. Resolve API Keys array (up to 5 keys)
    let keyPool: string[] = [];
    if (Array.isArray(apiKeys) && apiKeys.length > 0) {
      keyPool = apiKeys.filter((k: any) => typeof k === "string" && k.trim().length > 10).map((k: string) => k.trim());
    }
    if (keyPool.length === 0 && apiKey && typeof apiKey === "string" && apiKey.trim().length > 10) {
      keyPool = [apiKey.trim()];
    }

    const clientsToTry: { name: string; client: GoogleGenAI }[] = [];
    if (keyPool.length > 0) {
      for (let i = 0; i < keyPool.length; i++) {
        clientsToTry.push({ name: `Key Pool #${i + 1}`, client: new GoogleGenAI({ apiKey: keyPool[i] }) });
      }
    } else if (process.env.GEMINI_API_KEY) {
      clientsToTry.push({ name: "Environment Key", client: new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) });
    }
    if (clientsToTry.length === 0 && ai) {
      clientsToTry.push({ name: "Default Gemini Client", client: ai });
    }

    if (clientsToTry.length === 0) {
      return res.status(503).json({
        error: "Gemini client is not configured. Please enter at least one valid Gemini API key in the AI Engine settings."
      });
    }

    const prompt = `Write a 100% unique, exceptionally high quality, 1500-word SEO-optimized article specifically for category: "${targetCategory}".

${categoryBoundaryRule}

STRICT CREATIVE & TECHNICAL DIRECTIVES:
1. STRICT TOPICAL BOUNDARY: Do NOT cross into unrelated categories. Stay 100% inside "${targetCategory}".
2. UNIQUE & SEPARATE TITLE VS CONTENT:
   - TITLE: Must be a catchy, highly clickable 8 to 14 word headline specific to "${targetCategory}". (Example headline only, do NOT copy title into content).
   - CONTENT: Must be a deep, detailed 1500+ word step-by-step article body formatted in clean HTML/Markdown.
   - THE TITLE AND CONTENT MUST BE COMPLETELY SEPARATE AND DIFFERENT.
3. TREND & TOPIC SEED: Focus on latest 2026 insights inspired by: "${randomTrendSeed}".
4. CODE / TECHNICAL EXAMPLE: Include at least one relevant code snippet, API request, or technical specification block appropriate for "${targetCategory}".
5. KEY TERM GREEN HIGHLIGHTS: Highlight key terms and main words in green using: <mark>[keyword]</mark>.
6. FAQS SECTION: Conclude with <h2>Frequently Asked Questions (FAQs)</h2> containing 3 to 5 clear, insightful Q&A items matching "${targetCategory}".`;

    console.log(`Generating high-quality 1500-word article for category "${targetCategory}" via Gemini SDK (Clients: ${clientsToTry.length})...`);

    const modelsToTry = ["gemini-3.5-flash", "gemini-2.5-flash"];
    let lastErrorMsg = "";
    let hitQuotaOrDenied = false;

    for (const clientObj of clientsToTry) {
      for (const modelName of modelsToTry) {
        try {
          console.log(`Attempting article generation with ${clientObj.name} using ${modelName}...`);
          const response = await clientObj.client.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              systemInstruction: `You are an expert technical editor and specialist author writing exclusively for the category: "${targetCategory}". You produce 100% unique, 1500-word articles that strictly adhere to "${targetCategory}" without crossing into unrelated subjects or frameworks. You write separate titles and content, green highlighted key terms using <mark>[keyword]</mark>, relevant code/technical examples, and an explicit FAQs section.`,
              responseMimeType: "application/json",
              responseSchema: aiBlogPostSchema
            }
          });

          const jsonStr = response.text;
          if (jsonStr) {
            blogPost = safeJsonParse(jsonStr);
            if (blogPost && blogPost.title && blogPost.content) {
              break;
            }
          }
        } catch (err: any) {
          const msg = err?.message || String(err || "");
          console.warn(`Attempt failed for ${clientObj.name} with ${modelName}:`, msg);
          lastErrorMsg = msg;
          if (
            msg.includes("429") ||
            msg.includes("RESOURCE_EXHAUSTED") ||
            msg.toLowerCase().includes("quota") ||
            msg.toLowerCase().includes("limit") ||
            msg.includes("403") ||
            msg.includes("PERMISSION_DENIED") ||
            msg.toLowerCase().includes("denied")
          ) {
            hitQuotaOrDenied = true;
          }
        }
      }
      if (blogPost) break;
    }

    if (!blogPost) {
      if (hitQuotaOrDenied || lastErrorMsg.toLowerCase().includes("quota") || lastErrorMsg.toLowerCase().includes("limit")) {
        return res.status(429).json({
          error: "API Limit Reached or Project Access Denied: The Gemini API quota/limit has been reached or access was denied. Article generation stopped.",
          quotaExceeded: true,
          limitReached: true,
          projectDenied: true
        });
      }
      return res.status(503).json({
        error: lastErrorMsg || "API Service Temporarily Unavailable. Article generation stopped."
      });
    }

    // Double check title and content are not identical
    if (blogPost.title && blogPost.content && blogPost.title.trim().toLowerCase() === blogPost.content.trim().toLowerCase()) {
      blogPost.content = parseMarkdown(blogPost.content) || blogPost.content;
    }

    // Generate 16:9 Custom Thumbnail SVG with random color variant (0 to 11)
    const randomVariant = Math.floor(Math.random() * THUMBNAIL_VARIANTS.length);
    const svgThumbnail = generateArticleThumbnailSvg({
      category: blogPost.category || targetCategory,
      title: blogPost.title,
      websiteName: "sprocoder.online",
      variantIndex: randomVariant
    });

    blogPost.thumbnailUrl = svgThumbnail;
    blogPost.id = "post-ai-" + Date.now();
    blogPost.date = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    blogPost.likes = Math.floor(Math.random() * 20) + 5;
    blogPost.savesCount = Math.floor(Math.random() * 10) + 2;
    blogPost.isAiGenerated = true;
    blogPost.publishStatus = publishTime ? "scheduled" : "direct";
    blogPost.scheduledDate = publishTime || "";
    blogPost.visibility = "public";

    return res.json(blogPost);
  } catch (error: any) {
    console.error("Error generating AI article:", error);
    const errMsg = error?.message || String(error || "");
    const isLimitOrDenied = 
      errMsg.includes("429") ||
      errMsg.includes("RESOURCE_EXHAUSTED") ||
      errMsg.toLowerCase().includes("quota") ||
      errMsg.toLowerCase().includes("limit") ||
      errMsg.includes("403") ||
      errMsg.includes("PERMISSION_DENIED") ||
      errMsg.toLowerCase().includes("denied") ||
      errMsg.includes("API_KEY_INVALID") ||
      errMsg.toLowerCase().includes("not supported");

    if (isLimitOrDenied) {
      return res.status(429).json({
        error: "API Limit Reached or Project Access Denied: The Gemini API limit/quota has been reached or access was denied. Article generation stopped.",
        quotaExceeded: true,
        limitReached: true,
        projectDenied: true
      });
    }

    return res.status(500).json({
      error: errMsg || "Failed to generate AI article. Please check server logs."
    });
  }
};

app.post("/api/blog/generate-ai", handleAiArticleGeneration);
app.post("/api/generate-ai-article", handleAiArticleGeneration);

// New AI Course Generation Schema & Endpoint
const aiCourseSchema = {
  type: Type.OBJECT,
  properties: {
    courseTitle: { type: Type.STRING, description: "Catchy course title e.g. How to Learn HTML for Beginners in 2026" },
    courseDescription: { type: Type.STRING, description: "Comprehensive 2-3 sentence overview of course goals and outcomes." },
    category: { type: Type.STRING, description: "Category e.g. Web Development or Artificial Intelligence" },
    level: { type: Type.STRING, description: "Beginner, Intermediate, or Advanced" },
    estimatedHours: { type: Type.STRING, description: "Estimated completion time e.g. '2 Hours' or '4 Hours'" },
    lessons: {
      type: Type.ARRAY,
      description: "Step by step list of lessons/articles forming the full course curriculum",
      items: {
        type: Type.OBJECT,
        properties: {
          lessonNumber: { type: Type.INTEGER, description: "1-based order index of lesson" },
          title: { type: Type.STRING, description: "Lesson title e.g. Lesson 1: Introduction to HTML & Software Setup" },
          tagline: { type: Type.STRING, description: "Short 1-sentence goal" },
          excerpt: { type: Type.STRING, description: "1-2 sentence preview" },
          readTime: { type: Type.STRING, description: "e.g. '8 min read'" },
          content: { 
            type: Type.STRING, 
            description: "Deep, 1200+ word step-by-step instructional guide in clean Markdown/HTML. Include clear headings, organized bullet points, software setup instructions, simplified step-by-step guides, clean source code blocks with output demonstrations, green key term highlights <mark>[keyword]</mark>, 2-3 authentic external links to official documentation or resources (e.g., [MDN Web Docs](https://developer.mozilla.org), [W3C Standards](https://www.w3.org), or official technology docs) to increase authority, and 3-5 FAQs." 
          },
          tags: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["lessonNumber", "title", "tagline", "excerpt", "readTime", "content"]
      }
    }
  },
  required: ["courseTitle", "courseDescription", "category", "level", "estimatedHours", "lessons"]
};

app.post("/api/ai-generate-course", async (req, res) => {
  try {
    const { courseName, category, targetCount, promptInstructions, apiKey, apiKeys } = req.body;

    const targetCategory = category || "Web Development";
    const requestedCount = Math.max(3, Math.min(12, Number(targetCount) || 5));
    const titlePrompt = courseName || "How to Learn HTML for Beginners in 2026";

    // Resolve API Keys
    let keyPool: string[] = [];
    if (Array.isArray(apiKeys) && apiKeys.length > 0) {
      keyPool = apiKeys.filter((k: any) => typeof k === "string" && k.trim().length > 10).map((k: string) => k.trim());
    }
    if (keyPool.length === 0 && apiKey && typeof apiKey === "string" && apiKey.trim().length > 10) {
      keyPool = [apiKey.trim()];
    }

    const clientsToTry: { name: string; client: GoogleGenAI }[] = [];
    if (keyPool.length > 0) {
      for (let i = 0; i < keyPool.length; i++) {
        clientsToTry.push({ name: `Key Pool #${i + 1}`, client: new GoogleGenAI({ apiKey: keyPool[i] }) });
      }
    } else if (process.env.GEMINI_API_KEY) {
      clientsToTry.push({ name: "Environment Key", client: new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) });
    }
    if (clientsToTry.length === 0 && ai) {
      clientsToTry.push({ name: "Default Gemini Client", client: ai });
    }

    if (clientsToTry.length === 0) {
      return res.status(503).json({
        error: "Gemini client is not configured. Please enter at least one valid Gemini API key in the AI Engine settings."
      });
    }

    const coursePrompt = `Create a complete, multi-part step-by-step tech course curriculum titled "${titlePrompt}" in category "${targetCategory}" containing exactly ${requestedCount} detailed, instructional articles/lessons.

SPECIFIC INSTRUCTIONS & EXAMPLE CURRICULUM:
If the course is "How to Learn HTML for Beginners in 2026":
- Lesson 1: Required software setup (VS Code, web browsers) and introduction to HTML structure.
- Lesson 2: Basic HTML tags and structural layout tags like <div>, <section>, <header>, <nav>, and <footer>.
- Lesson 3: Working with HTML Text, Headings, Paragraphs, Lists, and Links.
- Lesson 4: HTML Forms, Input Elements, Buttons, and Tables.
- Lesson 5: Building a Complete Step-by-Step Sample HTML Web Page Project.

STRICT INSTRUCTIONAL DIRECTIVES FOR EACH LESSON:
1. Provide simplified, beginner-friendly step-by-step instructions.
2. For coding sections: provide clean code blocks AND explain/demonstrate the visual output.
3. Use green key term highlights in each lesson: <mark>[keyword]</mark>.
4. Include an explicit 3-5 question Frequently Asked Questions (FAQs) section at the end of every lesson.
5. Additional custom instructions from instructor: ${promptInstructions || "Focus on practical, hands-on 2026 standards."}`;

    console.log(`Generating AI course "${titlePrompt}" with ${requestedCount} lessons via Gemini...`);

    let courseResult: any = null;
    const modelsToTry = ["gemini-3.5-flash", "gemini-2.5-flash"];

    for (const clientObj of clientsToTry) {
      for (const modelName of modelsToTry) {
        try {
          const response = await clientObj.client.models.generateContent({
            model: modelName,
            contents: coursePrompt,
            config: {
              systemInstruction: "You are a senior computer science professor and master educator crafting step-by-step programming and tech courses. You generate structured, multi-part curricula with code blocks, output demonstrations, green key term highlights <mark>[keyword]</mark>, and FAQs.",
              responseMimeType: "application/json",
              responseSchema: aiCourseSchema
            }
          });

          const jsonStr = response.text;
          if (jsonStr) {
            courseResult = safeJsonParse(jsonStr);
            if (courseResult && courseResult.courseTitle && Array.isArray(courseResult.lessons) && courseResult.lessons.length > 0) {
              break;
            }
          }
        } catch (err: any) {
          console.warn(`Course generation attempt failed with ${modelName}:`, err?.message);
        }
      }
      if (courseResult) break;
    }

    if (!courseResult) {
      return res.status(503).json({ error: "Failed to generate AI course curriculum. Please check your API key or try again." });
    }

    // Format Course Object & Attached Articles
    const courseId = "course-" + Date.now();
    const courseSlug = slugify(courseResult.courseTitle || titlePrompt);
    const nowFormatted = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    // Generate 16:9 Thumbnail SVG for Course
    const courseThumbnailSvg = generateArticleThumbnailSvg({
      category: courseResult.category || targetCategory,
      title: courseResult.courseTitle,
      websiteName: "sprocoder.online/courses",
      variantIndex: Math.floor(Math.random() * THUMBNAIL_VARIANTS.length)
    });

    const generatedArticles: any[] = [];
    const formattedLessons: any[] = [];

    courseResult.lessons.forEach((lesson: any, idx: number) => {
      const lessonNum = lesson.lessonNumber || idx + 1;
      const articleId = `post-course-${Date.now()}-${lessonNum}`;
      const articleTitle = lesson.title || `Lesson ${lessonNum}: ${courseResult.courseTitle}`;
      const artSlug = slugify(articleTitle);

      const lessonThumbnailSvg = generateArticleThumbnailSvg({
        category: courseResult.category || targetCategory,
        title: articleTitle,
        websiteName: "sprocoder.online",
        variantIndex: (idx + 1) % THUMBNAIL_VARIANTS.length
      });

      const articleObj = {
        id: articleId,
        title: articleTitle,
        tagline: lesson.tagline || `Lesson ${lessonNum} of ${courseResult.courseTitle}`,
        category: courseResult.category || targetCategory,
        content: lesson.content,
        readTime: lesson.readTime || "8 min read",
        tags: lesson.tags || ["Course", targetCategory, "Tutorial"],
        excerpt: lesson.excerpt || lesson.tagline,
        author: "Shanawar Ali",
        date: nowFormatted,
        likes: Math.floor(Math.random() * 15) + 5,
        savesCount: Math.floor(Math.random() * 10) + 1,
        thumbnailUrl: lessonThumbnailSvg,
        isAiGenerated: true,
        metaDescription: lesson.excerpt || lesson.tagline,
        visibility: "public"
      };

      generatedArticles.push(articleObj);

      formattedLessons.push({
        id: `lesson-${courseId}-${lessonNum}`,
        lessonNumber: lessonNum,
        title: articleTitle,
        tagline: lesson.tagline,
        excerpt: lesson.excerpt,
        readTime: lesson.readTime || "8 min read",
        articleId: articleId,
        articleSlug: artSlug,
        content: lesson.content,
        tags: lesson.tags
      });
    });

    const finalCourse = {
      id: courseId,
      title: courseResult.courseTitle || titlePrompt,
      slug: courseSlug,
      description: courseResult.courseDescription,
      category: courseResult.category || targetCategory,
      thumbnailUrl: courseThumbnailSvg,
      level: courseResult.level || "Beginner 2026",
      estimatedHours: courseResult.estimatedHours || "2 Hours",
      articleCount: formattedLessons.length,
      lessons: formattedLessons,
      createdAt: nowFormatted,
      author: "Shanawar Ali",
      isAiGenerated: true
    };

    return res.json({
      course: finalCourse,
      articles: generatedArticles
    });
  } catch (error: any) {
    console.error("Error generating AI course:", error);
    return res.status(500).json({ error: error.message || "Internal server error during course generation" });
  }
});

app.post("/api/ai-generate-lesson", async (req, res) => {
  try {
    const { courseTitle, category, lessonTopic, lessonNumber, apiKey, apiKeys } = req.body;
    const targetCategory = category || "Web Development";
    const num = Number(lessonNumber) || 1;
    const topic = lessonTopic || "Specialized Lesson Topic";

    let keyPool: string[] = [];
    if (Array.isArray(apiKeys) && apiKeys.length > 0) {
      keyPool = apiKeys.filter((k: any) => typeof k === "string" && k.trim().length > 10).map((k: string) => k.trim());
    }
    if (keyPool.length === 0 && apiKey && typeof apiKey === "string" && apiKey.trim().length > 10) {
      keyPool = [apiKey.trim()];
    }

    const clientsToTry: { name: string; client: GoogleGenAI }[] = [];
    if (keyPool.length > 0) {
      for (let i = 0; i < keyPool.length; i++) {
        clientsToTry.push({ name: `Key Pool #${i + 1}`, client: new GoogleGenAI({ apiKey: keyPool[i] }) });
      }
    } else if (process.env.GEMINI_API_KEY) {
      clientsToTry.push({ name: "Environment Key", client: new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) });
    }
    if (clientsToTry.length === 0 && ai) {
      clientsToTry.push({ name: "Default Gemini Client", client: ai });
    }

    if (clientsToTry.length === 0) {
      return res.status(503).json({ error: "Gemini client is not configured. Please enter a valid API key." });
    }

    const lessonPrompt = `Generate a complete, high-quality, step-by-step lesson article titled "Lesson ${num}: ${topic}" for the course "${courseTitle || "Tech Course"}" in category "${targetCategory}".
Include:
1. Clear beginner-friendly instructional steps with bullet points.
2. Code blocks with practical examples and visual output demonstrations.
3. Green key term highlights: <mark>[keyword]</mark>.
4. At least 2-3 authentic external links to official documentation (e.g. [MDN Web Docs](https://developer.mozilla.org), [W3C Specifications](https://www.w3.org), or official library guides) to boost content quality and authority.
5. 3-5 Frequently Asked Questions (FAQs) at the end.
Return JSON with fields: title, tagline, excerpt, readTime, content, tags.`;

    const singleLessonSchema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        tagline: { type: Type.STRING },
        excerpt: { type: Type.STRING },
        readTime: { type: Type.STRING },
        content: { type: Type.STRING },
        tags: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["title", "tagline", "excerpt", "readTime", "content"]
    };

    let result: any = null;
    const modelsToTry = ["gemini-3.5-flash", "gemini-2.5-flash"];

    for (const clientObj of clientsToTry) {
      for (const modelName of modelsToTry) {
        try {
          const response = await clientObj.client.models.generateContent({
            model: modelName,
            contents: lessonPrompt,
            config: {
              systemInstruction: "You are a master CS educator writing hands-on lesson articles.",
              responseMimeType: "application/json",
              responseSchema: singleLessonSchema
            }
          });
          const jsonStr = response.text;
          if (jsonStr) {
            result = safeJsonParse(jsonStr);
            if (result && result.title && result.content) break;
          }
        } catch (e) {
          console.warn("Lesson generation attempt failed:", e);
        }
      }
      if (result) break;
    }

    if (!result) {
      return res.status(503).json({ error: "Failed to generate AI lesson article." });
    }

    const nowFormatted = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const articleId = `post-lesson-${Date.now()}`;
    const articleTitle = result.title || `Lesson ${num}: ${topic}`;
    const thumbnail = generateArticleThumbnailSvg({
      category: targetCategory,
      title: articleTitle,
      websiteName: "sprocoder.online",
      variantIndex: Math.floor(Math.random() * THUMBNAIL_VARIANTS.length)
    });

    const articleObj = {
      id: articleId,
      title: articleTitle,
      tagline: result.tagline || `Lesson ${num} of ${courseTitle}`,
      category: targetCategory,
      content: result.content,
      readTime: result.readTime || "7 min read",
      tags: result.tags || ["Course", targetCategory, "Tutorial"],
      excerpt: result.excerpt || result.tagline,
      author: "Shanawar Ali",
      date: nowFormatted,
      likes: 10,
      savesCount: 3,
      thumbnailUrl: thumbnail,
      isAiGenerated: true,
      metaDescription: result.excerpt || result.tagline,
      visibility: "public"
    };

    const lessonObj = {
      id: `lesson-${Date.now()}-${num}`,
      lessonNumber: num,
      title: articleTitle,
      tagline: result.tagline,
      excerpt: result.excerpt,
      readTime: result.readTime || "7 min read",
      articleId: articleId,
      articleSlug: slugify(articleTitle),
      content: result.content,
      tags: result.tags
    };

    return res.json({ article: articleObj, lesson: lessonObj });
  } catch (error: any) {
    console.error("Error generating AI lesson:", error);
    return res.status(500).json({ error: error.message || "Failed to generate lesson." });
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

function escapeHtml(str: string): string {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Helper to inject bespoke SEO meta tags & structured data per article
async function injectArticleSeo(template: string, urlPath: string): Promise<string> {
  const isPostRoute = urlPath.startsWith("/blog/") || urlPath.startsWith("/articles/");
  if (!isPostRoute) return template;

  const rawSlug = urlPath.split("/").pop() || "";
  const slug = rawSlug.replace(/\.html$/, "");
  if (!slug) return template;

  try {
    const res = await fetch("https://fir-pro-coder-default-rtdb.firebaseio.com/articles.json");
    if (!res.ok) return template;
    const articlesData = await res.json();
    if (!articlesData) return template;

    const articlesList: any[] = Object.values(articlesData);
    const slugify = (t: string) =>
      String(t || "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^\w\-]+/g, "")
        .replace(/\-\-+/g, "-")
        .replace(/^-+/, "")
        .replace(/-+$/, "");

    const matched = articlesList.find(
      (p) => slugify(p.title) === slug || p.id === slug
    );

    if (!matched) return template;

    let modified = template;

    const articleTitle = `${matched.title} | S pro coder`;
    const articleDesc = matched.metaDescription || matched.excerpt || matched.tagline || matched.title;
    const articleImage = matched.thumbnailUrl || "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=80";
    const canonicalUrl = `https://www.sprocoder.online/blog/${slugify(matched.title)}`;

    // Replace Title
    modified = modified.replace(/<title>.*?<\/title>/gi, `<title>${escapeHtml(articleTitle)}</title>`);

    // Replace Meta Description
    modified = modified.replace(
      /<meta\s+name="description"\s+content=".*?"\s*\/?>/gi,
      `<meta name="description" content="${escapeHtml(articleDesc)}" />`
    );

    // Replace Open Graph Tags
    modified = modified.replace(
      /<meta\s+property="og:title"\s+content=".*?"\s*\/?>/gi,
      `<meta property="og:title" content="${escapeHtml(articleTitle)}" />`
    );
    modified = modified.replace(
      /<meta\s+property="og:description"\s+content=".*?"\s*\/?>/gi,
      `<meta property="og:description" content="${escapeHtml(articleDesc)}" />`
    );
    modified = modified.replace(
      /<meta\s+property="og:image"\s+content=".*?"\s*\/?>/gi,
      `<meta property="og:image" content="${escapeHtml(articleImage)}" />`
    );
    modified = modified.replace(
      /<meta\s+property="og:url"\s+content=".*?"\s*\/?>/gi,
      `<meta property="og:url" content="${canonicalUrl}" />`
    );
    modified = modified.replace(
      /<meta\s+property="og:type"\s+content=".*?"\s*\/?>/gi,
      `<meta property="og:type" content="article" />`
    );

    // Replace Twitter Tags
    modified = modified.replace(
      /<meta\s+name="twitter:title"\s+content=".*?"\s*\/?>/gi,
      `<meta name="twitter:title" content="${escapeHtml(articleTitle)}" />`
    );
    modified = modified.replace(
      /<meta\s+name="twitter:description"\s+content=".*?"\s*\/?>/gi,
      `<meta name="twitter:description" content="${escapeHtml(articleDesc)}" />`
    );
    modified = modified.replace(
      /<meta\s+name="twitter:image"\s+content=".*?"\s*\/?>/gi,
      `<meta name="twitter:image" content="${escapeHtml(articleImage)}" />`
    );

    // Replace Canonical Link
    modified = modified.replace(
      /<link\s+rel="canonical"\s+href=".*?"\s*\/?>/gi,
      `<link rel="canonical" href="${canonicalUrl}" />`
    );

    // Inject Article JSON-LD Schema & Initial Post Window Variable
    const jsonLdArticle = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": matched.title,
      "description": articleDesc,
      "image": [articleImage],
      "url": canonicalUrl,
      "datePublished": matched.date || new Date().toISOString(),
      "articleSection": matched.category || "Technology",
      "keywords": (matched.tags || []).join(", "),
      "author": {
        "@type": "Person",
        "name": matched.author || "Shanawar Ali"
      },
      "publisher": {
        "@type": "Organization",
        "name": "S pro coder",
        "url": "https://www.sprocoder.online"
      }
    };

    const injection = `
      <script type="application/ld+json">${JSON.stringify(jsonLdArticle)}</script>
      <script>window.__INITIAL_POST__ = ${JSON.stringify(matched)};</script>
    `;

    if (modified.includes("</head>")) {
      modified = modified.replace("</head>", `${injection}\n</head>`);
    } else {
      modified = `${injection}\n${modified}`;
    }

    return modified;
  } catch (err) {
    console.error("Error in injectArticleSeo:", err);
  }
  return template;
}

// Dynamic Google AdSense ads.txt crawler endpoint
app.get(["/ads.txt", "/add.txt", "/s/add.txt", "/s/ads.txt"], async (req, res) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  try {
    const dbUrl = "https://fir-pro-coder-default-rtdb.firebaseio.com/settings/adsTxt.json";
    const response = await fetch(dbUrl);
    let data = "";
    if (response.ok) {
      data = await response.json() || "";
    }
    
    if (data && typeof data === "string" && data.trim().length > 0 && !data.includes("pub-0000000000000000")) {
      return res.status(200).send(data.trim() + "\n");
    }

    // Secondary fallback: check if publisher ID exists in customCode or ads settings
    try {
      const settingsRes = await fetch("https://fir-pro-coder-default-rtdb.firebaseio.com/settings.json");
      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        const strSettings = JSON.stringify(settings || {});
        const pubMatch = strSettings.match(/pub-\d{10,20}/i);
        if (pubMatch && pubMatch[0]) {
          const detectedPub = pubMatch[0].toLowerCase();
          return res.status(200).send(`google.com, ${detectedPub}, DIRECT, f08c47fec0942fa0\n`);
        }
      }
    } catch (fallbackErr) {
      console.warn("Secondary ads.txt fallback scan error:", fallbackErr);
    }

    // Default verified AdSense compliant ads.txt structure
    const defaultAdsTxt = `google.com, pub-8457467726305206, DIRECT, f08c47fec0942fa0\n`;
    return res.status(200).send(defaultAdsTxt);
  } catch (err) {
    console.error("Error fetching ads.txt:", err);
    return res.status(200).send("google.com, pub-8457467726305206, DIRECT, f08c47fec0942fa0\n");
  }
});

// Helper to generate dynamic sitemap XML
async function generateSitemapXml(): Promise<string> {
  const baseUrl = "https://www.sprocoder.online";
  const nowStr = new Date().toISOString().split("T")[0];

  let articles: any[] = [];
  try {
    const res = await fetch("https://fir-pro-coder-default-rtdb.firebaseio.com/articles.json");
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === "object") {
        articles = Object.values(data);
      }
    }
  } catch (err) {
    console.warn("Sitemap: failed to fetch dynamic articles from Firebase:", err);
  }

  let courses: any[] = [];
  try {
    const cRes = await fetch("https://fir-pro-coder-default-rtdb.firebaseio.com/courses.json");
    if (cRes.ok) {
      const cData = await cRes.json();
      if (cData && typeof cData === "object") {
        courses = Object.values(cData);
      }
    }
  } catch (err) {
    console.warn("Sitemap: failed to fetch dynamic courses from Firebase:", err);
  }

  if (!articles || articles.length === 0) {
    articles = INITIAL_POSTS;
  }

  const categories = [
    "Artificial Intelligence",
    "Tech News",
    "AI Tools",
    "Web Development",
    "Games",
    "Coding Tutorials",
    "Software Architecture",
    "Cybersecurity"
  ];

  const staticPages = [
    { path: "", priority: "1.0", changefreq: "daily" },
    { path: "courses", priority: "0.9", changefreq: "daily" },
    { path: "about", priority: "0.8", changefreq: "monthly" },
    { path: "contact", priority: "0.8", changefreq: "monthly" },
    { path: "privacy-policy", priority: "0.5", changefreq: "monthly" },
    { path: "disclaimer", priority: "0.5", changefreq: "monthly" },
    { path: "terms-and-conditions", priority: "0.5", changefreq: "monthly" },
    { path: "write-article", priority: "0.6", changefreq: "monthly" },
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

  // Static pages
  for (const p of staticPages) {
    const loc = p.path ? `${baseUrl}/${p.path}` : `${baseUrl}/`;
    xml += `  <url>\n`;
    xml += `    <loc>${loc}</loc>\n`;
    xml += `    <lastmod>${nowStr}</lastmod>\n`;
    xml += `    <changefreq>${p.changefreq}</changefreq>\n`;
    xml += `    <priority>${p.priority}</priority>\n`;
    xml += `  </url>\n`;
  }

  // Category pages
  for (const cat of categories) {
    const catSlug = slugify(cat);
    xml += `  <url>\n`;
    xml += `    <loc>${baseUrl}/category/${catSlug}</loc>\n`;
    xml += `    <lastmod>${nowStr}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += `  </url>\n`;
  }

  // Dynamic Courses
  for (const course of courses) {
    if (!course || !course.title) continue;
    const cSlug = course.slug || slugify(course.title);
    xml += `  <url>\n`;
    xml += `    <loc>${baseUrl}/courses/${cSlug}</loc>\n`;
    xml += `    <lastmod>${nowStr}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>0.9</priority>\n`;
    if (course.thumbnailUrl && typeof course.thumbnailUrl === "string" && !course.thumbnailUrl.startsWith("data:")) {
      xml += `    <image:image>\n`;
      xml += `      <image:loc>${escapeXml(course.thumbnailUrl)}</image:loc>\n`;
      xml += `      <image:title>${escapeXml(course.title)}</image:title>\n`;
      xml += `    </image:image>\n`;
    }
    xml += `  </url>\n`;
  }

  // Dynamic articles
  for (const article of articles) {
    if (!article || !article.title) continue;
    const artSlug = slugify(article.title);
    const artDate = article.date ? new Date(article.date).toISOString().split("T")[0] : nowStr;
    const validDate = isNaN(Date.parse(artDate)) ? nowStr : artDate;

    xml += `  <url>\n`;
    xml += `    <loc>${baseUrl}/blog/${artSlug}</loc>\n`;
    xml += `    <lastmod>${validDate}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>0.9</priority>\n`;
    if (article.thumbnailUrl && typeof article.thumbnailUrl === "string" && !article.thumbnailUrl.startsWith("data:")) {
      xml += `    <image:image>\n`;
      xml += `      <image:loc>${escapeXml(article.thumbnailUrl)}</image:loc>\n`;
      xml += `      <image:title>${escapeXml(article.title)}</image:title>\n`;
      xml += `    </image:image>\n`;
    }
    xml += `  </url>\n`;
  }

  xml += `</urlset>`;
  return xml;
}

// llms.txt Endpoint
app.get(["/llms.txt", "/api/llms.txt"], async (req, res) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  try {
    const fs = await import("fs");
    const llmsPath = path.resolve(process.cwd(), "public", "llms.txt");
    if (fs.existsSync(llmsPath)) {
      return res.status(200).send(fs.readFileSync(llmsPath, "utf-8"));
    }
  } catch (err) {
    console.error("Error serving llms.txt:", err);
  }
  return res.status(200).send("S Pro Coder LLMs Index Policy\n\nYou can fetch content from our website (https://www.sprocoder.online) and use it.\n");
});

// Sitemap XML Endpoint
app.get(["/sitemap.xml", "/api/sitemap.xml"], async (req, res) => {
  try {
    const xml = await generateSitemapXml();
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.status(200).send(xml);
  } catch (err) {
    console.error("Error serving sitemap.xml:", err);
    return res.status(500).send("Error generating sitemap");
  }
});

// Sitemap GZ Compressed Endpoint (sitemap.xml.gz)
app.get(["/sitemap.xml.gz", "/api/sitemap.xml.gz"], async (req, res) => {
  try {
    const xml = await generateSitemapXml();
    const gzipped = zlib.gzipSync(Buffer.from(xml, "utf-8"));
    res.setHeader("Content-Type", "application/gzip");
    res.setHeader("Content-Encoding", "gzip");
    res.setHeader("Content-Disposition", 'inline; filename="sitemap.xml.gz"');
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.status(200).send(gzipped);
  } catch (err) {
    console.error("Error serving sitemap.xml.gz:", err);
    return res.status(500).send("Error generating compressed sitemap");
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
          template = await injectArticleSeo(template, url);
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
          template = await injectArticleSeo(template, url);
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
