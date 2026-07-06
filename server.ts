import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

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
    .replace(/^### (.*$)/gim, '<h3 style="font-size: 1.125rem; font-weight: 700; color: #1e293b; margin-top: 1rem; margin-bottom: 0.5rem;">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 style="font-size: 1.5rem; font-weight: 700; color: #1e293b; margin-top: 1.5rem; margin-bottom: 0.75rem;">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 style="font-size: 1.875rem; font-weight: 900; color: #0f172a; margin-top: 2rem; margin-bottom: 1rem;">$1</h1>')
    // Blockquotes
    .replace(/^\> (.*$)/gim, '<blockquote style="border-left-width: 4px; border-color: #a855f7; padding-left: 1rem; font-style: italic; color: #475569; margin: 1rem 0;">$1</blockquote>')
    // Bold
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    // Lists
    .replace(/^\- (.*$)/gim, '<li style="margin-left: 1rem; list-style-type: disc; color: #334155;">$1</li>')
    // Paragraphs
    .split('\n\n')
    .map(para => {
      const trimmed = para.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith('<h') || trimmed.startsWith('<blockquote') || trimmed.startsWith('<li')) {
        return trimmed;
      }
      return `<p style="color: #334155; line-height: 1.625; margin-bottom: 1rem;">${trimmed}</p>`;
    })
    .join('\n');
}

// Global Vite reference for server-side pre-rendering transformation in development
let viteDevServerInstance: any = null;

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
    const dbUrl = "https://fir-pro-coder-default-rtdb.firebaseio.com/articles.json";
    const response = await fetch(dbUrl);
    if (!response.ok) {
      throw new Error("Failed to fetch articles database");
    }
    const articlesMap: Record<string, any> = await response.json() || {};
    const articles = Object.values(articlesMap);

    const matched = articles.find((article: any) => {
      if (!article) return false;
      return slugify(article.title) === slug || article.id === slug;
    });

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

        // Beautiful SEO Title & dynamic initial state
        const seoMeta = `
    <title>${matched.title} | S pro coder</title>
    <meta name="description" content="${(matched.excerpt || matched.tagline || "").replace(/"/g, '&quot;')}" />
    <meta property="og:title" content="${matched.title}" />
    <meta property="og:description" content="${(matched.excerpt || matched.tagline || "").replace(/"/g, '&quot;')}" />
    <meta property="og:type" content="article" />
    <script>
      window.__INITIAL_POST__ = ${JSON.stringify(matched).replace(/</g, '\\u003c')};
    </script>
        `;

        if (template.includes("<title>")) {
          template = template.replace(/<title>.*?<\/title>/i, seoMeta);
        } else {
          template = template.replace("</head>", `${seoMeta}\n</head>`);
        }

        // Render static layout of the article instantly matching our design tokens
        const staticLayout = `
<div style="min-height: 100vh; background-color: #f8fafc; color: #0f172a; font-family: ui-sans-serif, system-ui, sans-serif; -webkit-font-smoothing: antialiased;">
  <header style="position: sticky; top: 0; z-index: 50; background-color: rgba(255, 255, 255, 0.85); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border-bottom: 1px solid #faf5ff; padding: 1rem 1.5rem;">
    <div style="max-width: 64rem; margin: 0 auto; display: flex; align-items: center; justify-content: space-between;">
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <div style="width: 2.5rem; height: 2.5rem; border-radius: 9999px; background-color: #f3e8ff; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #9333ea; font-size: 1.125rem;">S</div>
        <span style="font-weight: 900; color: #3b0764; letter-spacing: 0.05em; font-size: 1rem; text-transform: uppercase;">S PRO CODER</span>
      </div>
      <div>
        <span style="font-size: 0.75rem; color: #9333ea; font-family: monospace; letter-spacing: 0.1em; text-transform: uppercase;">Article Preview</span>
      </div>
    </div>
  </header>

  <main style="max-width: 48rem; margin: 0 auto; padding: 3rem 1.5rem;">
    <div style="margin-bottom: 2rem;">
      <span style="font-size: 0.875rem; font-weight: 700; color: #9333ea;">← Back to Articles</span>
    </div>

    <header style="margin-bottom: 2rem;">
      <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
        <span style="padding: 0.25rem 0.75rem; font-size: 0.75rem; font-weight: 600; background-color: #f3e8ff; color: #7e22ce; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em;">${matched.category || "Design"}</span>
        <span style="font-size: 0.75rem; color: #64748b;">${matched.readTime || '5 min read'}</span>
      </div>
      <h1 style="font-size: 2.25rem; font-weight: 900; color: #0f172a; letter-spacing: -0.025em; line-height: 1.25; margin-bottom: 1rem;">${matched.title}</h1>
      <p style="font-size: 1.125rem; color: #475569; font-style: italic; line-height: 1.625; margin-bottom: 1.5rem;">${matched.tagline || ""}</p>

      <div style="display: flex; align-items: center; gap: 1rem; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #faf5ff;">
        <div style="width: 2.5rem; height: 2.5rem; border-radius: 9999px; background-color: #9333ea; color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-family: monospace; font-size: 0.875rem;">${matched.author ? matched.author.charAt(0) : 'W'}</div>
        <div>
          <p style="font-size: 0.875rem; font-weight: 700; color: #1e293b; margin: 0;">${matched.author || 'Aura Writer'}</p>
          <p style="font-size: 0.75rem; color: #64748b; margin: 0;">${matched.date || 'Just now'}</p>
        </div>
      </div>
    </header>

    <article style="font-size: 1rem; color: #334155; line-height: 1.75;">
      ${parseMarkdown(matched.content || "")}
    </article>
  </main>
</div>
        `;

        template = template.replace('<div id="root"></div>', `<div id="root">${staticLayout}</div>`);

        return res.status(200).set({ "Content-Type": "text/html" }).end(template);
      }
    }
  } catch (error) {
    console.error("Failed to pre-render requested article page:", error);
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
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

setupViteOrStatic().catch((err) => {
  console.error("Failed to start server:", err);
});
