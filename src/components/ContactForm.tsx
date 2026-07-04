import React, { useState } from "react";
import { Send, User, Mail, Globe, MessageSquare, CheckCircle, RefreshCw } from "lucide-react";
import { db, DB_PATHS } from "../firebase";
import { ref, push, set } from "firebase/database";
import { motion, AnimatePresence } from "motion/react";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !country.trim() || !message.trim()) return;

    setIsSubmitting(true);
    try {
      const messagesRef = ref(db, DB_PATHS.MESSAGES);
      const newMsgRef = push(messagesRef);
      await set(newMsgRef, {
        id: newMsgRef.key,
        name: name.trim(),
        email: email.trim(),
        country: country.trim(),
        message: message.trim(),
        date: new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        })
      });

      // Also trigger a notification in DB for New Contact Message
      const notificationsRef = ref(db, DB_PATHS.NOTIFICATIONS);
      const newNotifRef = push(notificationsRef);
      await set(newNotifRef, {
        id: newNotifRef.key,
        title: "New Contact Message",
        body: `From ${name.trim()} (${country.trim()}): "${message.trim().slice(0, 45)}..."`,
        date: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        }),
        isRead: false
      });

      setIsSuccess(true);
      // Reset
      setName("");
      setEmail("");
      setCountry("");
      setMessage("");

      setTimeout(() => {
        setIsSuccess(false);
      }, 5000);
    } catch (err) {
      console.error("Error sending contact message:", err);
      alert("Failed to send message. Please check your network or try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white/40 backdrop-blur-lg rounded-[32px] border border-white/60 p-6 sm:p-8 md:p-10 shadow-xl relative" id="contact-form-container">
      {/* Visual Ambient Halo */}
      <div className="absolute -left-12 -bottom-12 w-32 h-32 bg-purple-400/20 rounded-full filter blur-2xl pointer-events-none" />

      <h2 className="text-2xl font-extrabold text-purple-950 tracking-tight mb-2 flex items-center gap-2">
        <MessageSquare className="w-6 h-6 text-purple-600 animate-pulse" />
        <span>Get in Touch with S pro coder</span>
      </h2>
      <p className="text-sm text-gray-600 mb-6 max-w-lg leading-relaxed">
        Have questions about tech tools, AI content, or collaborations? Send us a direct message and our team will get back to you within 24 hours.
      </p>

      <AnimatePresence mode="wait">
        {isSuccess ? (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="p-6 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-center space-y-3"
            id="contact-success-state"
          >
            <div className="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-purple-200">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-purple-950 text-base">Message Sent Successfully!</h3>
            <p className="text-xs text-gray-600 leading-relaxed max-w-sm mx-auto">
              Thank you for reaching out to S pro coder. Your message has been securely submitted to our database, and we will contact you shortly!
            </p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-purple-900 uppercase tracking-wider block">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Shanawar Ali"
                    required
                    disabled={isSubmitting}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/70 border border-purple-100 text-sm text-purple-950 placeholder-purple-950/30 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/20 transition-all"
                    id="contact-input-name"
                  />
                  <User className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400" />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-purple-900 uppercase tracking-wider block">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. user@domain.com"
                    required
                    disabled={isSubmitting}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/70 border border-purple-100 text-sm text-purple-950 placeholder-purple-950/30 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/20 transition-all"
                    id="contact-input-email"
                  />
                  <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400" />
                </div>
              </div>
            </div>

            {/* Country */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-purple-900 uppercase tracking-wider block">
                Country
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g. Pakistan, United States"
                  required
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/70 border border-purple-100 text-sm text-purple-950 placeholder-purple-950/30 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/20 transition-all"
                  id="contact-input-country"
                />
                <Globe className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400" />
              </div>
            </div>

            {/* Message */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-purple-900 uppercase tracking-wider block">
                Your Message
              </label>
              <div className="relative">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your feedback, question, or custom technical topic recommendation here..."
                  required
                  disabled={isSubmitting}
                  rows={4}
                  maxLength={1000}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/70 border border-purple-100 text-sm text-purple-950 placeholder-purple-950/30 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/20 resize-none transition-all"
                  id="contact-input-message"
                />
                <MessageSquare className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400" />
              </div>
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-6 rounded-2xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-none"
              id="contact-submit-btn"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Submitting Message...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Transmit Secure Message</span>
                </>
              )}
            </button>
          </form>
        )}
      </AnimatePresence>
    </div>
  );
}
