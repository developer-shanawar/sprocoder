import { BlogPost } from "../types";

const DISPOSABLE_DOMAINS = [
  "mailinator.com", "tempmail.com", "10minutemail.com", "guerrillamail.com",
  "trashmail.com", "dispostable.com", "yopmail.com", "getnada.com",
  "sharklasers.com", "temp-mail.org", "fakeinbox.com", "throwawaymail.com",
  "generator.email", "maildrop.cc"
];

/**
 * Validates whether an email is a legitimate user email (strictly requiring @gmail.com or standard verified domain, and blocking temp emails)
 */
export function validateUserEmail(email: string): { valid: boolean; error?: string } {
  const cleanEmail = email.trim().toLowerCase();
  
  if (!cleanEmail) {
    return { valid: false, error: "Email address is required." };
  }

  // Basic format check
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
  if (!emailRegex.test(cleanEmail)) {
    return { valid: false, error: "Invalid email format. Please provide a real email address." };
  }

  const domain = cleanEmail.split("@")[1];
  
  // Check against known temporary/disposable domains
  if (DISPOSABLE_DOMAINS.includes(domain)) {
    return { valid: false, error: "Temporary or disposable emails are strictly prohibited. Please use a real address like @gmail.com." };
  }

  // Soft check for gmail or standard domains
  if (!cleanEmail.endsWith("@gmail.com") && !cleanEmail.endsWith(".com") && !cleanEmail.endsWith(".org") && !cleanEmail.endsWith(".edu") && !cleanEmail.endsWith(".net")) {
    return { valid: false, error: "Please enter a valid email address ending with @gmail.com or standard domain." };
  }

  return { valid: true };
}

/**
 * Automatic AI Article Formatter Bot:
 * Adjusts sentences, formats headings, structures paragraphs, calculates read time,
 * generates Google-compliant SEO meta tags, and attaches JSON-LD schema markup.
 */
export function runArticleFormatterBot(input: {
  title: string;
  tagline?: string;
  category: string;
  content: string;
  author: string;
  thumbnailUrl?: string;
  tags?: string[];
  excerpt?: string;
}): {
  formattedTitle: string;
  formattedTagline: string;
  formattedContent: string;
  excerpt: string;
  readTime: string;
  metaDescription: string;
  keywords: string;
  schemaMarkup: string;
  canonicalUrl: string;
} {
  let title = (input.title || "Untitled Tech Insights").trim();
  // Capitalize Title Properly
  title = title
    .split(" ")
    .map((word) => {
      if (!word) return "";
      if (["a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "with", "of"].includes(word.toLowerCase())) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");

  // Ensure initial letter is uppercase
  title = title.charAt(0).toUpperCase() + title.slice(1);

  // Tagline formatting
  let tagline = (input.tagline || "").trim();
  if (!tagline) {
    tagline = `Comprehensive guide and deep dive into ${input.category || "modern software engineering"}.`;
  }

  // Format Article Content for optimal readability and Google Crawling
  let body = (input.content || "").trim();

  // 1. Remove multiple blank lines and standardize sentence spacing
  body = body.replace(/ +/g, " "); // collapse double spaces
  body = body.replace(/\n{3,}/g, "\n\n"); // max 2 line breaks

  // 2. Format Headings cleanly (# -> H1, ## -> H2, ### -> H3) while preserving code blocks
  const lines = body.split("\n");
  let inCodeBlock = false;
  const formattedLines = lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("```") || trimmed.startsWith("<pre") || trimmed.endsWith("</pre>")) {
      inCodeBlock = !inCodeBlock;
      return line;
    }
    if (inCodeBlock) {
      return line;
    }
    if (!trimmed) return "";
    
    // Auto-fix headings missing space after #
    if (/^#{1,3}[A-Za-z]/.test(trimmed)) {
      return trimmed.replace(/^(#{1,3})([A-Za-z].*)$/, "$1 $2");
    }

    // Auto-format bold key sentences if short heading-like line without markdown
    if (trimmed.length < 55 && !trimmed.startsWith("#") && !trimmed.startsWith("-") && !trimmed.startsWith(">") && !trimmed.startsWith("<") && !trimmed.endsWith(".") && !trimmed.endsWith(":") && !trimmed.endsWith(";")) {
      return `## ${trimmed}`;
    }

    // Auto-format bullet points
    if (/^[\*\•]\s*/.test(trimmed)) {
      return trimmed.replace(/^[\*\•]\s*/, "- ");
    }

    return trimmed;
  });

  let formattedContent = formattedLines.join("\n\n");

  // If article has no headings, automatically insert structured section headings
  if (!formattedContent.includes("## ") && !formattedContent.includes("### ")) {
    const paragraphs = formattedContent.split("\n\n");
    if (paragraphs.length >= 3) {
      paragraphs[0] = `## Executive Overview\n\n${paragraphs[0]}`;
      paragraphs[Math.floor(paragraphs.length / 2)] = `## Core Architecture & Technical Analysis\n\n${paragraphs[Math.floor(paragraphs.length / 2)]}`;
      paragraphs[paragraphs.length - 1] = `## Key Takeaways & Industry Impact\n\n${paragraphs[paragraphs.length - 1]}`;
      formattedContent = paragraphs.join("\n\n");
    }
  }

  // Ensure key takeaway blockquote at the top if missing
  if (!formattedContent.includes("> ")) {
    const topSummary = tagline || `In-depth technical breakdown covering ${input.category}.`;
    formattedContent = `> **Key Summary:** ${topSummary}\n\n${formattedContent}`;
  }

  // Word Count and Read Time calculation
  const words = formattedContent.replace(/<[^>]*>?/gm, "").split(/\s+/).filter(Boolean).length;
  const readTimeMinutes = Math.max(1, Math.ceil(words / 200));
  const readTime = `${readTimeMinutes} min read`;

  // Auto Excerpt (140-160 chars for search snippet)
  let excerpt = (input.excerpt || "").trim();
  if (!excerpt) {
    const plainText = formattedContent.replace(/#|#|#|>|-|\*\*|\*/g, "").trim();
    excerpt = plainText.slice(0, 155).trim() + "...";
  }

  // Meta Description for Google indexing
  const metaDescription = excerpt.slice(0, 160);

  // SEO Keywords string
  const tagsList = input.tags && input.tags.length > 0 ? input.tags : [input.category.toLowerCase(), "software engineering", "tech news", "google indexing"];
  const keywords = tagsList.join(", ");

  // Generate Slug and Canonical URL
  const slug = title.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
  const canonicalUrl = `https://www.sprocoder.online/blog/${slug}`;

  // Google Schema.org Article JSON-LD Markup
  const schemaObj = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "headline": title,
    "description": metaDescription,
    "image": input.thumbnailUrl || "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
    "author": {
      "@type": "Person",
      "name": input.author || "S Pro Coder"
    },
    "publisher": {
      "@type": "Organization",
      "name": "S PRO CODER",
      "logo": {
        "@type": "ImageObject",
        "url": "https://www.sprocoder.online/logo.svg"
      }
    },
    "datePublished": new Date().toISOString(),
    "dateModified": new Date().toISOString(),
    "mainEntityOfPage": canonicalUrl,
    "articleSection": input.category || "Technology",
    "wordCount": words
  };

  const schemaMarkup = JSON.stringify(schemaObj, null, 2);

  return {
    formattedTitle: title,
    formattedTagline: tagline,
    formattedContent,
    excerpt,
    readTime,
    metaDescription,
    keywords,
    schemaMarkup,
    canonicalUrl
  };
}
