import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, Activity, CheckCircle } from "lucide-react";
import { supabase } from "../utils/supabase";
import ThemeToggle from "../components/ThemeToggle";

export default function ForgotPassword() {
  const [email,     setEmail]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [sent,      setSent]      = useState(false);
  const [error,     setError]     = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
      {/* Left panel */}
      <motion.div initial={{ opacity:0, x:-40 }} animate={{ opacity:1, x:0 }}
        className="hidden lg:flex flex-col justify-between w-[480px] shrink-0
                   bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-10 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_,i) => (
            <motion.div key={i}
              animate={{ y:[0,-20,0], rotate:[0,5,0] }}
              transition={{ duration:4+i, repeat:Infinity, delay:i*0.5 }}
              className="absolute rounded-full bg-white/5"
              style={{ width:80+i*40, height:80+i*40, top:`${10+i*15}%`, right:`-${20+i*10}px` }} />
          ))}
        </div>
        <div className="relative">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Activity size={20} className="text-white" />
            </div>
            <span className="font-display font-bold text-white text-xl">MedScreen AI</span>
          </div>
          <h1 className="font-display font-bold text-white text-4xl leading-tight mb-4">
            Reset your<br />password
          </h1>
          <p className="text-brand-200 text-lg leading-relaxed">
            Enter your email and we'll send you a secure link to reset your password.
          </p>
        </div>
        <div className="relative space-y-4">
          {[
            { icon:"🔒", text:"Secure password reset via email" },
            { icon:"⚡", text:"Link expires in 1 hour for security" },
            { icon:"✉️", text:"Check your spam folder if not received" },
          ].map((item,i) => (
            <motion.div key={i} initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }}
              transition={{ delay:0.5+i*0.1 }}
              className="flex items-center gap-3 text-brand-100">
              <span className="text-xl">{item.icon}</span>
              <span className="text-sm">{item.text}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
        <div className="absolute top-6 right-6"><ThemeToggle /></div>

        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="w-full max-w-md">
          <Link to="/login"
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400
                       hover:text-gray-700 dark:hover:text-gray-200 transition-colors mb-8">
            <ArrowLeft size={16} /> Back to Sign In
          </Link>

          {sent ? (
            /* Success state */
            <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
              className="card p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950
                              flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-emerald-500" />
              </div>
              <h2 className="font-display font-bold text-2xl text-gray-900 dark:text-white mb-2">
                Check your email
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-2">
                We sent a password reset link to:
              </p>
              <p className="font-semibold text-gray-900 dark:text-white mb-6">{email}</p>
              <div className="p-4 bg-brand-50 dark:bg-brand-950 border border-brand-200 dark:border-brand-800
                              rounded-xl text-sm text-brand-700 dark:text-brand-400 mb-6">
                Click the link in the email to reset your password. The link expires in <strong>1 hour</strong>.
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Didn't receive it?{" "}
                <button onClick={() => setSent(false)}
                  className="text-brand-600 dark:text-brand-400 font-medium hover:underline">
                  Try again
                </button>
              </p>
            </motion.div>
          ) : (
            /* Form state */
            <div className="card p-8">
              <h2 className="font-display font-bold text-2xl text-gray-900 dark:text-white mb-1">
                Forgot password?
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                No worries — enter your email and we'll send a reset link.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com" required
                      className="input pl-10" />
                  </div>
                </div>

                {error && (
                  <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
                    className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800
                               rounded-xl text-sm text-red-600 dark:text-red-400">
                    {error}
                  </motion.div>
                )}

                <motion.button type="submit" disabled={loading} whileTap={{ scale:0.98 }}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3">
                  {loading
                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <Mail size={18} />
                  }
                  {loading ? "Sending..." : "Send Reset Link"}
                </motion.button>
              </form>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}