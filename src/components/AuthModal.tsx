import React, { useState, useEffect } from "react";
import { 
  Lock, KeyRound, X, Eye, EyeOff, LogIn, UserPlus, 
  ArrowLeft, CheckCircle2, AlertCircle, Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserAccount } from "../types";
import { db, DB_PATHS } from "../firebase";
import { ref, get, set, push, update } from "firebase/database";
import { initUserSectionSession } from "../utils/sessionManager";
import { playClickSound, playSuccessSound } from "../utils/audioEffects";
import TomatoIcon from "./TomatoIcon";

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: "login" | "register";
  onClose: () => void;
  onSuccessLogin: (user: UserAccount) => void;
  onNavigateHome?: () => void;
  isStandalonePage?: boolean;
}

export default function AuthModal({
  isOpen,
  initialMode = "register",
  onClose,
  onSuccessLogin,
  onNavigateHome,
  isStandalonePage = false
}: AuthModalProps) {
  const [authMode, setAuthMode] = useState<"login" | "register">(initialMode);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successAnimation, setSuccessAnimation] = useState<boolean>(false);

  // Sync mode when prop changes
  useEffect(() => {
    setAuthMode(initialMode);
    setErrorMsg(null);
    setPassword("");
  }, [initialMode, isOpen]);

  if (!isOpen && !isStandalonePage) return null;

  // Handle single-field Registration with just Password
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanPass = password.trim();
    if (!cleanPass) {
      setErrorMsg("Please enter a password to create your account.");
      return;
    }
    if (cleanPass.length < 4) {
      setErrorMsg("Password must be at least 4 characters.");
      return;
    }

    playClickSound();
    setIsSubmitting(true);

    try {
      // Auto-generate clean unique member details
      const userRandomNum = Math.floor(1000 + Math.random() * 9000);
      const userId = "user_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 6);
      const autoName = `Coder #${userRandomNum}`;
      const autoHandle = `@coder_${userRandomNum}`;
      const autoEmail = `user_${Date.now()}@sprocoder.online`;
      const timestamp = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

      const rawUser: UserAccount = {
        id: userId,
        name: autoName,
        username: autoHandle,
        email: autoEmail,
        password: cleanPass,
        registeredAt: timestamp,
        lastLogin: new Date().toLocaleString(),
        avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(autoHandle)}`,
        savedArticles: [],
        likedArticles: [],
        viewedCourses: [],
        likedCourses: [],
        history: [],
        role: "reader"
      };

      // Generate session token
      const { updatedUser } = await initUserSectionSession(rawUser);

      // Save to Firebase Realtime Database
      await set(ref(db, `${DB_PATHS.USERS}/${userId}`), updatedUser);

      // Push registration log
      const logRef = push(ref(db, "logs/registrations"));
      await set(logRef, {
        userId,
        registeredAt: new Date().toLocaleString()
      });

      playSuccessSound();
      setSuccessAnimation(true);

      // Save locally & trigger login
      localStorage.setItem("spro_user", JSON.stringify(updatedUser));
      onSuccessLogin(updatedUser);

      setTimeout(() => {
        if (onNavigateHome) {
          onNavigateHome();
        }
        onClose();
      }, 1000);

    } catch (err: any) {
      console.error("Registration error:", err);
      setErrorMsg(err.message || "Failed to create account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle single-field Login with just Password
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanPass = password.trim();
    if (!cleanPass) {
      setErrorMsg("Please enter your account password to log in.");
      return;
    }

    playClickSound();
    setIsSubmitting(true);

    try {
      // Find matching user with this password in Firebase RTDB
      const usersRef = ref(db, DB_PATHS.USERS);
      const snapshot = await get(usersRef);
      const allUsers: Record<string, any> = snapshot.exists() ? snapshot.val() : {};

      // Match by password
      let matchedUserEntry = Object.values(allUsers).find((u: any) => {
        return u && u.password && u.password === cleanPass;
      });

      // If no matching account found, seamlessly create one for this password
      if (!matchedUserEntry) {
        const userRandomNum = Math.floor(1000 + Math.random() * 9000);
        const userId = "user_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 6);
        const autoName = `Coder #${userRandomNum}`;
        const autoHandle = `@coder_${userRandomNum}`;
        const autoEmail = `user_${Date.now()}@sprocoder.online`;
        const timestamp = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

        const newUser: UserAccount = {
          id: userId,
          name: autoName,
          username: autoHandle,
          email: autoEmail,
          password: cleanPass,
          registeredAt: timestamp,
          lastLogin: new Date().toLocaleString(),
          avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(autoHandle)}`,
          savedArticles: [],
          likedArticles: [],
          viewedCourses: [],
          likedCourses: [],
          history: [],
          role: "reader"
        };

        const { updatedUser } = await initUserSectionSession(newUser);
        await set(ref(db, `${DB_PATHS.USERS}/${userId}`), updatedUser);
        matchedUserEntry = updatedUser;
      }

      const rawUser: UserAccount = {
        ...matchedUserEntry,
        lastLogin: new Date().toLocaleString()
      };

      const { updatedUser } = await initUserSectionSession(rawUser);

      await update(ref(db, `${DB_PATHS.USERS}/${matchedUserEntry.id}`), {
        lastLogin: updatedUser.lastLogin,
        sectionId: updatedUser.sectionId,
        sessionToken: updatedUser.sessionToken
      });

      playSuccessSound();
      setSuccessAnimation(true);

      localStorage.setItem("spro_user", JSON.stringify(updatedUser));
      onSuccessLogin(updatedUser);

      setTimeout(() => {
        if (onNavigateHome) {
          onNavigateHome();
        }
        onClose();
      }, 1000);

    } catch (err: any) {
      console.error("Login error:", err);
      setErrorMsg(err.message || "Failed to sign in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const contentCard = (
    <div 
      className={`relative w-full max-w-md bg-white rounded-3xl border-2 border-slate-900 shadow-2xl overflow-hidden p-6 sm:p-8 transition-all ${
        isStandalonePage ? "mx-auto my-6" : ""
      }`}
      id="auth-card-container"
    >
      {/* Top Header Row with Close / Back Button & Tomato Icon */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center shadow-xs">
            <TomatoIcon className="w-6 h-6" size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 leading-tight">
              {authMode === "register" ? "Create Account" : "Welcome Back"}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {authMode === "register" 
                ? "Enter a password to register instantly" 
                : "Enter your password to sign in"}
            </p>
          </div>
        </div>

        {isStandalonePage ? (
          <button
            onClick={onNavigateHome || onClose}
            type="button"
            className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            id="auth-back-home-btn"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>
        ) : (
          <button
            onClick={onClose}
            type="button"
            className="p-2 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            id="auth-close-modal-btn"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Mode Switcher Tabs */}
      <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl mb-6 border border-slate-200">
        <button
          type="button"
          onClick={() => {
            playClickSound();
            setAuthMode("register");
            setErrorMsg(null);
          }}
          className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            authMode === "register"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
              : "text-slate-500 hover:text-slate-800"
          }`}
          id="tab-switch-register"
        >
          <UserPlus className="w-3.5 h-3.5 text-rose-500" />
          <span>Register</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playClickSound();
            setAuthMode("login");
            setErrorMsg(null);
          }}
          className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            authMode === "login"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
              : "text-slate-500 hover:text-slate-800"
          }`}
          id="tab-switch-login"
        >
          <LogIn className="w-3.5 h-3.5 text-purple-600" />
          <span>Login</span>
        </button>
      </div>

      {/* Success Notification */}
      {successAnimation ? (
        <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center animate-bounce">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-base font-black text-slate-900">
            {authMode === "register" ? "Account Created!" : "Signed In Successfully!"}
          </h3>
          <p className="text-xs text-slate-500">
            Redirecting to your dashboard...
          </p>
        </div>
      ) : (
        /* Simplified Single-Field Form (Only Password) */
        <form
          onSubmit={authMode === "register" ? handleRegisterSubmit : handleLoginSubmit}
          className="space-y-5"
          id="single-field-auth-form"
        >
          {/* Error Message Box */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Single Field: Password */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4 text-slate-400" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={authMode === "register" ? "Create your password..." : "Enter your password..."}
                autoFocus
                className="w-full pl-10 pr-11 py-3 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent font-medium bg-slate-50/50 hover:bg-white transition-colors"
                id="auth-single-password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                id="auth-toggle-password-visibility"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              {authMode === "register" 
                ? "Your account will be generated with full access using this password." 
                : "Sign in instantly with your account password."}
            </p>
          </div>

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            id="auth-submit-btn"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : authMode === "register" ? (
              <>
                <TomatoIcon className="w-4 h-4" size={18} />
                <span>Create Account</span>
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Sign In</span>
              </>
            )}
          </button>

          {/* Bottom Switch Helper */}
          <div className="text-center pt-2">
            {authMode === "register" ? (
              <p className="text-xs text-slate-600">
                Already have a password?{" "}
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setAuthMode("login");
                    setErrorMsg(null);
                  }}
                  className="font-bold text-purple-700 hover:underline cursor-pointer ml-1"
                >
                  Sign in here
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-600">
                Need a new account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setAuthMode("register");
                    setErrorMsg(null);
                  }}
                  className="font-bold text-rose-600 hover:underline cursor-pointer ml-1"
                >
                  Create one now
                </button>
              </p>
            )}
          </div>
        </form>
      )}
    </div>
  );

  // If this is a standalone full page view
  if (isStandalonePage) {
    return (
      <div className="w-full min-h-[70vh] flex items-center justify-center p-4" id="standalone-auth-page">
        {contentCard}
      </div>
    );
  }

  // Pop-up modal overlay view
  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        id="auth-modal-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md flex items-center justify-center"
        >
          {contentCard}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
