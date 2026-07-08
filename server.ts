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

// New AI schema for Q&A article formatting
const aiBlogPostSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "Highly engaging, elite, and catchy article title." },
    tagline: { type: Type.STRING, description: "Compelling subtitle / tagline for the article." },
    category: { type: Type.STRING, description: "The category of the article (must match the requested category or be a highly powerful trending category)." },
    content: { 
      type: Type.STRING, 
      description: "Full-length detailed article body in English. MUST be structured as a sequence of high-quality Q&A (Question & Answer) sections. Each Question must be wrapped EXACTLY in: <div class=\"p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-xl text-emerald-900 font-bold my-4\">Q: [Question Text]</div>. The answer must follow immediately as highly professional, rich, and sophisticated English paragraphs. No markdown headers inside the green highlighted div, only standard text inside it. No extra empty spaces or simple English, at least 500 words total across all sections." 
    },
    readTime: { type: Type.STRING, description: "Calculated read time, e.g., '6 min read'." },
    tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Array of 4-5 lowercase keyword tags suitable for filtering."
    },
    excerpt: { type: Type.STRING, description: "A brief, compelling 2-sentence summary of the article." },
    author: { type: Type.STRING, description: "Author name, e.g., 'Chroma Analyst' or 'S Pro Sage'." },
    imageSearchKeyword: { type: Type.STRING, description: "Unsplash search keyword, e.g., 'artificial intelligence neural', 'cybersecurity hacking', 'web coding', or 'quantum computing node'." }
  },
  required: ["title", "tagline", "category", "content", "readTime", "tags", "excerpt", "author", "imageSearchKeyword"]
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
    const { option, category, publishTime, openRouterKey, huggingFaceKey, imgbbKey } = req.body;

    let prompt = "";
    if (option === "manual") {
      prompt = `Write a deeply engaging, professional, high-quality tech/science article in the category: "${category}". 
The article MUST NOT use simple English or contain any mock templates, and must be at least 500 words of rich content.
The article MUST be structured as a sequence of Questions and Answers (Q&A format).
For each section, formulate an intriguing, powerful question and follow it with a highly detailed, professional, and educational answer.
Each Question MUST be wrapped exactly in the following HTML tag so it can be styled in green on the website:
<div class="p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-xl text-emerald-900 font-bold my-4">Q: [Intriguing Question Here]</div>
Follow each question immediately with several paragraphs of sophisticated, clean answer text (using normal markdown, no extra spaces or mock placeholder files).
Generate a catchy title, compelling subtitle/tagline, a brief 2-sentence excerpt, and 4-5 relevant tags/keywords.`;
    } else {
      // Auto system
      prompt = `First, scan the market trends to identify a trending, powerful tech or science category (e.g. AI Agents, Web3 development, Quantum Computing, Serverless Edge, or advanced cybersecurity). 
Select the absolute best trending category.
Then, write an elite, high-quality, professional tech/science article for this selected category.
The article MUST NOT use simple English or contain any mock templates, and must be at least 500 words of rich content.
The article MUST be structured as a sequence of Questions and Answers (Q&A format).
For each section, formulate an intriguing, powerful question and follow it with a highly detailed, professional, and educational answer.
Each Question MUST be wrapped exactly in the following HTML tag so it can be styled in green on the website:
<div class="p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-xl text-emerald-900 font-bold my-4">Q: [Intriguing Question Here]</div>
Follow each question immediately with several paragraphs of sophisticated, clean answer text (using normal markdown, no extra spaces or mock placeholder files).
Generate a catchy title, compelling subtitle/tagline, a brief 2-sentence excerpt, and 4-5 relevant tags/keywords. Make sure the generated category is stored in the 'category' field.`;
    }

    let blogPost: any = null;

    if (openRouterKey) {
      console.log("Generating text content via OpenRouter...");
      const openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openRouterKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are an elite, award-winning blogger, technology journalist, and tech researcher who writes deeply engaging, polished articles in professional and sophisticated English. You structure articles using Q&A formats where the questions are embedded in clean, green-bordered styled div tags to serve as stunning reading elements.
You MUST respond with a raw JSON object matching this schema exactly (do not output any markdown code blocks or wrapping, just the raw JSON object):
{
  "title": "catchy title",
  "tagline": "compelling subtitle/tagline",
  "category": "category name",
  "content": "detailed article content with Q&A format using <div class=\"p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-xl text-emerald-900 font-bold my-4\">Q: [Question]</div> tags. Each question must be wrapped in this exact div tag. Formulate the intriguing question and follow with highly detailed, professional, and educational answers in sophisticated English.",
  "readTime": "e.g. 5 min read",
  "tags": ["tag1", "tag2"],
  "excerpt": "A brief, compelling 2-sentence summary of the article.",
  "author": "e.g. S Pro Sage",
  "imageSearchKeyword": "Unsplash search keyword, e.g. artificial intelligence neural"
}`
            },
            {
              role: "user",
              content: prompt
            }
          ],
          response_format: { type: "json_object" }
        })
      });

      if (!openRouterRes.ok) {
        const errText = await openRouterRes.text();
        throw new Error(`OpenRouter returned ${openRouterRes.status}: ${errText}`);
      }

      let orData: any;
      try {
        orData = await openRouterRes.json();
      } catch {
        throw new Error("Failed to parse OpenRouter response as JSON.");
      }

      const rawText = orData.choices?.[0]?.message?.content;
      if (!rawText) {
        throw new Error("Empty response received from OpenRouter");
      }

      blogPost = safeJsonParse(rawText);
    } else {
      // Fallback to local Gemini client if configured
      if (!ai) {
        return res.status(503).json({
          error: "No OpenRouter key provided and local Gemini API key is missing. Please configure keys in Settings."
        });
      }

      console.log("Generating text content via local Gemini client...");
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an elite, award-winning blogger, technology journalist, and tech researcher who writes deeply engaging, polished articles in professional and sophisticated English. You structure articles using Q&A formats where the questions are embedded in clean, green-bordered styled div tags to serve as stunning reading elements.",
          responseMimeType: "application/json",
          responseSchema: aiBlogPostSchema
        }
      });

      const jsonStr = response.text;
      if (!jsonStr) {
        throw new Error("Empty response received from Gemini");
      }
      blogPost = safeJsonParse(jsonStr);
    }
    
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

// Dynamic Google AdSense ads.txt crawler endpoint
app.get("/ads.txt", async (req, res) => {
  try {
    const dbUrl = "https://fir-pro-coder-default-rtdb.firebaseio.com/settings/adsTxt.json";
    const response = await fetch(dbUrl);
    let data = "";
    if (response.ok) {
      data = await response.json() || "";
    }
    
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    if (data && typeof data === "string" && data.trim().length > 0) {
      return res.send(data);
    } else {
      // Default AdSense compliant ads.txt structure. Admins can customize this in the Admin Panel.
      const defaultAdsTxt = `# S pro coder Google AdSense Configuration (Dynamic ads.txt)
# Replace with your verified Publisher ID inside the S pro coder Admin Panel > Custom Codes & AdSense Setup
google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0
`;
      return res.send(defaultAdsTxt);
    }
  } catch (err) {
    console.error("Error fetching ads.txt:", err);
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.send("google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0");
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
