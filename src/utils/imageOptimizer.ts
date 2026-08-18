/**
 * Dynamic High-Performance Image URL Optimizer
 * Automatically optimizes heavy image assets into lightweight, high-speed responsive formats
 */
export function optimizeImageUrl(url?: string, width: number = 600, quality: number = 75): string {
  if (!url || typeof url !== "string") {
    return "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=600&q=75";
  }

  // Optimize Unsplash images with WebP/AVIF auto-format, responsive width, and optimal compression
  if (url.includes("images.unsplash.com")) {
    try {
      const urlObj = new URL(url);
      urlObj.searchParams.set("auto", "format");
      urlObj.searchParams.set("fit", "crop");
      urlObj.searchParams.set("w", String(width));
      urlObj.searchParams.set("q", String(quality));
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  return url;
}
