import { BlogPost } from "../types";

export interface UserInterestProfile {
  categories: Record<string, number>;
  tags: Record<string, number>;
  keywords: Record<string, number>;
  lastUpdated: number;
}

const INTEREST_KEY = "spro_user_interest_profile";

export function getUserInterestProfile(): UserInterestProfile {
  if (typeof window === "undefined") {
    return { categories: {}, tags: {}, keywords: {}, lastUpdated: Date.now() };
  }
  try {
    const raw = localStorage.getItem(INTEREST_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Error reading user interest profile:", e);
  }
  return { categories: {}, tags: {}, keywords: {}, lastUpdated: Date.now() };
}

export function recordUserInterest(article: { category?: string; tags?: string[]; title?: string }) {
  if (typeof window === "undefined" || !article) return;
  try {
    const profile = getUserInterestProfile();

    if (article.category) {
      const cat = article.category.trim();
      profile.categories[cat] = (profile.categories[cat] || 0) + 1;
    }

    if (article.tags && Array.isArray(article.tags)) {
      article.tags.forEach((tag) => {
        const cleanTag = tag.trim().toLowerCase();
        if (cleanTag) {
          profile.tags[cleanTag] = (profile.tags[cleanTag] || 0) + 1;
        }
      });
    }

    if (article.title) {
      const words = article.title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !["with", "from", "that", "this", "your", "have", "more", "about"].includes(w));

      words.forEach((word) => {
        profile.keywords[word] = (profile.keywords[word] || 0) + 1;
      });
    }

    profile.lastUpdated = Date.now();
    localStorage.setItem(INTEREST_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error("Error recording user interest:", e);
  }
}

export function getRecommendedArticles(
  allPosts: BlogPost[],
  currentPost?: BlogPost | null,
  limit: number = 4
): BlogPost[] {
  if (!allPosts || allPosts.length === 0) return [];

  const profile = getUserInterestProfile();
  const currentPostId = currentPost?.id || "";

  // Compute recommendation scores
  const scoredPosts = allPosts
    .filter((p) => p.id !== currentPostId && p.visibility !== "private")
    .map((post) => {
      let score = 0;

      // 1. Current Article Direct Context Match
      if (currentPost) {
        if (post.category && currentPost.category && post.category.toLowerCase() === currentPost.category.toLowerCase()) {
          score += 15;
        }

        if (post.tags && currentPost.tags) {
          const commonTags = post.tags.filter((t) =>
            currentPost.tags?.some((ct) => ct.toLowerCase() === t.toLowerCase())
          );
          score += commonTags.length * 8;
        }

        // Title keyword similarity
        if (post.title && currentPost.title) {
          const currentWords = new Set(
            currentPost.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
          );
          const postWords = post.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
          const overlap = postWords.filter((w) => currentWords.has(w)).length;
          score += overlap * 5;
        }
      }

      // 2. Personal Interest Profile Match
      if (post.category && profile.categories[post.category]) {
        score += profile.categories[post.category] * 4;
      }

      if (post.tags) {
        post.tags.forEach((t) => {
          const cleanT = t.toLowerCase();
          if (profile.tags[cleanT]) {
            score += profile.tags[cleanT] * 3;
          }
        });
      }

      if (post.title) {
        const postWords = post.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
        postWords.forEach((w) => {
          if (profile.keywords[w]) {
            score += profile.keywords[w] * 2;
          }
        });
      }

      // 3. Popularity boost (views & likes)
      const views = (post.views || 0) + (post.articleViews || 0);
      score += Math.min(views / 50, 10);
      score += (post.likes || 0) * 0.5;

      return { post, score };
    });

  // Sort descending by score
  scoredPosts.sort((a, b) => b.score - a.score);

  return scoredPosts.slice(0, limit).map((sp) => sp.post);
}
