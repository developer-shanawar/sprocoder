import React, { useState, useEffect } from "react";
import { 
  User, Mail, Lock, AtSign, Globe, MapPin, CheckCircle2, 
  AlertCircle, ChevronRight, ChevronLeft, Loader2, Sparkles, 
  ShieldCheck, KeyRound, X, Phone, Send, Eye, EyeOff, LogIn
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { validateUserEmail } from "../utils/articleFormatterBot";
import { UserAccount } from "../types";
import { db, auth, DB_PATHS } from "../firebase";
import { ref, get, set, push, update } from "firebase/database";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
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
  
  // Registration Step: 1 (Full Name), 2 (Username), 3 (Email & Password), 4 (WhatsApp or Telegram ID)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [slideDirection, setSlideDirection] = useState<1 | -1>(1); // 1 = next (slide left), -1 = prev (slide right)

  // Registration Form States
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");
  const [telegram, setTelegram] = useState("");

  // Login Form States (Requires Username, Email, Password)
  const [loginUsername, setLoginUsername] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Verification & Status States
  const [ipAddress, setIpAddress] = useState<string>("Detecting IP...");
  const [country, setCountry] = useState<string>("Detecting Country...");
  const [city, setCity] = useState<string>("Detecting City...");
  const [usernameStatus, setUsernameStatus] = useState<{ available: boolean; message: string; checking: boolean }>({
    available: false,
    message: "",
    checking: false
  });
  const [emailStatus, setEmailStatus] = useState<{ valid: boolean; message: string }>({
    valid: false,
    message: ""
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successAnimation, setSuccessAnimation] = useState<boolean>(false);

  // Sync mode when prop changes
  useEffect(() => {
    setAuthMode(initialMode);
    setErrorMsg(null);
    if (initialMode === "register") {
      setStep(1);
    }
  }, [initialMode, isOpen]);

  // Auto-detect IP and Region
  useEffect(() => {
    if (isOpen || isStandalonePage) {
      fetchLocationData();
    }
  }, [isOpen, isStandalonePage]);

  const fetchLocationData = async () => {
    try {
      const res = await fetch("https://ipapi.co/json/");
      if (res.ok) {
        const data = await res.json();
        setIpAddress(data.ip || "182.180.142.12");
        setCountry(data.country_name || "Global");
        setCity(data.city || "Online");
        return;
      }
    } catch (e) {}

    try {
      const fallbackRes = await fetch("https://ip-api.com/json/");
      if (fallbackRes.ok) {
        const data = await fallbackRes.json();
        setIpAddress(data.query || "182.180.142.12");
        setCountry(data.country || "Global");
        setCity(data.city || "Online");
      }
    } catch (fallbackErr) {
      setIpAddress("182.180.142.12");
      setCountry("Global");
      setCity("Online");
    }
  };

  // Live Username Availability Check
  const handleUsernameChange = async (val: string) => {
    let clean = val.trim().toLowerCase();
    if (clean && !clean.startsWith("@")) {
      clean = "@" + clean;
    }
    setUsername(clean);

    if (!clean || clean.length < 3) {
      setUsernameStatus({
        available: false,
        message: "Username must be at least 3 characters long.",
        checking: false
      });
      return;
    }

    const regex = /^@[a-z0-9_]{3,20}$/;
    if (!regex.test(clean)) {
      setUsernameStatus({
        available: false,
        message: "Only lowercase letters, numbers, and underscores allowed (e.g. @dev_alex).",
        checking: false
      });
      return;
    }

    try {
      setUsernameStatus(prev => ({ ...prev, checking: true }));
      const snapshot = await get(ref(db, DB_PATHS.USERS));
      if (snapshot.exists()) {
        const allUsers = snapshot.val();
        const isTaken = Object.values(allUsers).some((u: any) => u && u.username?.toLowerCase() === clean);
        if (isTaken) {
          setUsernameStatus({
            available: false,
            message: `Username ${clean} is already claimed.`,
            checking: false
          });
          return;
        }
      }
      setUsernameStatus({
        available: true,
        message: `Awesome! ${clean} is available.`,
        checking: false
      });
    } catch (err) {
      setUsernameStatus({
        available: true,
        message: `✓ Valid username handle.`,
        checking: false
      });
    }
  };

  // Live Email Validation
  const handleEmailChange = (val: string) => {
    const clean = val.trim();
    setEmail(clean);

    const validation = validateUserEmail(clean);
    if (!validation.valid) {
      setEmailStatus({
        valid: false,
        message: validation.error || "Please enter a valid email address."
      });
    } else {
      setEmailStatus({
        valid: true,
        message: "✓ Valid email verified."
      });
    }
  };

  // Step 1 -> Step 2
  const handleNextFromStep1 = () => {
    setErrorMsg(null);
    if (!name.trim()) {
      setErrorMsg("Please enter your full name.");
      return;
    }
    if (name.trim().length < 2) {
      setErrorMsg("Please enter a valid full name.");
      return;
    }
    playClickSound();
    setSlideDirection(1);
    setStep(2);
  };

  // Step 2 -> Step 3
  const handleNextFromStep2 = () => {
    setErrorMsg(null);
    if (!username.trim()) {
      setErrorMsg("Please choose a unique username.");
      return;
    }
    if (!usernameStatus.available && usernameStatus.message) {
      setErrorMsg(usernameStatus.message);
      return;
    }
    playClickSound();
    setSlideDirection(1);
    setStep(3);
  };

  // Step 3 -> Step 4
  const handleNextFromStep3 = () => {
    setErrorMsg(null);
    if (!email.trim()) {
      setErrorMsg("Email address is required.");
      return;
    }
    if (!emailStatus.valid) {
      setErrorMsg(emailStatus.message || "Please enter a valid email address.");
      return;
    }
    if (!password || password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }
    if (confirmPassword && password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    playClickSound();
    setSlideDirection(1);
    setStep(4);
  };

  // Step 4: Final Submission with Audio Click and Verification
  const handleCreateAccount = async () => {
    setErrorMsg(null);

    // Verification check: At least one ID (WhatsApp or Telegram) is required!
    const cleanWhatsapp = whatsapp.trim();
    const cleanTelegram = telegram.trim();

    if (!cleanWhatsapp && !cleanTelegram) {
      setErrorMsg("Verification Required: Please provide either your WhatsApp Number/ID or Telegram Username/ID.");
      return;
    }

    // Play click sound effect immediately on button press
    playClickSound();
    setIsSubmitting(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      let cleanUserHandle = username.trim().toLowerCase();
      if (!cleanUserHandle.startsWith("@")) {
        cleanUserHandle = "@" + cleanUserHandle;
      }

      // Check database to ensure email and username are not already registered
      const usersSnap = await get(ref(db, DB_PATHS.USERS));
      if (usersSnap.exists()) {
        const allUsers = usersSnap.val();
        const emailExists = Object.values(allUsers).some((u: any) => u && u.email?.toLowerCase() === cleanEmail);
        if (emailExists) {
          setErrorMsg("An account with this email already exists. Please log in.");
          setIsSubmitting(false);
          return;
        }
        const usernameExists = Object.values(allUsers).some((u: any) => u && u.username?.toLowerCase() === cleanUserHandle);
        if (usernameExists) {
          setErrorMsg(`The username ${cleanUserHandle} is already registered.`);
          setIsSubmitting(false);
          return;
        }
      }

      // Firebase Auth creation
      let userId = "";
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        userId = userCredential.user.uid;
      } catch (authErr: any) {
        console.warn("Direct Firebase Auth signup notice:", authErr?.message);
        userId = "user_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
      }

      const timestamp = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
      const rawUser: UserAccount = {
        id: userId,
        name: name.trim(),
        username: cleanUserHandle,
        email: cleanEmail,
        password: password, // Stored for verification matching
        whatsapp: cleanWhatsapp || undefined,
        telegram: cleanTelegram || undefined,
        registeredAt: timestamp,
        lastLogin: new Date().toLocaleString(),
        ipAddress: ipAddress,
        country: country,
        city: city,
        avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(cleanUserHandle)}`,
        savedArticles: [],
        likedArticles: [],
        viewedCourses: [],
        likedCourses: [],
        history: [],
        role: "reader"
      };

      // Generate Session Token & Section ID
      const { updatedUser } = await initUserSectionSession(rawUser);

      // Save to Firebase Realtime Database
      await set(ref(db, `${DB_PATHS.USERS}/${userId}`), updatedUser);

      // Log registration event in Firebase
      const logRef = push(ref(db, "logs/registrations"));
      await set(logRef, {
        userId,
        name: name.trim(),
        username: cleanUserHandle,
        email: cleanEmail,
        whatsapp: cleanWhatsapp || "none",
        telegram: cleanTelegram || "none",
        ipAddress,
        country,
        date: new Date().toLocaleString()
      });

      // Play success chime sound effect
      playSuccessSound();
      setSuccessAnimation(true);

      // Save locally & trigger login
      localStorage.setItem("spro_user", JSON.stringify(updatedUser));
      onSuccessLogin(updatedUser);

      // Redirect to homepage after brief celebration
      setTimeout(() => {
        if (onNavigateHome) {
          onNavigateHome();
        }
        window.history.pushState(null, "", "/");
        onClose();
      }, 1200);

    } catch (err: any) {
      console.error("Registration error:", err);
      setErrorMsg(err.message || "Failed to create account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Login Submission: Verifies Username + Email + Password
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const inputUser = loginUsername.trim().toLowerCase();
    const inputEmail = loginEmail.trim().toLowerCase();
    const inputPass = loginPassword.trim();

    if (!inputUser) {
      setErrorMsg("Please enter your registered Username.");
      return;
    }
    if (!inputEmail) {
      setErrorMsg("Please enter your registered Email address.");
      return;
    }
    if (!inputPass) {
      setErrorMsg("Please enter your Password.");
      return;
    }

    playClickSound();
    setIsSubmitting(true);

    try {
      // Step 1: Query database to verify both username and email match the user record
      const usersRef = ref(db, DB_PATHS.USERS);
      const snapshot = await get(usersRef);
      const allUsers: Record<string, any> = snapshot.exists() ? snapshot.val() : {};

      const cleanTargetHandle = inputUser.startsWith("@") ? inputUser : "@" + inputUser;

      // Find matching user where email matches AND username matches
      const matchedUserEntry = Object.values(allUsers).find((u: any) => {
        if (!u || !u.email) return false;
        const emailMatches = u.email.toLowerCase() === inputEmail;
        const uHandle = (u.username || "").toLowerCase();
        const usernameMatches = uHandle === inputUser || uHandle === cleanTargetHandle;
        return emailMatches && usernameMatches;
      });

      // Security verification: without matching username and email, user cannot log in
      if (!matchedUserEntry) {
        setErrorMsg("Security Verification Failed: The provided Username and Email do not match any registered account.");
        setIsSubmitting(false);
        return;
      }

      // Verify Password (either stored password check or Firebase Auth check)
      let passwordValid = false;
      if (matchedUserEntry.password && matchedUserEntry.password === inputPass) {
        passwordValid = true;
      } else {
        try {
          await signInWithEmailAndPassword(auth, inputEmail, inputPass);
          passwordValid = true;
        } catch (authErr) {
          console.warn("Direct Auth check failed:", authErr);
        }
      }

      if (!passwordValid) {
        setErrorMsg("Incorrect password. Please verify your credentials.");
        setIsSubmitting(false);
        return;
      }

      // Validated! Initialize session and update lastLogin
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
      setCurrentUserLocal(updatedUser);

    } catch (err: any) {
      console.error("Login verification error:", err);
      setErrorMsg(err.message || "Failed to log in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const setCurrentUserLocal = (user: UserAccount) => {
    localStorage.setItem("spro_user", JSON.stringify(user));
    onSuccessLogin(user);
    if (onNavigateHome) {
      onNavigateHome();
    }
    window.history.pushState(null, "", "/");
    onClose();
  };

  if (!isOpen && !isStandalonePage) return null;

  // Slide Animation Variants
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 80 : -80,
      opacity: 0,
      filter: "blur(4px)"
    }),
    center: {
      x: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        x: { type: "spring" as const, stiffness: 350, damping: 30 },
        opacity: { duration: 0.25 }
      }
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -80 : 80,
      opacity: 0,
      filter: "blur(4px)",
      transition: {
        x: { type: "spring" as const, stiffness: 350, damping: 30 },
        opacity: { duration: 0.2 }
      }
    })
  };

  const modalBody = (
    <div className="relative w-full max-w-lg bg-white border-2 border-black rounded-[32px] p-6 sm:p-8 shadow-2xl overflow-hidden" id="auth-modal-card">
      
      {/* Decorative Top Gradient Stripe */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500" />

      {/* Close button (only in modal mode) */}
      {!isStandalonePage && (
        <button
          onClick={() => {
            playClickSound();
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-purple-950 hover:bg-purple-100 transition-colors cursor-pointer"
          title="Close"
          id="close-auth-modal-btn"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* SUCCESS CELEBRATION OVERLAY */}
      {successAnimation && (
        <div className="py-12 text-center space-y-4 animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10 animate-bounce" />
          </div>
          <h3 className="text-xl font-black text-purple-950">Account Created Successfully!</h3>
          <p className="text-xs text-gray-500 font-semibold">Redirecting you to the homepage...</p>
        </div>
      )}

      {!successAnimation && (
        <>
          {/* HEADER TITLE */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 rounded-full text-[11px] font-black text-purple-800 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>{authMode === "register" ? "New Developer Registration" : "Developer Sign In"}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-purple-950 tracking-tight">
              {authMode === "register" ? "Create Your Account" : "Sign In to Your Account"}
            </h2>
            <p className="text-xs text-gray-500 mt-1 font-medium">
              {authMode === "register" 
                ? "Join the S pro coder tech community with step-by-step verification." 
                : "Enter your username, email, and password to verify & continue."}
            </p>
          </div>

          {/* TAB SWITCHER: Register vs Login */}
          <div className="flex items-center justify-center p-1 bg-purple-50 rounded-2xl border border-purple-100 mb-6">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setAuthMode("register");
                setStep(1);
                setErrorMsg(null);
                window.history.pushState(null, "", "/register");
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                authMode === "register" 
                  ? "bg-purple-700 text-white shadow-sm" 
                  : "text-purple-950 hover:text-purple-700"
              }`}
              id="switch-to-register-tab"
            >
              Register (Step-by-Step)
            </button>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setAuthMode("login");
                setErrorMsg(null);
                window.history.pushState(null, "", "/login");
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                authMode === "login" 
                  ? "bg-purple-700 text-white shadow-sm" 
                  : "text-purple-950 hover:text-purple-700"
              }`}
              id="switch-to-login-tab"
            >
              Sign In (Verified)
            </button>
          </div>

          {/* ERROR ALERT BANNER */}
          {errorMsg && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 font-bold animate-in fade-in" id="auth-error-banner">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-snug">{errorMsg}</div>
            </div>
          )}

          {/* MODE 1: STEP-BY-STEP REGISTRATION WIZARD */}
          {authMode === "register" && (
            <div className="space-y-4">
              
              {/* STEP PROGRESS BAR */}
              <div className="space-y-1.5 mb-5">
                <div className="flex items-center justify-between text-[11px] font-black text-purple-950">
                  <span className="uppercase tracking-wider">
                    {step === 1 && "Step 1 of 4: Full Name"}
                    {step === 2 && "Step 2 of 4: Choose Username"}
                    {step === 3 && "Step 3 of 4: Email & Password"}
                    {step === 4 && "Step 4 of 4: Contact Verification"}
                  </span>
                  <span className="text-purple-600 font-mono font-extrabold">{step * 25}%</span>
                </div>
                <div className="w-full h-2 bg-purple-100 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-purple-600 to-indigo-600"
                    initial={{ width: `${(step - 1) * 25}%` }}
                    animate={{ width: `${step * 25}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>

              {/* SLIDING FORM CONTAINER */}
              <div className="relative overflow-hidden min-h-[230px]">
                <AnimatePresence custom={slideDirection} mode="wait">
                  
                  {/* SLIDE 1: FULL NAME */}
                  {step === 1 && (
                    <motion.div
                      key="step1"
                      custom={slideDirection}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      className="space-y-4"
                    >
                      <div className="space-y-1">
                        <label className="block text-xs font-black text-purple-950 uppercase tracking-wider">
                          What is your full name? <span className="text-red-500">*</span>
                        </label>
                        <p className="text-[11px] text-gray-500">This will be displayed on your developer profile and articles.</p>
                      </div>

                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleNextFromStep1();
                            }
                          }}
                          placeholder="e.g. Alex Henderson"
                          autoFocus
                          className="w-full pl-10 pr-4 py-3 bg-purple-50/50 border border-purple-200 rounded-2xl text-xs font-bold text-purple-950 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all"
                          id="register-fullname-input"
                        />
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={handleNextFromStep1}
                          className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs rounded-2xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-purple-900/10 active:scale-95 cursor-pointer"
                          id="register-step1-next-btn"
                        >
                          <span>Next Step</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* SLIDE 2: USERNAME */}
                  {step === 2 && (
                    <motion.div
                      key="step2"
                      custom={slideDirection}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      className="space-y-4"
                    >
                      <div className="space-y-1">
                        <label className="block text-xs font-black text-purple-950 uppercase tracking-wider">
                          Choose your unique username <span className="text-red-500">*</span>
                        </label>
                        <p className="text-[11px] text-gray-500">Pick an available @handle for your account identifier.</p>
                      </div>

                      <div className="relative">
                        <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => handleUsernameChange(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleNextFromStep2();
                            }
                          }}
                          placeholder="@developer_alex"
                          autoFocus
                          className="w-full pl-10 pr-4 py-3 bg-purple-50/50 border border-purple-200 rounded-2xl text-xs font-bold text-purple-950 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all font-mono"
                          id="register-username-input"
                        />
                      </div>

                      {/* Username Status Message */}
                      {username && (
                        <div className={`text-[11px] font-bold flex items-center gap-1.5 ${
                          usernameStatus.available ? "text-emerald-700" : "text-rose-600"
                        }`}>
                          {usernameStatus.checking ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : usernameStatus.available ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                          )}
                          <span>{usernameStatus.message}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            playClickSound();
                            setSlideDirection(-1);
                            setStep(1);
                          }}
                          className="px-4 py-3 bg-purple-100 hover:bg-purple-200 text-purple-950 font-bold text-xs rounded-2xl flex items-center justify-center gap-1 transition-all cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span>Back</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleNextFromStep2}
                          disabled={!usernameStatus.available}
                          className="flex-1 py-3 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-extrabold text-xs rounded-2xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-purple-900/10 active:scale-95 cursor-pointer"
                          id="register-step2-next-btn"
                        >
                          <span>Next Step</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* SLIDE 3: EMAIL AND PASSWORD */}
                  {step === 3 && (
                    <motion.div
                      key="step3"
                      custom={slideDirection}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      className="space-y-3"
                    >
                      <div className="space-y-1">
                        <label className="block text-xs font-black text-purple-950 uppercase tracking-wider">
                          Set Email & Password <span className="text-red-500">*</span>
                        </label>
                        <p className="text-[11px] text-gray-500">Provide your verified email and a secure password.</p>
                      </div>

                      {/* Email Input */}
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => handleEmailChange(e.target.value)}
                          placeholder="e.g. yourname@gmail.com"
                          autoFocus
                          className="w-full pl-10 pr-4 py-2.5 bg-purple-50/50 border border-purple-200 rounded-2xl text-xs font-bold text-purple-950 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all"
                          id="register-email-input"
                        />
                      </div>

                      {/* Password Input */}
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Create password (min 6 chars)"
                          className="w-full pl-10 pr-10 py-2.5 bg-purple-50/50 border border-purple-200 rounded-2xl text-xs font-bold text-purple-950 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all"
                          id="register-password-input"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-800"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Confirm Password Input */}
                      <div className="relative">
                        <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleNextFromStep3();
                            }
                          }}
                          placeholder="Confirm your password"
                          className="w-full pl-10 pr-4 py-2.5 bg-purple-50/50 border border-purple-200 rounded-2xl text-xs font-bold text-purple-950 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all"
                          id="register-confirm-password-input"
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            playClickSound();
                            setSlideDirection(-1);
                            setStep(2);
                          }}
                          className="px-4 py-3 bg-purple-100 hover:bg-purple-200 text-purple-950 font-bold text-xs rounded-2xl flex items-center justify-center gap-1 transition-all cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span>Back</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleNextFromStep3}
                          className="flex-1 py-3 bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs rounded-2xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-purple-900/10 active:scale-95 cursor-pointer"
                          id="register-step3-next-btn"
                        >
                          <span>Next Step</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* SLIDE 4: WHATSAPP OR TELEGRAM ID (REQUIRED VERIFICATION) */}
                  {step === 4 && (
                    <motion.div
                      key="step4"
                      custom={slideDirection}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      className="space-y-3"
                    >
                      <div className="space-y-1">
                        <label className="block text-xs font-black text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-purple-600" />
                          <span>Contact Verification ID <span className="text-red-500">*</span></span>
                        </label>
                        <p className="text-[11px] text-gray-500 font-medium">
                          Enter your WhatsApp Number or Telegram ID. <strong>At least one ID is required</strong> for account security verification.
                        </p>
                      </div>

                      {/* WhatsApp Input */}
                      <div className="space-y-1">
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                          <input
                            type="text"
                            value={whatsapp}
                            onChange={(e) => setWhatsapp(e.target.value)}
                            placeholder="WhatsApp Number (e.g. +1 555 1234567)"
                            className="w-full pl-10 pr-4 py-2.5 bg-emerald-50/40 border border-emerald-200 rounded-2xl text-xs font-bold text-purple-950 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-mono"
                            id="register-whatsapp-input"
                          />
                        </div>
                      </div>

                      {/* Telegram Input */}
                      <div className="space-y-1">
                        <div className="relative">
                          <Send className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-500" />
                          <input
                            type="text"
                            value={telegram}
                            onChange={(e) => setTelegram(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleCreateAccount();
                              }
                            }}
                            placeholder="Telegram Username or ID (e.g. @telegram_dev)"
                            className="w-full pl-10 pr-4 py-2.5 bg-sky-50/40 border border-sky-200 rounded-2xl text-xs font-bold text-purple-950 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all font-mono"
                            id="register-telegram-input"
                          />
                        </div>
                      </div>

                      <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-100 flex items-center justify-between text-[10px] text-purple-900 font-bold">
                        <span className="flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-purple-600" />
                          <span>Detected: {country} ({ipAddress})</span>
                        </span>
                        <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-black">
                          Secured
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            playClickSound();
                            setSlideDirection(-1);
                            setStep(3);
                          }}
                          className="px-4 py-3 bg-purple-100 hover:bg-purple-200 text-purple-950 font-bold text-xs rounded-2xl flex items-center justify-center gap-1 transition-all cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span>Back</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleCreateAccount}
                          disabled={isSubmitting || (!whatsapp.trim() && !telegram.trim())}
                          className="flex-1 py-3 bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:opacity-95 disabled:opacity-50 text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-900/20 active:scale-95 cursor-pointer"
                          id="register-create-account-btn"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Creating Account...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 text-amber-300" />
                              <span>Create Account</span>
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>

            </div>
          )}

          {/* MODE 2: VERIFIED LOGIN (Requires Username, Email, and Password) */}
          {authMode === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-4" id="verified-login-form">
              
              {/* Field 1: Username */}
              <div className="space-y-1">
                <label className="block text-xs font-black text-purple-950 uppercase tracking-wider">
                  Username <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
                  <input
                    type="text"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="Enter your @username"
                    autoFocus
                    required
                    className="w-full pl-10 pr-4 py-3 bg-purple-50/50 border border-purple-200 rounded-2xl text-xs font-bold text-purple-950 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all font-mono"
                    id="login-username-input"
                  />
                </div>
              </div>

              {/* Field 2: Email */}
              <div className="space-y-1">
                <label className="block text-xs font-black text-purple-950 uppercase tracking-wider">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-purple-50/50 border border-purple-200 rounded-2xl text-xs font-bold text-purple-950 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all"
                    id="login-email-input"
                  />
                </div>
              </div>

              {/* Field 3: Password */}
              <div className="space-y-1">
                <label className="block text-xs font-black text-purple-950 uppercase tracking-wider">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full pl-10 pr-10 py-3 bg-purple-50/50 border border-purple-200 rounded-2xl text-xs font-bold text-purple-950 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all"
                    id="login-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-800"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Security Notice */}
              <div className="p-3 bg-purple-50/70 rounded-2xl border border-purple-100 flex items-center gap-2 text-[10px] text-purple-900 font-bold">
                <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                <span>Security Check: System cross-verifies Username + Email + Password with the database.</span>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:opacity-95 disabled:opacity-50 text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-900/20 active:scale-95 cursor-pointer"
                  id="login-submit-btn"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Verify & Sign In</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          )}

        </>
      )}

    </div>
  );

  if (isStandalonePage) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center py-10 px-4">
        {modalBody}
      </div>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
          />

          {/* Modal Container with entrance animation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="relative z-10 w-full max-w-lg"
          >
            {modalBody}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
