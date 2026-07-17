import React, { useState } from "react";
import { User, Mail, Calendar, KeyRound, Save, Bookmark, Heart, History, LogOut, Loader2, CheckCircle2, Camera, Upload, ShieldCheck, AtSign } from "lucide-react";
import { UserAccount, BlogPost } from "../types";
import { db, auth } from "../firebase";
import { ref, update, get } from "firebase/database";
import { updateEmail, updatePassword } from "firebase/auth";

interface UserProfileProps {
  currentUser: UserAccount | null;
  setCurrentUser: (user: UserAccount | null) => void;
  allPosts: BlogPost[];
  onSelectPost: (post: BlogPost) => void;
  onLogout: () => void;
}

export default function UserProfile({
  currentUser,
  setCurrentUser,
  allPosts,
  onSelectPost,
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

    let cleanUsername = username.trim().toLowerCase();
    if (cleanUsername) {
      if (!cleanUsername.startsWith("@")) {
        cleanUsername = "@" + cleanUsername;
      }
      // Check alphanumeric format
      const regex = /^@[a-z0-9_]{3,20}$/;
      if (!regex.test(cleanUsername)) {
        setMessage({ type: "error", text: "Username must be 3-20 characters long and can only contain letters, numbers, and underscores (e.g. @coder_12)" });
        setIsSaving(false);
        return;
      }

      // Check uniqueness in database
      try {
        const snapshot = await get(ref(db, "users"));
        if (snapshot.exists()) {
          const allUsers = snapshot.val();
          const isTaken = Object.values(allUsers).some((u: any) => u.id !== currentUser.id && u.username?.toLowerCase() === cleanUsername);
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
      // 1. Update Realtime Database profile
      const updates: any = {
        name: name.trim(),
        email: email.trim(),
        username: cleanUsername || null,
        avatarUrl: avatarUrl.trim() || null
      };
      
      await update(ref(db, `users/${currentUser.id}`), updates);

      // 2. Optional: Try Firebase Auth update for email
      if (auth.currentUser && email.trim().toLowerCase() !== auth.currentUser.email?.toLowerCase()) {
        try {
          await updateEmail(auth.currentUser, email.trim());
        } catch (authErr: any) {
          console.warn("Firebase Auth email update failed/blocked. Continuing with local profile update...", authErr);
        }
      }

      // 3. Optional: Try Firebase Auth update for password
      if (password.trim() && auth.currentUser) {
        try {
          await updatePassword(auth.currentUser, password.trim());
        } catch (authErr: any) {
          console.warn("Firebase Auth password update failed/blocked. Continuing...", authErr);
        }
      }

      // Update local state copy
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
      setMessage({ type: "success", text: "Your professional coder profile has been updated successfully!" });
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "error", text: err.message || "Failed to update profile settings." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16" id="user-profile-view">
      
      {/* Upper Cover Banner */}
      <div className="relative h-44 rounded-[36px] bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-500 overflow-hidden shadow-md">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-white/10 rounded-full filter blur-2xl" />
        <div className="absolute top-6 left-6 flex items-center gap-4 text-white z-10">
          <div className="relative group">
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt={currentUser.name} 
                className="w-16 h-16 rounded-2xl object-cover border-2 border-white/40 shadow-inner"
                referrerPolicy="no-referrer"
                loading="lazy"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-2xl font-black shadow-inner">
                {currentUser.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            
            <label className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
              <Camera className="w-5 h-5 text-white" />
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleAvatarUpload} 
                className="hidden" 
              />
            </label>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">{currentUser.name}</h2>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-center gap-2">
              {currentUser.username ? (
                <p className="text-xs font-bold text-purple-200 font-mono bg-purple-900/30 px-2 py-0.5 rounded-md">{currentUser.username}</p>
              ) : (
                <p className="text-xs text-purple-100 font-mono">No username claimed</p>
              )}
              <p className="text-[10px] text-purple-200 font-mono">ID: {currentUser.id}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Settings / Profile Info */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white/40 backdrop-blur-lg border border-white/60 rounded-[32px] p-6 shadow-sm space-y-6">
            <div className="border-b border-purple-100/50 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-black text-purple-950 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-purple-600" />
                <span>Profile Settings</span>
              </h3>
              <button
                onClick={onLogout}
                className="text-[10px] bg-red-50 hover:bg-red-100 text-red-600 font-bold px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              >
                <LogOut className="w-3 h-3" />
                <span>Sign Out</span>
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

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {/* Profile Avatar Loader */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-purple-900 uppercase tracking-wider block">Avatar Profile Picture</label>
                <div className="flex gap-3 items-center">
                  <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 overflow-hidden flex items-center justify-center shrink-0">
                    {isUploading ? (
                      <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
                    ) : avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
                    ) : (
                      <User className="w-5 h-5 text-purple-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-purple-100 text-purple-700 hover:bg-purple-50 rounded-xl text-[11px] font-bold cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploading ? "Uploading..." : "Upload Photo"}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleAvatarUpload} 
                        className="hidden" 
                        disabled={isUploading}
                      />
                    </label>
                    <p className="text-[9px] text-gray-400 mt-1">Directly hosts to cloud storage.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-purple-900 uppercase tracking-wider block">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-purple-100 bg-white text-xs text-purple-950 font-bold focus:outline-none focus:border-purple-300"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-purple-900 uppercase tracking-wider block">Unique Username</label>
                <div className="relative">
                  <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. @shanawar"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-purple-100 bg-white text-xs text-purple-950 font-bold focus:outline-none focus:border-purple-300 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-purple-900 uppercase tracking-wider block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-purple-100 bg-white text-xs text-purple-950 font-bold focus:outline-none focus:border-purple-300"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-purple-900 uppercase tracking-wider block">New Password</label>
                  <span className="text-[9px] text-gray-400 italic">Leave empty to keep current</span>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-purple-100 bg-white text-xs text-purple-950 font-bold focus:outline-none focus:border-purple-300"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSaving || isUploading}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-2xl text-xs shadow-md shadow-purple-100 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all disabled:opacity-55"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{isSaving ? "Updating Profile..." : "Save Profile Changes"}</span>
                </button>
              </div>
            </form>

            {/* Joining metadata */}
            <div className="pt-4 border-t border-purple-50/50 flex justify-between text-[10px] text-gray-400 font-mono">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-purple-400" />
                <span>Registered: {currentUser.registeredAt}</span>
              </span>
              <span>Last login: {currentUser.lastLogin?.split(",")[0] || "Today"}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Lists (Bookmarks, Likes, History) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Saved Articles */}
          <div className="bg-white/40 backdrop-blur-lg border border-white/60 rounded-[32px] p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-purple-950 uppercase tracking-wider flex items-center gap-2 border-b border-purple-100/50 pb-2">
              <Bookmark className="w-4 h-4 text-purple-600" />
              <span>Saved Articles ({savedArticles.length})</span>
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
              {savedArticles.map(post => (
                <div
                  key={post.id}
                  onClick={() => onSelectPost(post)}
                  className="p-3 bg-white hover:bg-purple-50/40 rounded-2xl border border-purple-100/40 flex gap-2.5 items-center cursor-pointer transition-all hover:-translate-y-0.5 group"
                >
                  <img src={post.thumbnailUrl} alt={post.title} className="w-12 h-12 rounded-xl object-cover shrink-0 border border-purple-50" referrerPolicy="no-referrer" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold text-purple-600 uppercase tracking-wider">{post.category}</p>
                    <h4 className="text-[11px] font-bold text-purple-950 line-clamp-2 leading-tight group-hover:text-purple-700 transition-colors">{post.title}</h4>
                  </div>
                </div>
              ))}
              {savedArticles.length === 0 && (
                <p className="text-[11px] text-gray-400 py-6 text-center col-span-2">No saved articles yet. Bookmark publications to read them here.</p>
              )}
            </div>
          </div>

          {/* Liked Publications */}
          <div className="bg-white/40 backdrop-blur-lg border border-white/60 rounded-[32px] p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-purple-950 uppercase tracking-wider flex items-center gap-2 border-b border-purple-100/50 pb-2">
              <Heart className="w-4 h-4 text-rose-500" />
              <span>Liked Guides ({likedArticles.length})</span>
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
              {likedArticles.map(post => (
                <div
                  key={post.id}
                  onClick={() => onSelectPost(post)}
                  className="p-3 bg-white hover:bg-rose-50/20 rounded-2xl border border-rose-100/30 flex gap-2.5 items-center cursor-pointer transition-all hover:-translate-y-0.5 group"
                >
                  <img src={post.thumbnailUrl} alt={post.title} className="w-12 h-12 rounded-xl object-cover shrink-0 border border-purple-50" referrerPolicy="no-referrer" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold text-rose-500 uppercase tracking-wider">{post.category}</p>
                    <h4 className="text-[11px] font-bold text-purple-950 line-clamp-2 leading-tight group-hover:text-rose-600 transition-colors">{post.title}</h4>
                  </div>
                </div>
              ))}
              {likedArticles.length === 0 && (
                <p className="text-[11px] text-gray-400 py-6 text-center col-span-2">You haven't liked any articles yet.</p>
              )}
            </div>
          </div>

          {/* Reading History */}
          <div className="bg-white/40 backdrop-blur-lg border border-white/60 rounded-[32px] p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-purple-950 uppercase tracking-wider flex items-center gap-2 border-b border-purple-100/50 pb-2">
              <History className="w-4 h-4 text-purple-600" />
              <span>Reading Logs & History ({readingHistory.length})</span>
            </h3>
            
            <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
              {readingHistory.map((item: any, idx) => {
                const targetPost = allPosts.find(p => p.id === item.articleId);
                return (
                  <div
                    key={idx}
                    onClick={() => targetPost && onSelectPost(targetPost)}
                    className="p-2.5 bg-white/70 hover:bg-purple-50/30 rounded-xl border border-purple-100/20 flex justify-between items-center text-xs cursor-pointer transition-colors"
                  >
                    <span className="font-bold text-purple-950 truncate max-w-[320px] hover:text-purple-700">
                      {item.title}
                    </span>
                    <span className="text-[9px] text-gray-400 shrink-0 font-mono">
                      {item.date} • {item.time}
                    </span>
                  </div>
                );
              })}
              {readingHistory.length === 0 && (
                <p className="text-[11px] text-gray-400 py-6 text-center">Your reading activities will be compiled and displayed here.</p>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
