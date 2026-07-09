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
<div style="min-height: 100vh; background-color: #f8fafc; color: #0f172a; font-family: ui-sans-serif, system-ui, sans-serif; display: flex; align-items: center; justify-content: center; padding: 2rem;">
  <div style="max-width: 28rem; text-align: center; background-color: #ffffff; padding: 2.5rem; border-radius: 1.5rem; border: 1px solid #f1f5f9; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);">
    <div style="width: 4rem; height: 4rem; border-radius: 9999px; background-color: #ffe4e6; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
      <svg style="width: 2rem; height: 2rem; color: #f43f5e;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    </div>
    <h1 style="font-size: 1.5rem; font-weight: 800; color: #0f172a; margin-bottom: 0.75rem;">Private Article</h1>
    <p style="color: #64748b; font-size: 0.875rem; line-height: 1.5; margin-bottom: 1.5rem;">This article has been set to private by the administrator and is not accessible publicly.</p>
    <a href="/" style="display: inline-block; background-color: #7c3aed; color: #ffffff; padding: 0.75rem 1.5rem; border-radius: 0.75rem; font-size: 0.875rem; font-weight: 700; text-decoration: none; transition: background-color 0.2s;">Return Home</a>
  </div>
</div>
          `;
          template = template.replace('<div id="root"></div>', `<div id="root">${privateLayout}</div>`);
          template = await injectCustomCode(template);
          return res.status(403).set({ "Content-Type": "text/html" }).end(template);
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
        template = await injectCustomCode(template);
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
