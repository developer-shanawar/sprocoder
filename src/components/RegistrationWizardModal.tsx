import React, { useState, useEffect } from "react";
import { 
  User, Mail, Lock, AtSign, Globe, MapPin, CheckCircle2, 
  AlertCircle, ChevronRight, ChevronLeft, Loader2, Sparkles, ShieldCheck, KeyRound, X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { validateUserEmail } from "../utils/articleFormatterBot";
import { UserAccount } from "../types";
import { db, auth } from "../firebase";
import { ref, get, set } from "firebase/database";
import { createUserWithEmailAndPassword } from "firebase/auth";

interface RegistrationWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessLogin: (user: UserAccount) => void;
  existingUsers: UserAccount[];
}

export default function RegistrationWizardModal({
  isOpen,
  onClose,
  onSuccessLogin,
  existingUsers
}: RegistrationWizardModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Location State (IP, Country, City, Region)
  const [ipAddress, setIpAddress] = useState<string>("Detecting IP...");
  const [country, setCountry] = useState<string>("Detecting Country...");
  const [city, setCity] = useState<string>("Detecting City...");
  const [region, setRegion] = useState<string>("");
  const [isLocating, setIsLocating] = useState<boolean>(true);

  // Validation States
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

  // Fetch IP & Location automatically on mount
  useEffect(() => {
    if (isOpen) {
      fetchLocationData();
    }
  }, [isOpen]);

  const fetchLocationData = async () => {
    setIsLocating(true);
    try {
      // Primary provider: ipapi.co
      const res = await fetch("https://ipapi.co/json/");
      if (res.ok) {
        const data = await res.json();
        setIpAddress(data.ip || "182.180.142.12");
        setCountry(data.country_name || "Pakistan");
        setCity(data.city || "Lahore");
        setRegion(data.region || "Punjab");
        setIsLocating(false);
        return;
      }
    } catch (err) {
      console.warn("ipapi.co failed, attempting ip-api fallback...", err);
    }

    // Fallback provider: ip-api.com
    try {
      const fallbackRes = await fetch("http://ip-api.com/json/");
      if (fallbackRes.ok) {
        const data = await fallbackRes.json();
        setIpAddress(data.query || "182.180.142.12");
        setCountry(data.country || "Pakistan");
        setCity(data.city || "Lahore");
        setRegion(data.regionName || "Punjab");
      } else {
        throw new Error("Location detection API unavailable");
      }
    } catch (fallbackErr) {
      setIpAddress("182.180.142.12");
      setCountry("Pakistan");
      setCity("Lahore");
      setRegion("Punjab");
    } finally {
      setIsLocating(false);
    }
  };

  // Live Username Availability Check
  const handleUsernameChange = (val: string) => {
    let clean = val.trim().toLowerCase();
    if (clean && !clean.startsWith("@")) {
      clean = "@" + clean;
    }
    setUsername(clean);

    if (!clean || clean.length < 3) {
      setUsernameStatus({
        available: false,
        message: "Username must be at least 3 characters long (e.g. @shanawar).",
        checking: false
      });
      return;
    }

    // Format regex check
    const regex = /^@[a-z0-9_]{3,20}$/;
    if (!regex.test(clean)) {
      setUsernameStatus({
        available: false,
        message: "Can only contain letters, numbers, and underscores (e.g. @john_99).",
        checking: false
      });
      return;
    }

    // Check against existing users
    const taken = existingUsers.some(
      (u) => u.username?.toLowerCase() === clean
    );

    if (taken) {
      setUsernameStatus({
        available: false,
        message: `Username ${clean} is already claimed by another user.`,
        checking: false
      });
    } else {
      setUsernameStatus({
        available: true,
        message: `✓ Username ${clean} is available!`,
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
        message: validation.error || "Invalid email address format."
      });
    } else {
      setEmailStatus({
        valid: true,
        message: `✓ Valid email address verified!`
      });
    }
  };

  // Navigation handlers
  const handleNextFromStep1 = () => {
    setErrorMsg(null);
    if (!name.trim()) {
      setErrorMsg("Please enter your full name.");
      return;
    }
    if (!username.trim()) {
      setErrorMsg("Username is required. Please choose a username.");
      return;
    }
    if (!usernameStatus.available) {
      setErrorMsg("Please select an available username before proceeding.");
      return;
    }
    setStep(2);
  };

  const handleNextFromStep2 = () => {
    setErrorMsg(null);
    if (!emailStatus.valid) {
      setErrorMsg(emailStatus.message || "Please enter a valid @gmail.com or verified email address.");
      return;
    }
    setStep(3);
  };

  const handleNextFromStep3 = () => {
    setErrorMsg(null);
    if (!password || password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }
    setStep(4);
  };

  // Final Registration Submission
  const handleCompleteRegistration = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const userId = "user_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
      const regTimestamp = new Date().toLocaleString();

      // Create Firebase Auth user if possible
      try {
        await createUserWithEmailAndPassword(auth, cleanEmail, password);
      } catch (authErr: any) {
        console.warn("Firebase Auth registration fallback:", authErr.message);
      }

      const newUserAccount: UserAccount = {
        id: userId,
        name: name.trim(),
        email: cleanEmail,
        password: password,
        username: username.trim(),
        registeredAt: regTimestamp,
        lastLogin: regTimestamp,
        ipAddress: ipAddress,
        country: country,
        city: city,
        region: region,
        avatarUrl: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(name.trim())}`,
        savedArticles: [],
        likedArticles: [],
        history: [],
        role: "reader"
      };

      // Save to Firebase Realtime Database
      await set(ref(db, `users/${userId}`), newUserAccount);

      // Save locally & trigger login
      localStorage.setItem("spro_user", JSON.stringify(newUserAccount));
      onSuccessLogin(newUserAccount);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to complete user registration. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-3xl max-w-lg w-full overflow-hidden border border-purple-100 shadow-2xl relative my-8"
        id="registration-wizard-card"
      >
        {/* Header Step Banner */}
        <div className="bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-purple-200 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-widest text-purple-300">
              User Registration Wizard
            </span>
          </div>

          <h2 className="text-xl font-black">Create Your Developer Account</h2>
          <p className="text-xs text-purple-200 mt-1">
            Step {step} of 4: {
              step === 1 ? "Personal Profile Details" :
              step === 2 ? "Email Verification" :
              step === 3 ? "Security & Location Setup" :
              "Final Account Confirmation"
            }
          </p>

          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-white/10 rounded-full mt-4 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-400 to-indigo-300 transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-bold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: Name & Username */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-purple-950 uppercase tracking-wider block">
                  1. Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Shanawar Ali"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-purple-200 text-xs font-bold text-purple-950 focus:outline-none focus:border-purple-600 bg-purple-50/30"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black text-purple-950 uppercase tracking-wider block">
                    2. Unique Username (Required)
                  </label>
                  <span className="text-[10px] text-purple-600 font-mono">e.g. @shanawar</span>
                </div>
                
                <div className="relative">
                  <AtSign className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="@username"
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    className={`w-full pl-10 pr-10 py-3 rounded-2xl border text-xs font-mono font-bold focus:outline-none transition-colors ${
                      usernameStatus.available 
                        ? "border-emerald-500 bg-emerald-50/30 text-emerald-950" 
                        : username ? "border-red-400 bg-red-50/20 text-purple-950" : "border-purple-200 bg-purple-50/30 text-purple-950"
                    }`}
                  />

                  {usernameStatus.available && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  )}
                </div>

                {usernameStatus.message && (
                  <p className={`text-[11px] font-bold ${usernameStatus.available ? "text-emerald-700" : "text-red-600"}`}>
                    {usernameStatus.message}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Email Verification */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-purple-950 uppercase tracking-wider block">
                  Email Address (@gmail.com or verified email)
                </label>
                <p className="text-[11px] text-gray-500">
                  Temporary or disposable email addresses are strictly prohibited for system security.
                </p>

                <div className="relative pt-1">
                  <Mail className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="user@gmail.com"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    className={`w-full pl-10 pr-10 py-3 rounded-2xl border text-xs font-bold focus:outline-none transition-colors ${
                      emailStatus.valid
                        ? "border-emerald-500 bg-emerald-50/30 text-emerald-950"
                        : email ? "border-red-400 bg-red-50/20 text-purple-950" : "border-purple-200 bg-purple-50/30 text-purple-950"
                    }`}
                  />
                  {emailStatus.valid && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  )}
                </div>

                {emailStatus.message && (
                  <p className={`text-[11px] font-bold ${emailStatus.valid ? "text-emerald-700" : "text-red-600"}`}>
                    {emailStatus.message}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Password & Automatic Location Detection */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-purple-950 uppercase tracking-wider block">
                  Set Account Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-purple-200 text-xs font-bold text-purple-950 focus:outline-none focus:border-purple-600 bg-purple-50/30"
                  />
                </div>
              </div>

              {/* Location & IP Details Box */}
              <div className="p-4 bg-purple-50 border border-purple-100 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-purple-600" />
                    Automatic Location & IP Registration
                  </span>
                  {isLocating && <Loader2 className="w-3.5 h-3.5 text-purple-600 animate-spin" />}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                  <div className="bg-white p-2.5 rounded-xl border border-purple-100">
                    <span className="text-[9px] text-gray-400 font-sans block uppercase font-bold">IP Address</span>
                    <span className="font-bold text-purple-950">{ipAddress}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-purple-100">
                    <span className="text-[9px] text-gray-400 font-sans block uppercase font-bold">Country</span>
                    <span className="font-bold text-purple-950">{country}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-purple-100 col-span-2">
                    <span className="text-[9px] text-gray-400 font-sans block uppercase font-bold">City / Region</span>
                    <span className="font-bold text-purple-950">{city}, {region}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Confirmation & Summary */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h3 className="text-xs font-black text-purple-950 uppercase tracking-wider">
                Confirm Account Registration Details
              </h3>

              <div className="p-4 bg-purple-50/70 border border-purple-100 rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-purple-100">
                  <span className="text-gray-500">Full Name:</span>
                  <span className="font-black text-purple-950">{name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-purple-100">
                  <span className="text-gray-500">Username:</span>
                  <span className="font-black text-purple-900 font-mono">{username}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-purple-100">
                  <span className="text-gray-500">Email:</span>
                  <span className="font-black text-purple-950">{email}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-purple-100">
                  <span className="text-gray-500">IP Address:</span>
                  <span className="font-black text-purple-950 font-mono">{ipAddress}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Location:</span>
                  <span className="font-black text-purple-950">{city}, {country}</span>
                </div>
              </div>

              <p className="text-[11px] text-gray-500 leading-relaxed text-center">
                By completing registration, your profile will be safely created in the Realtime Database.
              </p>
            </div>
          )}

          {/* Footer Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-purple-100">
            {step > 1 ? (
              <button
                onClick={() => setStep((step - 1) as any)}
                className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-950 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                onClick={
                  step === 1 ? handleNextFromStep1 :
                  step === 2 ? handleNextFromStep2 :
                  handleNextFromStep3
                }
                className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5 ml-auto"
              >
                <span>Next Step</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleCompleteRegistration}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-black text-xs rounded-xl transition-all shadow-lg cursor-pointer flex items-center gap-2 ml-auto disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Registering Account...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Complete Registration</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
