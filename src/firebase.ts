import { initializeApp, getApp, getApps } from "firebase/app";
import { getDatabase, ref, set, onValue, push, update, remove, get } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBeC6EfenQDUE_ZAYzwcDQ7GkWdK-SpScQ",
  authDomain: "fir-pro-coder.firebaseapp.com",
  databaseURL: "https://fir-pro-coder-default-rtdb.firebaseio.com",
  projectId: "fir-pro-coder",
  storageBucket: "fir-pro-coder.firebasestorage.app",
  messagingSenderId: "1069779331204",
  appId: "1:1069779331204:web:53b73d397261515d10bad1"
};

// Initialize Firebase safely
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getDatabase(app);

// Helper keys for Realtime Database Paths
export const DB_PATHS = {
  ARTICLES: "articles",
  CATEGORIES: "categories",
  USERS: "users",
  MESSAGES: "messages",
  PAGES: "pages", // about, policy
  NOTIFICATIONS: "notifications"
};
