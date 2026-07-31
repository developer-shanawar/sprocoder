import { slugify } from "./slugify";

export interface SeoOptions {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  category?: string;
  date?: string;
  author?: string;
  tags?: string[];
  type?: "website" | "article";
}

export function updateDocumentSeo(options: SeoOptions) {
  if (typeof document === "undefined") return;

  const defaultTitle = "S pro coder | Tech News, AI News, AI Tools & Games";
  const defaultDesc = "S pro coder (sprocoder.online) is a premium tech tutorials and professional development portal, supplying high-end tech guides, coding deep dives and AI insights.";
  const defaultImage = "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=80";

  const title = options.title ? `${options.title} | S pro coder` : defaultTitle;
  const description = options.description || defaultDesc;
  const image = options.image || defaultImage;
  const canonicalUrl = options.url || (typeof window !== "undefined" ? window.location.href : "https://www.sprocoder.online/");

  // 1. Title
  document.title = title;

  // Helpers to update meta/link tags
  const setMetaTag = (attrName: "name" | "property", attrVal: string, contentVal: string) => {
    let tag = document.querySelector(`meta[${attrName}="${attrVal}"]`);
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute(attrName, attrVal);
      document.head.appendChild(tag);
    }
    tag.setAttribute("content", contentVal || "");
  };

  const setLinkTag = (relVal: string, hrefVal: string) => {
    let tag = document.querySelector(`link[rel="${relVal}"]`);
    if (!tag) {
      tag = document.createElement("link");
      tag.setAttribute("rel", relVal);
      document.head.appendChild(tag);
    }
    tag.setAttribute("href", hrefVal || "");
  };

  // Standard Meta Tags
  setMetaTag("name", "description", description);

  // Open Graph
  setMetaTag("property", "og:title", title);
  setMetaTag("property", "og:description", description);
  setMetaTag("property", "og:image", image);
  setMetaTag("property", "og:url", canonicalUrl);
  setMetaTag("property", "og:type", options.type || "website");

  // Twitter
  setMetaTag("name", "twitter:card", "summary_large_image");
  setMetaTag("name", "twitter:title", title);
  setMetaTag("name", "twitter:description", description);
  setMetaTag("name", "twitter:image", image);

  // Canonical Link
  setLinkTag("canonical", canonicalUrl);

  // JSON-LD Schema
  let jsonLdTag = document.getElementById("json-ld-seo-schema") as HTMLScriptElement | null;
  if (!jsonLdTag) {
    jsonLdTag = document.createElement("script");
    jsonLdTag.id = "json-ld-seo-schema";
    jsonLdTag.type = "application/ld+json";
    document.head.appendChild(jsonLdTag);
  }

  if (options.type === "article") {
    const articleSchema = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": options.title || "",
      "description": description,
      "image": [image],
      "url": canonicalUrl,
      "datePublished": options.date || new Date().toISOString(),
      "articleSection": options.category || "Technology",
      "keywords": (options.tags || []).join(", "),
      "author": {
        "@type": "Person",
        "name": options.author || "Shanawar Ali"
      },
      "publisher": {
        "@type": "Organization",
        "name": "S pro coder",
        "url": "https://www.sprocoder.online"
      }
    };
    jsonLdTag.textContent = JSON.stringify(articleSchema);
  } else {
    const websiteSchema = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "S pro coder",
      "url": "https://www.sprocoder.online/",
      "description": description,
      "publisher": {
        "@type": "Organization",
        "name": "S pro coder"
      }
    };
    jsonLdTag.textContent = JSON.stringify(websiteSchema);
  }
}
