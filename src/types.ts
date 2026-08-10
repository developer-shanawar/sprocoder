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
  feedViews?: number; // Previews: counted when someone views a post card
  articleViews?: number; // Reads: counted when someone opens the article
  fakeViews?: number; // Custom fake views for public readers
  thumbnailUrl: string; // Dynamic thumbnail URL (ImgBB support)
  isAiGenerated?: boolean;
  metaDescription?: string;
  keywords?: string; // Target SEO, EEO, GEO keywords
  competitiveTrends?: string; // Latest search and competitive patterns
  comments?: Comment[];
  publishStatus?: "direct" | "scheduled";
  scheduledDate?: string;
  visibility?: "public" | "private";
  seoFormatted?: boolean;
  schemaMarkup?: string;
  canonicalUrl?: string;
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
  password?: string;
  registeredAt: string;
  lastLogin: string;
  username?: string; // e.g. @shanawar
  avatarUrl?: string; // profile picture URL
  ipAddress?: string; // User IP Address
  country?: string; // User Country
  city?: string; // User City
  region?: string; // User State / Region
  savedArticles?: string[]; // list of post ids
  likedArticles?: string[]; // list of liked post ids
  viewedCourses?: string[]; // list of viewed course ids
  likedCourses?: string[]; // list of liked course ids
  completedCourses?: string[]; // list of completed course ids
  history?: HistoryEntry[]; // list of reading logs
  role?: "admin" | "author" | "reader" | "marketer" | "guest";
  isBanned?: boolean;
  banReason?: string;
  bannedAt?: string;
  publishedArticlesCount?: number;
  sectionId?: string; // Unique Section ID for cross-subdomain coding workspace (code.espro.online)
  sessionToken?: string; // Session token stored in browser cookie
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

export interface CourseLesson {
  id: string;
  lessonNumber: number;
  title: string;
  tagline?: string;
  excerpt: string;
  readTime: string;
  articleId?: string;
  articleSlug?: string;
  content?: string;
  tags?: string[];
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  thumbnailUrl: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  estimatedHours: string;
  articleCount: number;
  lessons: CourseLesson[];
  createdAt: string;
  author: string;
  isAiGenerated?: boolean;
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

