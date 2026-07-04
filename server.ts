import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

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
    app.use(vite.middlewares);

    // Support clean client-side routing on page refresh / copy-pasted URLs in development
    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      
      // Allow API endpoints and standard static assets with dot extensions to fall through
      if (url.startsWith("/api") || url.includes(".")) {
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
