import React, { useState } from "react";
import { KeyRound, ShieldAlert, AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { ref, get } from "firebase/database";
import { db } from "../firebase";

interface AdminAuthProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AdminAuth({ onSuccess, onCancel }: AdminAuthProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAdminAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const targetEmail = "shanawarali07860@gmail.com";
    const targetPassword = "Shanawarali@07860";
    const targetPin = "07860";

    try {
      // Look up if any custom overrides are defined in firebase database, otherwise default to target
      const adminSettingsRef = ref(db, "settings/adminAuth");
      const snapshot = await get(adminSettingsRef);
      
      let verified = false;
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (
          email.trim() === data.email &&
          password === data.password &&
          pin === data.pin
        ) {
          verified = true;
        }
      }

      // Fallback or main standard credentials
      if (!verified) {
        if (
          email.trim() === targetEmail &&
          password === targetPassword &&
          pin === targetPin
        ) {
          verified = true;
        }
      }

      if (verified) {
        onSuccess();
      } else {
        setError("Invalid Admin email, password, or security PIN code.");
      }
    } catch (err) {
      console.error(err);
      setError("Database connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      className="max-w-md mx-auto space-y-6 pb-16 animate-in fade-in duration-300"
      id="admin-auth-view"
    >
      {/* Back to Home Button */}
      <button
        onClick={onCancel}
        className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/50 backdrop-blur-md border border-purple-100 text-purple-950 font-bold hover:bg-purple-600 hover:text-white transition-all cursor-pointer text-xs"
        id="auth-back-home-btn"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Cancel & Back</span>
      </button>

      {/* Auth Card Container */}
      <div className="bg-white/40 backdrop-blur-lg border border-white/60 rounded-[36px] p-8 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center mx-auto shadow-md shadow-purple-200">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="font-sans font-black text-2xl text-purple-950 tracking-tight">
            Administrator Access Gate
          </h2>
          <p className="text-xs text-gray-500 leading-normal max-w-xs mx-auto">
            Provide your secure administrator credentials and secondary safety security PIN to open the live system decks.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl text-xs text-rose-700 font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleAdminAuthSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-purple-950 uppercase tracking-wider block">
              Admin Email
            </label>
            <input
              type="email"
              required
              placeholder="shanawarali07860@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-white border border-purple-100 text-xs text-purple-950 focus:outline-none focus:border-purple-500"
              id="admin-auth-email"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-purple-950 uppercase tracking-wider block">
              Admin Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-white border border-purple-100 text-xs text-purple-950 focus:outline-none focus:border-purple-500"
              id="admin-auth-password"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-purple-950 uppercase tracking-wider block">
              Security PIN Code
            </label>
            <input
              type="password"
              required
              maxLength={5}
              placeholder="07860"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-white border border-purple-100 text-sm text-center font-mono tracking-widest font-black text-purple-950 focus:outline-none focus:border-purple-500"
              id="admin-auth-pin"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs tracking-wider uppercase shadow-md shadow-purple-200 hover:shadow-lg hover:shadow-purple-300 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            id="admin-auth-submit"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Checking Firebase Database...</span>
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Unlock Control Deck</span>
              </>
            )}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
