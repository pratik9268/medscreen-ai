import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, Activity, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "../utils/supabase";
import ThemeToggle from "../components/ThemeToggle";

export default function ResetPassword() {
  const navigate             = useNavigate();
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [showPass,  setShowPass]  = useState(false);
  const [showConf,  setShowConf]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [done,      setDone]      = useState(false);
  const [error,     setError]     = useState("");
  const [validLink, setValidLink] = useState(true);

  // Supabase puts the session tokens in the URL hash when user clicks reset link
  // We need to detect this and set the session
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.includes("access_token")) {
      // No token in URL — invalid or expired link
      setValidLink(false);
    }
  }, []);

  // Password strength checker
  function getStrength(p) {
    let score = 0;
    if (p.length >= 8)               score++;
    if (/[A-Z]/.test(p))             score++;
    if (/[0-9]/.test(p))             score++;
    if (/[^A-Za-z0-9]/.test(p))     score++;
    return score;
  }

  const strength      = getStrength(password);
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = ["", "bg-red-500", "bg-amber-500", "bg-brand-500", "bg-emerald-500"][strength];

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      return setError("Password must be at least 6 characters.");
    }
    if (password !== confirm) {
      return setError("Passwords do not match.");
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      // Redirect to login after 3 seconds
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(err.message || "Failed to reset password. The link may have expired.");
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
            Create a new<br />password
          </h1>
          <p className="text-brand-200 text-lg leading-relaxed">
            Choose a strong password to keep your account secure.
          </p>
        </div>
        <div className="relative space-y-4">
          {[
            { icon:"✅", text:"At least 8 characters long" },
            { icon:"✅", text:"Mix of uppercase and lowercase" },
            { icon:"✅", text:"Include numbers and symbols" },
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

          {/* Invalid link */}
          {!validLink && (
            <div className="card p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950
                              flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} className="text-red-500" />
              </div>
              <h2 className="font-display font-bold text-2xl text-gray-900 dark:text-white mb-2">
                Invalid or expired link
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
              <button onClick={() => navigate("/forgot-password")}
                className="btn-primary w-full">
                Request New Link
              </button>
            </div>
          )}

          {/* Success state */}
          {validLink && done && (
            <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
              className="card p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950
                              flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-emerald-500" />
              </div>
              <h2 className="font-display font-bold text-2xl text-gray-900 dark:text-white mb-2">
                Password reset!
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Your password has been updated successfully.
              </p>
              <p className="text-sm text-brand-600 dark:text-brand-400">
                Redirecting to login in 3 seconds...
              </p>
              <div className="mt-4 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <motion.div initial={{ width:"0%" }} animate={{ width:"100%" }}
                  transition={{ duration:3, ease:"linear" }}
                  className="h-full bg-brand-500 rounded-full" />
              </div>
            </motion.div>
          )}

          {/* Reset form */}
          {validLink && !done && (
            <div className="card p-8">
              <h2 className="font-display font-bold text-2xl text-gray-900 dark:text-white mb-1">
                Set new password
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                Enter your new password below.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showPass ? "text" : "password"}
                      value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••" required minLength={6}
                      className="input pl-10 pr-12" />
                    <button type="button" onClick={() => setShowPass(s=>!s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* Strength bar */}
                  {password && (
                    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1,2,3,4].map(i => (
                          <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300
                            ${i <= strength ? strengthColor : "bg-gray-200 dark:bg-gray-700"}`} />
                        ))}
                      </div>
                      <p className={`text-xs font-medium
                        ${strength===1?"text-red-500":strength===2?"text-amber-500":strength===3?"text-brand-500":"text-emerald-500"}`}>
                        {strengthLabel}
                      </p>
                    </motion.div>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showConf ? "text" : "password"}
                      value={confirm} onChange={e => setConfirm(e.target.value)}
                      placeholder="••••••••" required
                      className={`input pl-10 pr-12 ${
                        confirm && password !== confirm
                          ? "border-red-400 focus:ring-red-400"
                          : confirm && password === confirm
                            ? "border-emerald-400 focus:ring-emerald-400"
                            : ""
                      }`} />
                    <button type="button" onClick={() => setShowConf(s=>!s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showConf ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {confirm && password !== confirm && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
                  {confirm && password === confirm && (
                    <p className="text-xs text-emerald-500 mt-1">✓ Passwords match</p>
                  )}
                </div>

                {error && (
                  <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
                    className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800
                               rounded-xl text-sm text-red-600 dark:text-red-400">
                    {error}
                  </motion.div>
                )}

                <motion.button type="submit"
                  disabled={loading || password !== confirm || password.length < 6}
                  whileTap={{ scale:0.98 }}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3">
                  {loading
                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <Lock size={18} />
                  }
                  {loading ? "Updating..." : "Reset Password"}
                </motion.button>
              </form>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}