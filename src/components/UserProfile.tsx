import React, { useState } from "react";
import { 
  User, 
  Mail, 
  Calendar, 
  KeyRound, 
  Save, 
  Bookmark, 
  Heart, 
  History, 
  LogOut, 
  Loader2, 
  CheckCircle2, 
  Camera, 
  Upload, 
  ShieldCheck, 
  AtSign, 
  Globe, 
  BookOpen, 
  Award, 
  Layers, 
  Pencil, 
  X, 
  ChevronRight,
  Eye,
  FileText,
  AlertTriangle,
  Code,
  ExternalLink
} from "lucide-react";
import { UserAccount, BlogPost, Course } from "../types";
import { getCodingSectionRedirectUrl } from "../utils/sessionManager";
import { db, auth } from "../firebase";
import { ref, update, get } from "firebase/database";
import { updateEmail, updatePassword } from "firebase/auth";

interface UserProfileProps {
  currentUser: UserAccount | null;
  setCurrentUser: (user: UserAccount | null) => void;
  allPosts: BlogPost[];
  courses?: Course[];
  onSelectPost: (post: BlogPost) => void;
  onSelectCourse?: (course: Course) => void;
  onLogout: () => void;
}

export default function UserProfile({
  currentUser,
  setCurrentUser,
  allPosts,
  courses = [],
  onSelectPost,
  onSelectCourse,
  onLogout
}: UserProfileProps) {
  const [name, setName] = useState(currentUser?.name || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [username, setUsername] = useState(currentUser?.username || "");
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || "");
  const [password, setPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // UI Interactive States
  const [activeTab, setActiveTab] = useState<"courses" | "articles" | "saved">("courses");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showSignOutConfirmModal, setShowSignOutConfirmModal] = useState(false);

  if (!currentUser) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center bg-white/40 backdrop-blur-md border border-purple-100 rounded-3xl space-y-4 shadow-sm" id="profile-unauth-container">
        <User className="w-12 h-12 text-purple-400 mx-auto" />
        <h3 className="text-lg font-bold text-purple-950">Access Denied</h3>
        <p className="text-xs text-gray-500 max-w-sm mx-auto">
          Please log in or register an account using the navigation bar above to access your developer profile.
        </p>
      </div>
    );
  }

  // Filter saved & liked posts
  const savedArticles = allPosts.filter(post => currentUser.savedArticles?.includes(post.id));
  const likedArticles = allPosts.filter(post => currentUser.likedArticles?.includes(post.id));

  // Filter viewed & liked courses
  const viewedCoursesList = (courses || []).filter(c => currentUser.viewedCourses?.includes(c.id) || currentUser.viewedCourses?.includes(c.slug));
  const likedCoursesList = (courses || []).filter(c => currentUser.likedCourses?.includes(c.id) || currentUser.likedCourses?.includes(c.slug));
  const completedCoursesList = (courses || []).filter(c => currentUser.completedCourses?.includes(c.id) || currentUser.completedCourses?.includes(c.slug));

  // Get reading history in descending order
  const rawHistory = currentUser.history ? Object.values(currentUser.history) : [];
  const readingHistory = [...rawHistory].reverse();

  // ImgBB Upload Handler
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch("https://api.imgbb.com/1/upload?key=95bfa2c260a52e93433daf349259e043", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.success && data.data?.url) {
        setAvatarUrl(data.data.url);
        setMessage({ type: "success", text: "Avatar uploaded to ImgBB successfully! Click Save Profile Changes to save it." });
      } else {
        throw new Error(data.error?.message || "Failed to upload avatar to ImgBB.");
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "error", text: err.message || "Failed to upload avatar." });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    let cleanUsername = (username || "").trim().toLowerCase();
    if (cleanUsername) {
      if (!cleanUsername.startsWith("@")) {
        cleanUsername = "@" + cleanUsername;
      }
      const regex = /^@[a-z0-9_]{3,20}$/;
      if (!regex.test(cleanUsername)) {
        setMessage({ type: "error", text: "Username must be 3-20 characters long and can only contain letters, numbers, and underscores (e.g. @coder_12)" });
        setIsSaving(false);
        return;
      }

      try {
        const snapshot = await get(ref(db, "users"));
        if (snapshot.exists()) {
          const allUsers = snapshot.val();
          const isTaken = Object.values(allUsers).some((u: any) => u && u.id !== currentUser.id && u.username?.toLowerCase() === cleanUsername);
          if (isTaken) {
            setMessage({ type: "error", text: `The username ${cleanUsername} is already claimed by another coder.` });
            setIsSaving(false);
            return;
          }
        }
      } catch (err) {
        console.warn("Could not check username uniqueness:", err);
      }
    }

    try {
      const updates: any = {
        name: name.trim(),
        email: email.trim(),
        username: cleanUsername || null,
        avatarUrl: avatarUrl.trim() || null
      };
      
      await update(ref(db, `users/${currentUser.id}`), updates);

      if (auth.currentUser && (email || "").trim().toLowerCase() !== auth.currentUser.email?.toLowerCase()) {
        try {
          await updateEmail(auth.currentUser, email.trim());
        } catch (authErr: any) {
          console.warn("Firebase Auth email update failed/blocked:", authErr);
        }
      }

      if (password.trim() && auth.currentUser) {
        try {
          await updatePassword(auth.currentUser, password.trim());
        } catch (authErr: any) {
          console.warn("Firebase Auth password update failed/blocked:", authErr);
        }
      }

      const updatedUserCopy = {
        ...currentUser,
        name: name.trim(),
        email: email.trim(),
        username: cleanUsername || undefined,
        avatarUrl: avatarUrl.trim() || undefined
      };
      setCurrentUser(updatedUserCopy);
      localStorage.setItem("spro_user", JSON.stringify(updatedUserCopy));

      setPassword("");
      setMessage({ type: "success", text: "Your profile was updated successfully!" });
      setIsEditModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "error", text: err.message || "Failed to update profile settings." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300 pb-16" id="user-profile-view">
      
      {/* COMPACT TOP PROFILE HEADER BOX */}
      <div className="relative bg-white/80 backdrop-blur-xl border border-purple-100 rounded-[28px] p-5 shadow-lg shadow-purple-950/5 overflow-hidden">
        
        {/* Subtle Decorative Gradient Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Profile Avatar + Name + Username */}
          <div className="flex items-center gap-4 text-purple-950 w-full sm:w-auto">
            <div className="relative group shrink-0">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={currentUser.name || "User"} 
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-purple-200 shadow-md group-hover:scale-105 transition-transform"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center text-xl font-black shadow-md">
                  {(currentUser.name || currentUser.username || currentUser.email || "U").slice(0, 2).toUpperCase()}
                </div>
              )}
              
              <button 
                onClick={() => setIsEditModalOpen(true)}
                title="Change Avatar"
                className="absolute -bottom-1 -right-1 p-1 bg-purple-700 text-white rounded-full shadow-md hover:scale-110 transition-transform cursor-pointer border-2 border-white"
              >
                <Camera className="w-3 h-3" />
              </button>
            </div>

            <div className="min-w-0 flex-1">
              {/* Name + Inline Edit Icon */}
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-purple-950 truncate">
                  {currentUser.name || currentUser.username || currentUser.email || "User"}
                </h2>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  title="Edit Profile Name"
                  className="p-1 rounded-lg text-purple-600 hover:text-purple-800 hover:bg-purple-100/80 transition-colors cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              </div>

              {/* Username Only - USER ID IS HIDDEN FROM USER */}
              <div className="flex items-center gap-2 mt-0.5">
                {currentUser.username ? (
                  <span className="text-xs font-bold text-purple-700 font-mono bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                    {currentUser.username}
                  </span>
                ) : (
                  <span className="text-xs text-purple-400 font-mono italic">No @username set</span>
                )}
                <span className="text-[10px] text-gray-400 font-mono">• {currentUser.email}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons: EDIT PROFILE + SIGN OUT BUTTON WITH CROSS ICON */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end border-t sm:border-t-0 border-purple-100 pt-3 sm:pt-0">
            {/* Edit Profile Button */}
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="px-4 py-2 bg-purple-50 hover:bg-purple-100/80 text-purple-900 border border-purple-200/80 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Pencil className="w-3.5 h-3.5 text-purple-600" />
              <span>Edit Profile</span>
            </button>

            {/* Sign Out Button with Cross & Logout Icon */}
            <button
              onClick={() => setShowSignOutConfirmModal(true)}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100/80 text-rose-700 border border-rose-200/80 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600" />
              <span>Sign Out</span>
              <X className="w-3.5 h-3.5 text-rose-500" />
            </button>
          </div>

        </div>
      </div>

      {/* SOCIAL MEDIA STYLE TABBED NAVIGATION BAR */}
      <div className="flex items-center justify-center sm:justify-start gap-2 border-b border-purple-100/80 pb-1">
        <button
          onClick={() => setActiveTab("courses")}
          className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer border ${
            activeTab === "courses"
              ? "bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-200 scale-105"
              : "bg-white/60 text-purple-950 border-purple-100/60 hover:bg-white"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Courses ({viewedCoursesList.length + likedCoursesList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("articles")}
          className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer border ${
            activeTab === "articles"
              ? "bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-200 scale-105"
              : "bg-white/60 text-purple-950 border-purple-100/60 hover:bg-white"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>History & Articles ({readingHistory.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("saved")}
          className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer border ${
            activeTab === "saved"
              ? "bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-200 scale-105"
              : "bg-white/60 text-purple-950 border-purple-100/60 hover:bg-white"
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>Saved Articles ({savedArticles.length})</span>
        </button>
      </div>

      {/* TAB CONTENT 1: COURSES SECTION */}
      {activeTab === "courses" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Viewed & Active Courses Grid */}
          <div className="bg-white/60 backdrop-blur-lg border border-purple-100 rounded-[28px] p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-purple-950 uppercase tracking-wider flex items-center justify-between border-b border-purple-100 pb-3">
              <span className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-600" />
                <span>My Courses Activity ({viewedCoursesList.length})</span>
              </span>
              <span className="text-[10px] font-mono text-purple-600 font-bold bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100">
                Active Learning
              </span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {viewedCoursesList.map(course => (
                <div
                  key={course.id}
                  onClick={() => onSelectCourse && onSelectCourse(course)}
                  className="p-4 bg-white hover:bg-purple-50/50 rounded-2xl border border-purple-100/80 flex gap-3.5 items-center cursor-pointer transition-all hover:-translate-y-0.5 shadow-sm group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 overflow-hidden shrink-0 relative shadow-sm">
                    {course.thumbnailUrl ? (
                      <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-purple-400">
                        <BookOpen className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <h4 className="text-xs font-extrabold text-purple-950 line-clamp-2 leading-tight group-hover:text-purple-700 transition-colors">
                      {course.title}
                    </h4>
                    {/* Level & Category badges placed in content area below title */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      <span className="text-[9px] font-bold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-md uppercase tracking-wider">
                        {course.category || "Development"}
                      </span>
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md capitalize">
                        {course.level || "Beginner"}
                      </span>
                      <span className="text-[9px] text-gray-400 font-mono">
                        {course.lessons?.length || 0} Lessons
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              ))}

              {viewedCoursesList.length === 0 && (
                <div className="col-span-2 text-center py-8 bg-purple-50/40 rounded-2xl border border-dashed border-purple-200 space-y-2">
                  <BookOpen className="w-8 h-8 text-purple-400 mx-auto" />
                  <p className="text-xs font-bold text-purple-900">No viewed courses recorded yet.</p>
                  <p className="text-[11px] text-gray-500">Explore our interactive courses catalog to start learning!</p>
                </div>
              )}
            </div>
          </div>

          {/* Liked Courses Section */}
          <div className="bg-white/60 backdrop-blur-lg border border-purple-100 rounded-[28px] p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-rose-950 uppercase tracking-wider flex items-center gap-2 border-b border-rose-100/60 pb-3">
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
              <span>Liked Courses ({likedCoursesList.length})</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {likedCoursesList.map(course => (
                <div
                  key={course.id}
                  onClick={() => onSelectCourse && onSelectCourse(course)}
                  className="p-4 bg-white hover:bg-rose-50/30 rounded-2xl border border-rose-100/60 flex gap-3.5 items-center cursor-pointer transition-all hover:-translate-y-0.5 shadow-sm group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white font-extrabold flex items-center justify-center shrink-0 shadow-sm">
                    <Heart className="w-6 h-6 fill-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-mono font-bold text-rose-500 uppercase">{course.category}</p>
                    <h4 className="text-xs font-extrabold text-purple-950 line-clamp-2 leading-tight group-hover:text-rose-600 transition-colors">{course.title}</h4>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-rose-600 transition-all shrink-0" />
                </div>
              ))}

              {likedCoursesList.length === 0 && (
                <p className="text-xs text-gray-400 py-4 text-center col-span-2">You haven't liked any courses yet.</p>
              )}
            </div>
          </div>

          {/* Completed Courses Achievement Badges */}
          {completedCoursesList.length > 0 && (
            <div className="bg-emerald-50/80 backdrop-blur-lg border border-emerald-200 rounded-[28px] p-6 shadow-sm space-y-3">
              <h3 className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-2 border-b border-emerald-200 pb-3">
                <Award className="w-4 h-4 text-emerald-600" />
                <span>Completed Courses ({completedCoursesList.length})</span>
              </h3>
              <div className="flex flex-wrap gap-2.5 pt-1">
                {completedCoursesList.map(course => (
                  <span key={course.id} className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white text-emerald-900 border border-emerald-200 rounded-2xl text-xs font-bold shadow-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{course.title}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* TAB CONTENT 2: ARTICLES & HISTORY */}
      {activeTab === "articles" && (
        <div className="bg-white/60 backdrop-blur-lg border border-purple-100 rounded-[28px] p-6 shadow-sm space-y-4 animate-in fade-in duration-300">
          <h3 className="text-xs font-black text-purple-950 uppercase tracking-wider flex items-center gap-2 border-b border-purple-100 pb-3">
            <History className="w-4 h-4 text-purple-600" />
            <span>Reading History ({readingHistory.length})</span>
          </h3>

          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {readingHistory.map((item: any, idx: number) => {
              const matchedPost = allPosts.find(p => p.id === item.articleId);
              return (
                <div
                  key={idx}
                  onClick={() => matchedPost && onSelectPost(matchedPost)}
                  className="p-3.5 bg-white hover:bg-purple-50/60 rounded-2xl border border-purple-100/60 flex items-center justify-between gap-3 cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 font-bold text-xs">
                      <Eye className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-purple-950 group-hover:text-purple-700 transition-colors line-clamp-1">{item.title}</h4>
                      <p className="text-[10px] text-gray-400 font-mono">{item.date} {item.time && `• ${item.time}`}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-purple-600 transition-colors shrink-0" />
                </div>
              );
            })}

            {readingHistory.length === 0 && (
              <p className="text-xs text-gray-400 py-8 text-center bg-purple-50/30 rounded-2xl border border-dashed border-purple-100">No reading history logged yet.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: SAVED ARTICLES */}
      {activeTab === "saved" && (
        <div className="bg-white/60 backdrop-blur-lg border border-purple-100 rounded-[28px] p-6 shadow-sm space-y-4 animate-in fade-in duration-300">
          <h3 className="text-xs font-black text-purple-950 uppercase tracking-wider flex items-center gap-2 border-b border-purple-100 pb-3">
            <Bookmark className="w-4 h-4 text-purple-600" />
            <span>Saved & Bookmarked Articles ({savedArticles.length})</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedArticles.map(post => (
              <div
                key={post.id}
                onClick={() => onSelectPost(post)}
                className="p-4 bg-white hover:bg-purple-50/50 rounded-2xl border border-purple-100/80 flex gap-3.5 items-center cursor-pointer transition-all hover:-translate-y-0.5 shadow-sm group"
              >
                <img src={post.thumbnailUrl} alt={post.title} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] font-mono text-purple-600 font-bold uppercase">{post.category}</span>
                  <h4 className="text-xs font-bold text-purple-950 line-clamp-2 leading-tight group-hover:text-purple-700 transition-colors">{post.title}</h4>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 transition-colors shrink-0" />
              </div>
            ))}

            {savedArticles.length === 0 && (
              <p className="text-xs text-gray-400 py-8 text-center col-span-2 bg-purple-50/30 rounded-2xl border border-dashed border-purple-100">No saved articles yet.</p>
            )}
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL / DRAWER */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[10000] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[32px] max-w-md w-full p-6 space-y-6 shadow-2xl border border-purple-100 text-purple-950 animate-in zoom-in duration-200">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-purple-100 pb-4">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-black text-purple-950">Edit Profile</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-purple-100 text-purple-900 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {message && (
              <div className={`p-3 rounded-2xl text-xs flex gap-2 items-start ${
                message.type === "success" 
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                  : "bg-red-50 text-red-700 border border-red-100"
              }`}>
                {message.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
              
              {/* Avatar Upload */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-purple-900 tracking-wider">Avatar Photo</label>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200 overflow-hidden shrink-0 flex items-center justify-center">
                    {isUploading ? (
                      <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
                    ) : avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-purple-400" />
                    )}
                  </div>
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-xl text-xs cursor-pointer border border-purple-200 transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploading ? "Uploading..." : "Upload New Photo"}</span>
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={isUploading} />
                  </label>
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-purple-900">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-purple-200 bg-white font-bold text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              {/* Username */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-purple-900">Username (@)</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-purple-200 bg-white font-mono font-bold text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="@username"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-purple-900">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-purple-200 bg-white font-bold text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-purple-900 flex justify-between">
                  <span>New Password</span>
                  <span className="text-[9px] text-gray-400 font-normal">Optional</span>
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-purple-200 bg-white font-bold text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isUploading}
                  className="px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{isSaving ? "Saving..." : "Save Profile Changes"}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* CONFIRM SIGN OUT POP-UP MODAL */}
      {showSignOutConfirmModal && (
        <div className="fixed inset-0 z-[10000] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-sm w-full p-6 text-center space-y-5 shadow-2xl border border-rose-100 animate-in zoom-in duration-200">
            
            <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shadow-sm">
              <AlertTriangle className="w-6 h-6 text-rose-600" />
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-black text-purple-950">
                Confirm Sign Out
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed font-medium">
                Are you sure you want to sign out? Any unsaved profile edits will be discarded upon logout.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setShowSignOutConfirmModal(false)}
                className="py-2.5 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-bold transition-all cursor-pointer border border-purple-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowSignOutConfirmModal(false);
                  onLogout();
                }}
                className="py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-all cursor-pointer shadow-md shadow-rose-200 flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Confirm Sign Out</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
