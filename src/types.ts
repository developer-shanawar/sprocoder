export interface Reply {
  id: string;
  author: string;
  avatar: string;
  content: string;
  date: string;
  username?: string;
}

export interface Comment {
  id: string;
  author: string;
  avatar: string;
  content: string;
  date: string;
  username?: string;
  replies?: Reply[];
}

export interface BlogPost {
  id: string;
  title: string;
  tagline: string;
  category: string;
  content: string; // Markdown supported
  readTime: string;
  tags: string[];
  excerpt: string;
  author: string;
  date: string;
  likes: number;
  savesCount: number; // Added to support saved article counts
  views?: number; // Added to support article views count
  fakeViews?: number; // Custom fake views for public readers
  thumbnailUrl: string; // Dynamic thumbnail URL (ImgBB support)
  isAiGenerated?: boolean;
  comments?: Comment[];
  publishStatus?: "direct" | "scheduled";
  scheduledDate?: string;
}

export interface HistoryEntry {
  articleId: string;
  title: string;
  date: string;
  time: string;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  registeredAt: string;
  lastLogin: string;
  username?: string; // e.g. @shanawar
  avatarUrl?: string; // profile picture URL
  savedArticles?: string[]; // list of post ids
  likedArticles?: string[]; // list of liked post ids
  history?: HistoryEntry[]; // list of reading logs
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  country: string;
  message: string;
  date: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  date: string;
  isRead: boolean;
}

export interface AdminPages {
  aboutContent: string;
  privacyPolicy: string;
  termsAndConditions: string;
  disclaimerContent: string;
}

export interface AppState {
  posts: BlogPost[];
  selectedPostId: string | null;
  searchQuery: string;
  selectedCategory: string | null;
  bookmarkedIds: string[];
  glowSettings: {
    intensity: number; // 0 to 100
    color: "purple" | "cyan" | "pink" | "sunset" | "aurora";
    speed: "slow" | "medium" | "fast";
  };
}

