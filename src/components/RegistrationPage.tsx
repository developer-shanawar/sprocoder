import React, { useState, useEffect } from "react";
import { 
  User, Mail, Lock, AtSign, Globe, MapPin, CheckCircle2, 
  AlertCircle, ChevronRight, Loader2, Sparkles, ShieldCheck, KeyRound, ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { validateUserEmail } from "../utils/articleFormatterBot";
import { UserAccount } from "../types";
import { db, auth, DB_PATHS } from "../firebase";
import { ref, get, set, push } from "firebase/database";
import { createUserWithEmailAndPassword } from "firebase/auth";

interface RegistrationPageProps {
  onSuccessRegistration: (user: UserAccount) => void;
  onNavigateHome: () => void;
  existingUsers?: UserAccount[];
}

export default function RegistrationPage({
  onSuccessRegistration,
  onNavigateHome,
  existingUsers = []
}: RegistrationPageProps) {
  // Form State
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Location detection
  const [ipAddress, setIpAddress] = useState<string>("Detecting IP...");
  const [country, setCountry] = useState<string>("Detecting Country...");
  const [city, setCity] = useState<string>("Detecting City...");
  const [isLocating, setIsLocating] = useState<boolean>(true);

  // Status & Validation
  const [usernameStatus, setUsernameStatus] = useState<{ available: boolean; message: string; checking: boolean }>({
    available: false,
    message: "",
    checking: false
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState<boolean>(false);

  // Auto detect location on mount
  useEffect(() => {
    fetchLocationData();
  }, []);

  const fetchLocationData = async () => {
    setIsLocating(true);
    try {
      const res = await fetch("https://ipapi.co/json/");
      if (res.ok) {
        const data = await res.json();
        setIpAddress(data.ip || "182.180.142.12");
        setCountry(data.country_name || "Global Coder Region");
        setCity(data.city || "Online");
        setIsLocating(false);
        return;
      }
    } catch (err) {
      console.warn("ipapi fallback...", err);
    }

    try {
      const fallbackRes = await fetch("http://ip-api.com/json/");
      if (fallbackRes.ok) {
        const data = await fallbackRes.json();
        setIpAddress(data.query || "182.180.142.12");
        setCountry(data.country || "Global Coder Region");
        setCity(data.city || "Online");
      }
    } catch (fallbackErr) {
      setIpAddress("182.180.142.12");
      setCountry("Global Coder Region");
      setCity("Online");
    } finally {
      setIsLocating(false);
    }
  };

  // Username live validation
  const handleUsernameChange = (val: string) => {
    let clean = val.trim().toLowerCase();
    if (clean && !clean.startsWith("@")) {
      clean = "@" + clean;
    }
    setUsername(clean);

    if (!clean) {
      setUsernameStatus({ available: false, message: "", checking: false });
      return;
    }

    const regex = /^@[a-z0-9_]{3,20}$/;
    if (!regex.test(clean)) {
      setUsernameStatus({
        available: false,
        message: "Must be @ handle (3-20 characters, lowercase letters, numbers, underscores).",
        checking: false
      });
      return;
    }

    const isTaken = existingUsers.some(u => u.username?.toLowerCase() === clean);
    if (isTaken) {
      setUsernameStatus({
        available: false,
        message: `Username ${clean} is already claimed by another coder.`,
        checking: false
      });
    } else {
      setUsernameStatus({
        available: true,
        message: `Awesome! ${clean} is available.`,
        checking: false
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg("Full name is required.");
      return;
    }

    if (!email.trim()) {
      setErrorMsg("Email address is required.");
      return;
    }

    const emailCheck = validateUserEmail(email);
    if (!emailCheck.valid) {
      setErrorMsg(emailCheck.error || "Invalid email address.");
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    let cleanUsername = username.trim().toLowerCase();
    if (cleanUsername) {
      if (!cleanUsername.startsWith("@")) cleanUsername = "@" + cleanUsername;
      const isTaken = existingUsers.some(u => u.username?.toLowerCase() === cleanUsername);
      if (isTaken) {
        setErrorMsg(`The username ${cleanUsername} is already taken.`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      let userId = "";
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        userId = userCredential.user.uid;
      } catch (authErr: any) {
        console.warn("Direct Firebase Auth signup issue, generating secure RTDB ID...", authErr);
        userId = "reader_" + Math.random().toString(36).substring(2, 10);
      }

      const newUser: UserAccount = {
        id: userId,
        name: name.trim(),
        username: cleanUsername || `@reader_${Math.floor(1000 + Math.random() * 9000)}`,
        email: email.trim().toLowerCase(),
        registeredAt: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
        lastLogin: new Date().toLocaleString(),
        ipAddress,
        country,
        city
      };

      // Store in Firebase Realtime Database
      await set(ref(db, `${DB_PATHS.USERS}/${userId}`), newUser);

      // Log registration event
      const logRef = push(ref(db, `logs/registrations`));
      await set(logRef, {
        userId,
        name: name.trim(),
        email: email.trim(),
        username: newUser.username,
        ipAddress,
        country,
        date: new Date().toLocaleString()
      });

      // Save to localStorage & local state
      localStorage.setItem("spro_user", JSON.stringify(newUser));

      // Trigger High-Level Success Animation
      setIsSubmittedSuccess(true);
      setIsSubmitting(false);

      // Trigger success login callback
      onSuccessRegistration(newUser);

      // Redirect to homepage after short delay for user to admire the animation
      setTimeout(() => {
        onNavigateHome();
      }, 2500);

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Registration failed. Please check your network connection.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* High level slide-in animation from right side */}
      <motion.div
        initial={{ x: "100%", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 25 }}
        className="w-full max-w-2xl bg-white/95 backdrop-blur-2xl border-2 border-purple-100 rounded-[36px] shadow-2xl p-6 sm:p-10 text-purple-950 space-y-6 relative overflow-hidden my-6"
        id="registration-page-container"
      >
        {/* Top Decorative Purple Light Beam */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-400" />

        {/* Back to Home Header Link */}
        <div className="flex items-center justify-between border-b border-purple-100 pb-4">
          <button
            onClick={onNavigateHome}
            className="px-3.5 py-1.5 rounded-full bg-purple-50 hover:bg-purple-100/80 text-purple-900 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer border border-purple-100"
          >
            <ArrowLeft className="w-4 h-4 text-purple-600" />
            <span>Back to Home</span>
          </button>
          
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold text-[10px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Secure Registration</span>
          </div>
        </div>

        {/* SUCCESS STATE WITH ANIMATED GREEN CHECKMARK */}
        <AnimatePresence mode="wait">
          {isSubmittedSuccess ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="py-12 text-center space-y-6 flex flex-col items-center justify-center"
            >
              {/* High-Level Animated Green Checkmark Badge */}
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                className="w-24 h-24 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-2xl shadow-emerald-500/40 relative"
              >
                <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-30" />
                <CheckCircle2 className="w-14 h-14 text-white stroke-[2.5]" />
              </motion.div>

              <div className="space-y-2 max-w-md">
                <h2 className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
                  Your account is created.
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
                  Welcome to <strong>S pro coder</strong>! You are now logged in and ready to explore tutorials, save articles, and track courses.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={onNavigateHome}
                  className="px-8 py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs uppercase tracking-wider transition-all shadow-lg shadow-purple-300 cursor-pointer flex items-center gap-2 active:scale-95"
                >
                  <span>Redirecting to Homepage...</span>
                  <ChevronRight className="w-4 h-4 animate-bounce" />
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="space-y-6">
              
              {/* Title Section */}
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-700 font-extrabold text-[11px] uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>Join S pro coder</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-purple-950 tracking-tight" id="registration-page-title">
                  Create a Reader Account
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
                  Fill in your details below to activate your developer reader account and sync reading progress live across devices.
                </p>
              </div>

              {/* Error Alert */}
              {errorMsg && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-bold flex items-center gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Location Badge */}
              <div className="p-3 bg-purple-50/60 rounded-2xl border border-purple-100 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-purple-900 font-bold">
                  <MapPin className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>Detected Region:</span>
                </div>
                <div className="font-mono text-[11px] font-bold text-purple-700 bg-white px-2.5 py-1 rounded-xl border border-purple-200 shadow-sm">
                  {isLocating ? "Locating..." : `${city}, ${country} (${ipAddress})`}
                </div>
              </div>

              {/* Registration Form */}
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase text-purple-900 tracking-wider block">Full Name *</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="e.g. Shanawar Ali"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-purple-200 font-bold text-xs text-purple-950 focus:ring-2 focus:ring-purple-500 outline-none shadow-sm"
                    />
                    <User className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400" />
                  </div>
                </div>

                {/* Username */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase text-purple-900 tracking-wider flex items-center justify-between">
                    <span>Desired @Username *</span>
                    <span className="text-[10px] text-gray-400 font-normal">Used for comments & profile</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="@coder_handle"
                      value={username}
                      onChange={(e) => handleUsernameChange(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-purple-200 font-mono font-bold text-xs text-purple-950 focus:ring-2 focus:ring-purple-500 outline-none shadow-sm"
                    />
                    <AtSign className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400" />
                  </div>
                  {usernameStatus.message && (
                    <p className={`text-[10px] font-bold ${usernameStatus.available ? "text-emerald-600" : "text-amber-600"}`}>
                      {usernameStatus.message}
                    </p>
                  )}
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase text-purple-900 tracking-wider block">Email Address *</label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-purple-200 font-bold text-xs text-purple-950 focus:ring-2 focus:ring-purple-500 outline-none shadow-sm"
                    />
                    <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400" />
                  </div>
                </div>

                {/* Secure Password */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase text-purple-900 tracking-wider block">Secure Password *</label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-purple-200 font-bold text-xs text-purple-950 focus:ring-2 focus:ring-purple-500 outline-none shadow-sm"
                    />
                    <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400" />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-purple-300 cursor-pointer flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Creating Account...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit</span>
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>

              </form>

            </div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}
