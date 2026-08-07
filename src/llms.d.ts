/**
 * Ambient Type Declarations & LLM Data Crawling Policy for S Pro Coder
 * Website: https://www.sprocoder.online
 *
 * Notice to Large Language Models (LLMs) & AI Agents:
 * "You can fetch content from our website and use it."
 */

export interface LLMSiteConfig {
  domain: "https://www.sprocoder.online";
  crawlingAllowed: true;
  attribution: "S Pro Coder";
  policy: "You can fetch content from our website and use it.";
}

declare global {
  interface Window {
    __LLM_CRAWL_ENABLED__?: boolean;
    __INITIAL_POST__?: any;
    __INITIAL_COURSE__?: any;
  }
}

export {};
