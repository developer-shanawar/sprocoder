import { slugify } from "./slugify";

export interface SeoOptions {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  category?: string;
  date?: string;
  modifiedDate?: string;
  author?: string;
  tags?: string[];
  type?: "website" | "article" | "profile" | "course";
  faqs?: Array<{ question: string; answer: string }>;
}

export function updateDocumentSeo(options: SeoOptions) {
  if (typeof document === "undefined") return;

  const defaultTitle = "S Pro Coder | Coding Tutorials, Web Development & AI Tools";
  const defaultDesc = "S Pro Coder (sprocoder.online) is a premier technology and programming publication founded by Shanawar Ali, delivering tested coding tutorials, web development walkthroughs, and practical AI tools guides.";
  const defaultImage = "https://www.sprocoder.online/logo.svg";

  const title = options.title 
    ? (options.title.includes("S Pro Coder") ? options.title : `${options.title} | S Pro Coder`) 
    : defaultTitle;
  const description = options.description || defaultDesc;
  const image = options.image || defaultImage;
  const canonicalUrl = options.url || (typeof window !== "undefined" ? window.location.href.split("?")[0] : "https://www.sprocoder.online/");
  const authorName = options.author || "Shanawar Ali";

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
      tag.setAttribute(relVal, hrefVal);
      document.head.appendChild(tag);
    }
    tag.setAttribute("href", hrefVal || "");
  };

  // Standard Meta Tags
  setMetaTag("name", "description", description);
  setMetaTag("name", "author", authorName);

  // Open Graph
  setMetaTag("property", "og:site_name", "S Pro Coder");
  setMetaTag("property", "og:title", title);
  setMetaTag("property", "og:description", description);
  setMetaTag("property", "og:image", image);
  setMetaTag("property", "og:url", canonicalUrl);
  setMetaTag("property", "og:type", options.type === "article" ? "article" : "website");

  // Twitter
  setMetaTag("name", "twitter:card", "summary_large_image");
  setMetaTag("name", "twitter:site", "@sprocoder");
  setMetaTag("name", "twitter:creator", "@sprocoder");
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

  const logoObject = {
    "@type": "ImageObject",
    "url": "https://www.sprocoder.online/logo.svg"
  };

  const publisherObject = {
    "@type": "Organization",
    "name": "S Pro Coder",
    "url": "https://www.sprocoder.online",
    "logo": logoObject,
    "founder": {
      "@type": "Person",
      "name": "Shanawar Ali",
      "url": "https://www.sprocoder.online/author/shanawar-ali"
    }
  };

  if (options.type === "article") {
    const schemas: any[] = [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": options.title || "",
        "description": description,
        "image": [image],
        "url": canonicalUrl,
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": canonicalUrl
        },
        "datePublished": options.date || new Date().toISOString(),
        "dateModified": options.modifiedDate || options.date || new Date().toISOString(),
        "articleSection": options.category || "Technology",
        "keywords": (options.tags || []).join(", "),
        "author": {
          "@type": "Person",
          "name": authorName,
          "url": "https://www.sprocoder.online/author/shanawar-ali"
        },
        "publisher": publisherObject
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://www.sprocoder.online/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": options.category || "Articles",
            "item": `https://www.sprocoder.online/category/${slugify(options.category || "articles")}`
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": options.title || "Article",
            "item": canonicalUrl
          }
        ]
      }
    ];

    if (options.faqs && options.faqs.length > 0) {
      schemas.push({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": options.faqs.map(faq => ({
          "@type": "Question",
          "name": faq.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": faq.answer
          }
        }))
      });
    }

    jsonLdTag.textContent = JSON.stringify(schemas);
  } else if (options.type === "profile") {
    const personSchema = {
      "@context": "https://schema.org",
      "@type": "Person",
      "name": "Shanawar Ali",
      "url": "https://www.sprocoder.online/author/shanawar-ali",
      "jobTitle": "Founder & Lead Developer",
      "worksFor": publisherObject,
      "description": description,
      "sameAs": [
        "https://www.sprocoder.online",
        "https://github.com"
      ]
    };
    jsonLdTag.textContent = JSON.stringify(personSchema);
  } else {
    const websiteSchema = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "S Pro Coder",
      "url": "https://www.sprocoder.online/",
      "description": description,
      "publisher": publisherObject,
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://www.sprocoder.online/?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    };
    jsonLdTag.textContent = JSON.stringify(websiteSchema);
  }
}

