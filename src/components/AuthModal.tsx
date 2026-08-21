import React, { useState, useEffect } from "react";
import { 
  Lock, X, Eye, EyeOff, LogIn, UserPlus, 
  ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, 
  Loader2, User, Mail, Phone, Send, Check
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserAccount } from "../types";
import { db, DB_PATHS } from "../firebase";
import { ref, get, set, push, update, onValue } from "firebase/database";
import { initUserSectionSession } from "../utils/sessionManager";
import { playClickSound, playSuccessSound } from "../utils/audioEffects";

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
  
  // Registration Step: 1 = Name & Username, 2 = Email & Password, 3 = WhatsApp/Telegram
  const [registerStep, setRegisterStep] = useState<1 | 2 | 3>(1);

  // Registration Form State
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [telegram, setTelegram] = useState("");

  // Login Form State (Exactly Two Boxes: Email/Username + Password)
  const [loginIdentifier, setLoginIdentifier] = useState(""); // Email or Username
  const [loginPassword, setLoginPassword] = useState("");

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successAnimation, setSuccessAnimation] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>("");

  // Existing users cache for real-time username / email uniqueness checking
  const [existingUsers, setExistingUsers] = useState<UserAccount[]>([]);

  // Fetch registered users for uniqueness validation
  useEffect(() => {
    const usersRef = ref(db, DB_PATHS.USERS);
    const unsub = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        const usersList: UserAccount[] = Object.values(val);
        setExistingUsers(usersList);
      } else {
        setExistingUsers([]);
      }
    });
    return () => unsub();
  }, []);

  // Reset/sync mode when prop changes
  useEffect(() => {
    setAuthMode(initialMode);
    setErrorMsg(null);
    setRegisterStep(1);
    setSuccessAnimation(false);
  }, [initialMode, isOpen]);

  // Username validation helper
  const cleanUsername = username.trim().toLowerCase().replace(/^@/, "");
  const isUsernameLengthValid = cleanUsername.length >= 3;
  const isUsernameFormatValid = /^[a-z0-9_]+$/.test(cleanUsername);
  const isUsernameTaken = existingUsers.some((u) => {
    if (!u || !u.username) return false;
    const uClean = u.username.trim().toLowerCase().replace(/^@/, "");
    return uClean === cleanUsername;
  });
  const isUsernameAvailable = cleanUsername.length >= 3 && isUsernameFormatValid && !isUsernameTaken;

  // Email validation helper
  const cleanEmail = email.trim().toLowerCase();
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);
  const isEmailTaken = existingUsers.some((u) => u?.email?.toLowerCase().trim() === cleanEmail);

  // Step 1 -> Step 2 validation
  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim()) {
      setErrorMsg("Please enter your full name.");
      return;
    }
    if (!cleanUsername) {
      setErrorMsg("Please enter a username.");
      return;
    }
    if (!isUsernameLengthValid) {
      setErrorMsg("Username must be at least 3 characters long.");
      return;
    }
    if (!isUsernameFormatValid) {
      setErrorMsg("Username can only contain letters, numbers, and underscores.");
      return;
    }
    if (isUsernameTaken) {
      setErrorMsg("This username is already taken. Please choose another.");
      return;
    }

    playClickSound();
    setRegisterStep(2);
  };

  // Step 2 -> Step 3 validation
  const handleStep2Next = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!cleanEmail) {
      setErrorMsg("Please enter your email address.");
      return;
    }
    if (!isEmailValid) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    if (isEmailTaken) {
      setErrorMsg("An account with this email already exists. Please log in.");
      return;
    }
    if (!password || password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    playClickSound();
    setRegisterStep(3);
  };

  // Step 3 -> Final Registration Submit
  const handleRegisterFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanWhatsapp = whatsapp.trim();
    const cleanTelegram = telegram.trim();

    // One thing is required: WhatsApp OR Telegram
    if (!cleanWhatsapp && !cleanTelegram) {
      setErrorMsg("Please enter either your WhatsApp Number or Telegram Username. At least one is required.");
      return;
    }

    playClickSound();
    setIsSubmitting(true);

    try {
      const userId = "user_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 6);
      const formattedHandle = cleanUsername.startsWith("@") ? cleanUsername : `@${cleanUsername}`;
      const timestamp = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

      const rawUser: UserAccount = {
        id: userId,
        name: fullName.trim(),
        username: formattedHandle,
        email: cleanEmail,
        password: password.trim(),
        whatsapp: cleanWhatsapp || undefined,
        telegram: cleanTelegram || undefined,
        registeredAt: timestamp,
        lastLogin: new Date().toLocaleString(),
        avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(formattedHandle)}`,
        savedArticles: [],
        likedArticles: [],
        viewedCourses: [],
        likedCourses: [],
        history: [],
        role: "reader"
      };

      // Generate section ID & session token
      const { updatedUser } = await initUserSectionSession(rawUser);

      // Save user to Firebase Realtime Database
      await set(ref(db, `${DB_PATHS.USERS}/${userId}`), updatedUser);

      // Push registration audit log
      const logRef = push(ref(db, "logs/registrations"));
      await set(logRef, {
        userId,
        name: fullName.trim(),
        username: formattedHandle,
        email: cleanEmail,
        whatsapp: cleanWhatsapp || null,
        telegram: cleanTelegram || null,
        registeredAt: new Date().toLocaleString()
      });

      playSuccessSound();
      setSuccessMessage("Account Created Successfully!");
      setSuccessAnimation(true);

      // Save locally & trigger login
      localStorage.setItem("spro_user", JSON.stringify(updatedUser));
      onSuccessLogin(updatedUser);

      setTimeout(() => {
        if (onNavigateHome) {
          onNavigateHome();
        }
        onClose();
      }, 1200);

    } catch (err: any) {
      console.error("Registration error:", err);
      setErrorMsg(err.message || "Failed to create account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Two-Box Login Handler (Email or Username + Password)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const identifier = loginIdentifier.trim().toLowerCase();
    const identifierClean = identifier.replace(/^@/, "");
    const cleanPass = loginPassword.trim();

    if (!identifier) {
      setErrorMsg("Please enter your email or username.");
      return;
    }
    if (!cleanPass) {
      setErrorMsg("Please enter your password.");
      return;
    }

    playClickSound();
    setIsSubmitting(true);

    try {
      // Find matching user in Firebase RTDB
      const usersRef = ref(db, DB_PATHS.USERS);
      const snapshot = await get(usersRef);
      const allUsers: Record<string, any> = snapshot.exists() ? snapshot.val() : {};
      const usersList: any[] = Object.values(allUsers);

      // Match by Email or Username, AND Password
      const matchedUserEntry = usersList.find((u: any) => {
        if (!u) return false;
        const userEmail = (u.email || "").toLowerCase().trim();
        const userUsername = (u.username || "").toLowerCase().trim();
        const userUsernameClean = userUsername.replace(/^@/, "");

        const isIdentifierMatch = 
          userEmail === identifier || 
          userUsername === identifier || 
          userUsernameClean === identifierClean;

        const isPasswordMatch = (u.password || "").trim() === cleanPass;

        return isIdentifierMatch && isPasswordMatch;
      });

      if (!matchedUserEntry) {
        setErrorMsg("Incorrect email/username or password. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // Check if user is banned
      if (matchedUserEntry.isBanned) {
        setErrorMsg(`This account has been suspended. Reason: ${matchedUserEntry.banReason || "Terms Violation"}`);
        setIsSubmitting(false);
        return;
      }

      const rawUser: UserAccount = {
        ...matchedUserEntry,
        lastLogin: new Date().toLocaleString()
      };

      const { updatedUser } = await initUserSectionSession(rawUser);

      // Update last active login in Firebase
      await update(ref(db, `${DB_PATHS.USERS}/${matchedUserEntry.id}`), {
        lastLogin: updatedUser.lastLogin,
        sectionId: updatedUser.sectionId,
        sessionToken: updatedUser.sessionToken
      });

      playSuccessSound();
      setSuccessMessage("Signed In Successfully!");
      setSuccessAnimation(true);

      localStorage.setItem("spro_user", JSON.stringify(updatedUser));
      onSuccessLogin(updatedUser);

      setTimeout(() => {
        if (onNavigateHome) {
          onNavigateHome();
        }
        onClose();
      }, 1200);

    } catch (err: any) {
      console.error("Login error:", err);
      setErrorMsg(err.message || "Failed to sign in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen && !isStandalonePage) return null;

  const contentCard = (
    <div 
      className={`relative w-full max-w-lg bg-white rounded-[28px] border-2 border-slate-900 shadow-2xl overflow-hidden p-6 sm:p-8 transition-all ${
        isStandalonePage ? "mx-auto my-6" : ""
      }`}
      id="auth-card-container"
    >
      {/* Header Row */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 shadow-xs">
            {authMode === "register" ? (
              <UserPlus className="w-5 h-5" />
            ) : (
              <LogIn className="w-5 h-5" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 leading-tight">
              {authMode === "register" ? "Create Your Account" : "Welcome Back"}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {authMode === "register" 
                ? "Join the S pro coder developer community" 
                : "Sign in with your email or username and password"}
            </p>
          </div>
        </div>

        {isStandalonePage ? (
          <button
            onClick={onNavigateHome || onClose}
            type="button"
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
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
      <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl mb-5 border border-slate-200">
        <button
          type="button"
          onClick={() => {
            playClickSound();
            setAuthMode("register");
            setRegisterStep(1);
            setErrorMsg(null);
          }}
          className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            authMode === "register"
              ? "bg-white text-purple-950 shadow-sm border border-slate-200/80"
              : "text-slate-500 hover:text-slate-800"
          }`}
          id="tab-switch-register"
        >
          <UserPlus className="w-3.5 h-3.5 text-purple-600" />
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
              ? "bg-white text-purple-950 shadow-sm border border-slate-200/80"
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
        <div className="py-8 flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in duration-300">
          <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-500 text-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">
              {successMessage || (authMode === "register" ? "Account Created Successfully!" : "Signed In Successfully!")}
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Redirecting to your account dashboard...
            </p>
          </div>
        </div>
      ) : authMode === "register" ? (
        /* Multi-Step Registration Form */
        <div>
          {/* Progress Step Header Indicator */}
          <div className="mb-5">
            <div className="flex items-center justify-between relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 w-full bg-slate-200 -z-0" />
              <div 
                className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-emerald-500 transition-all duration-300 -z-0"
                style={{ width: registerStep === 1 ? "0%" : registerStep === 2 ? "50%" : "100%" }}
              />

              {/* Step 1 Circle */}
              <div className="flex flex-col items-center z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  registerStep > 1 
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" 
                    : registerStep === 1 
                      ? "bg-purple-600 text-white ring-4 ring-purple-100" 
                      : "bg-slate-200 text-slate-500"
                }`}>
                  {registerStep > 1 ? <Check className="w-4 h-4" /> : "1"}
                </div>
                <span className="text-[10px] font-bold text-slate-600 mt-1">Profile</span>
              </div>

              {/* Step 2 Circle */}
              <div className="flex flex-col items-center z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  registerStep > 2 
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" 
                    : registerStep === 2 
                      ? "bg-purple-600 text-white ring-4 ring-purple-100" 
                      : "bg-slate-200 text-slate-500"
                }`}>
                  {registerStep > 2 ? <Check className="w-4 h-4" /> : "2"}
                </div>
                <span className="text-[10px] font-bold text-slate-600 mt-1">Security</span>
              </div>

              {/* Step 3 Circle */}
              <div className="flex flex-col items-center z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  registerStep === 3 
                    ? "bg-purple-600 text-white ring-4 ring-purple-100" 
                    : "bg-slate-200 text-slate-500"
                }`}>
                  3
                </div>
                <span className="text-[10px] font-bold text-slate-600 mt-1">Contact</span>
              </div>
            </div>
          </div>

          {/* Error Message Box */}
          {errorMsg && (
            <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: Full Name & Username */}
          {registerStep === 1 && (
            <form onSubmit={handleStep1Next} className="space-y-4" id="register-step-1-form">
              {/* Full Name Field */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name (e.g. John Doe)"
                    autoFocus
                    required
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent font-medium bg-slate-50/50 hover:bg-white transition-colors"
                    id="register-full-name-input"
                  />
                </div>
              </div>

              {/* Username on the Platform Field (With Real-Time Availability Check & Green Border) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Username on Platform <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                    @
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="choose_username"
                    required
                    className={`w-full pl-8 pr-10 py-2.5 text-sm rounded-xl border font-medium transition-all ${
                      cleanUsername.length >= 3
                        ? isUsernameAvailable
                          ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 text-emerald-950"
                          : "border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20 text-rose-950"
                        : "border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent bg-slate-50/50 hover:bg-white"
                    }`}
                    id="register-username-input"
                  />
                  {/* Status Indicator Icon */}
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    {cleanUsername.length >= 3 && (
                      isUsernameAvailable ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xs">
                          <X className="w-3.5 h-3.5" />
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Username Availability Feedback Message */}
                <div className="mt-1.5 min-h-[18px]">
                  {cleanUsername.length >= 3 ? (
                    isUsernameAvailable ? (
                      <p className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Username is available!</span>
                      </p>
                    ) : isUsernameTaken ? (
                      <p className="text-xs text-rose-600 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Username is already taken. Please choose another.</span>
                      </p>
                    ) : (
                      <p className="text-xs text-rose-600 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Only letters, numbers, and underscores allowed.</span>
                      </p>
                    )
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      Minimum 3 characters (e.g. coder_pro)
                    </p>
                  )}
                </div>
              </div>

              {/* Next Step Button */}
              <button
                type="submit"
                disabled={!fullName.trim() || !isUsernameAvailable}
                className="w-full py-3 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 active:scale-[0.99] text-white text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                id="register-step-1-next-btn"
              >
                <span>Next Step</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* STEP 2: Email & Password */}
          {registerStep === 2 && (
            <form onSubmit={handleStep2Next} className="space-y-4" id="register-step-2-form">
              {/* Email Address Field */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="name@example.com"
                    autoFocus
                    required
                    className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border font-medium transition-all ${
                      cleanEmail.length > 3
                        ? isEmailValid && !isEmailTaken
                          ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 text-emerald-950"
                          : isEmailTaken
                            ? "border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20 text-rose-950"
                            : "border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent bg-slate-50/50 hover:bg-white"
                        : "border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent bg-slate-50/50 hover:bg-white"
                    }`}
                    id="register-email-input"
                  />
                </div>
                {isEmailTaken && (
                  <p className="text-xs text-rose-600 font-bold mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Email is already registered.</span>
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password (min. 6 characters)"
                    required
                    minLength={6}
                    className="w-full pl-10 pr-11 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent font-medium bg-slate-50/50 hover:bg-white transition-colors"
                    id="register-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                    id="register-toggle-password-visibility"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Must be at least 6 characters.
                </p>
              </div>

              {/* Step 2 Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setRegisterStep(1);
                    setErrorMsg(null);
                  }}
                  className="w-1/3 py-2.5 px-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  id="register-step-2-back-btn"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  disabled={!isEmailValid || isEmailTaken || password.length < 6}
                  className="w-2/3 py-2.5 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 active:scale-[0.99] text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  id="register-step-2-next-btn"
                >
                  <span>Next Step</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: WhatsApp or Telegram (Required - at least one) */}
          {registerStep === 3 && (
            <form onSubmit={handleRegisterFinalSubmit} className="space-y-4" id="register-step-3-form">
              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-2xl">
                <p className="text-xs text-purple-950 font-bold leading-relaxed">
                  📱 Contact Requirement:
                </p>
                <p className="text-[11px] text-purple-900 mt-0.5 leading-relaxed">
                  Please enter either your <span className="font-bold underline">WhatsApp Number</span> or <span className="font-bold underline">Telegram Username</span>. At least one is required to create your account.
                </p>
              </div>

              {/* WhatsApp Field */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    WhatsApp Number
                  </span>
                  <span className="text-[10px] font-normal text-slate-500 lowercase">(or Telegram)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4 text-emerald-600" />
                  </div>
                  <input
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => {
                      setWhatsapp(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="+1 234 567 8900 or 0300 1234567"
                    autoFocus
                    className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border font-medium transition-all ${
                      whatsapp.trim() 
                        ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 text-emerald-950" 
                        : "border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-600 bg-slate-50/50 hover:bg-white"
                    }`}
                    id="register-whatsapp-input"
                  />
                </div>
              </div>

              {/* Telegram Field */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-sky-600" />
                    Telegram Username / ID
                  </span>
                  <span className="text-[10px] font-normal text-slate-500 lowercase">(or WhatsApp)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Send className="w-4 h-4 text-sky-600" />
                  </div>
                  <input
                    type="text"
                    value={telegram}
                    onChange={(e) => {
                      setTelegram(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="@telegram_handle or username"
                    className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border font-medium transition-all ${
                      telegram.trim() 
                        ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 text-emerald-950" 
                        : "border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-600 bg-slate-50/50 hover:bg-white"
                    }`}
                    id="register-telegram-input"
                  />
                </div>
              </div>

              {/* Requirement Check Indicator */}
              <div className="pt-1 min-h-[22px]">
                {whatsapp.trim() || telegram.trim() ? (
                  <p className="text-xs text-emerald-600 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Contact details verified! Ready to create account.</span>
                  </p>
                ) : (
                  <p className="text-xs text-amber-700 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Please enter either WhatsApp or Telegram to proceed.</span>
                  </p>
                )}
              </div>

              {/* Step 3 Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setRegisterStep(2);
                    setErrorMsg(null);
                  }}
                  className="w-1/3 py-2.5 px-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  id="register-step-3-back-btn"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || (!whatsapp.trim() && !telegram.trim())}
                  className="w-2/3 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  id="register-create-account-btn"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Create Account</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Bottom Switch Helper */}
          <div className="text-center pt-4 border-t border-slate-100 mt-5">
            <p className="text-xs text-slate-600">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setAuthMode("login");
                  setErrorMsg(null);
                }}
                className="font-bold text-purple-700 hover:underline cursor-pointer ml-1"
                id="switch-to-login-link"
              >
                Sign in here
              </button>
            </p>
          </div>
        </div>
      ) : (
        /* TWO-BOX LOGIN FORM: Box 1 (Email or Username) + Box 2 (Password) */
        <form
          onSubmit={handleLoginSubmit}
          className="space-y-4"
          id="two-box-login-form"
        >
          {/* Error Message Box */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* BOX 1: Email or Username */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Email or Username <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4 text-slate-400" />
              </div>
              <input
                type="text"
                value={loginIdentifier}
                onChange={(e) => {
                  setLoginIdentifier(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="Enter your email or username..."
                autoFocus
                required
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent font-medium bg-slate-50/50 hover:bg-white transition-colors"
                id="login-identifier-input"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              You can enter either your registered email (e.g. name@mail.com) or username (e.g. @john).
            </p>
          </div>

          {/* BOX 2: Password */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4 text-slate-400" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={loginPassword}
                onChange={(e) => {
                  setLoginPassword(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="Enter your password..."
                required
                className="w-full pl-10 pr-11 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent font-medium bg-slate-50/50 hover:bg-white transition-colors"
                id="login-password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                id="login-toggle-password-visibility"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 active:scale-[0.99] text-white text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            id="login-submit-btn"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </>
            )}
          </button>

          {/* Bottom Switch Helper */}
          <div className="text-center pt-4 border-t border-slate-100 mt-5">
            <p className="text-xs text-slate-600">
              Don't have an account yet?{" "}
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setAuthMode("register");
                  setRegisterStep(1);
                  setErrorMsg(null);
                }}
                className="font-bold text-purple-700 hover:underline cursor-pointer ml-1"
                id="switch-to-register-link"
              >
                Register here
              </button>
            </p>
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
          className="w-full max-w-lg flex items-center justify-center"
        >
          {contentCard}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
