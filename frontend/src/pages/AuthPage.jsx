import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Stethoscope, User, Shield, ArrowRight, Activity } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "../components/ThemeToggle";
import api from "../utils/api";
import toast from "react-hot-toast";

// ⚠️ Doctor and Admin accounts are created by admin only
// Public registration is for patients only
const REGISTER_ROLES = [
  { value: "patient", label: "Patient", icon: User, desc: "Book appointments & pre-screening" },
];

const LOGIN_ROLE_ICONS = {
  patient: User,
  doctor:  Stethoscope,
  admin:   Shield,
};

export default function AuthPage() {
  const [mode,     setMode]     = useState("login");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [form,     setForm]     = useState({ email: "", password: "", full_name: "" });

  const { login } = useAuth();
  const navigate  = useNavigate();
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const REDIRECT = { patient: "/patient", doctor: "/doctor", admin: "/admin" };

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const payload  = mode === "login"
        ? { email: form.email, password: form.password }
        : { email: form.email, password: form.password, full_name: form.full_name, role: "patient" };

      const { data } = await api.post(endpoint, payload);
      login(data);
      toast.success(mode === "login" ? `Welcome back, ${data.full_name}!` : "Account created!");
      navigate(REDIRECT[data.role] || "/patient");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Something went wrong");
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
        {/* Decorative circles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
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
            AI-Powered<br />Pre-Screening<br />for Modern Care
          </h1>
          <p className="text-brand-200 text-lg leading-relaxed">
            Intelligent symptom collection, instant specialist routing,
            and automated reports — before the patient sees a doctor.
          </p>
        </div>

        <div className="relative space-y-4">
          {[
            { icon:"🩺", text:"Smart symptom collection via AI conversation" },
            { icon:"📋", text:"Auto-generated professional PDF reports"       },
            { icon:"🎯", text:"Intelligent specialist classification"          },
            { icon:"📅", text:"Dynamic appointment booking"                   },
          ].map((item, i) => (
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
          {/* Tabs */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-2xl p-1 mb-8">
            {["login","register"].map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                  ${mode===m
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}>
                {m==="login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <div className="card p-8">
            <h2 className="font-display font-bold text-2xl text-gray-900 dark:text-white mb-1">
              {mode==="login" ? "Welcome back" : "Create patient account"}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              {mode==="login"
                ? "Sign in to your MedScreen account"
                : "Patient self-registration · Doctors are added by admin"}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full name — register only */}
              <AnimatePresence>
                {mode==="register" && (
                  <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }}
                    exit={{ opacity:0, height:0 }}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Full Name
                    </label>
                    <input type="text" value={form.full_name} onChange={set("full_name")}
                      placeholder="John Doe" required className="input" />
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Email Address
                </label>
                <input type="email" value={form.email} onChange={set("email")}
                  placeholder="you@example.com" required className="input" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input type={showPass ? "text" : "password"} value={form.password}
                    onChange={set("password")} placeholder="••••••••" required minLength={6}
                    className="input pr-12" />
                  <button type="button" onClick={() => setShowPass(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <motion.button type="submit" disabled={loading} whileTap={{ scale:0.98 }}
                className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
                {loading
                  ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <>{mode==="login" ? "Sign In" : "Create Account"}<ArrowRight size={18} /></>
                }
              </motion.button>
            </form>

            {/* Doctor/Admin notice */}
            {mode==="register" && (
              <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.2 }}
                className="mt-4 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl">
                <p className="text-xs text-amber-700 dark:text-amber-400 text-center">
                  🩺 Doctor or Admin? Contact your system administrator to create your account.
                </p>
              </motion.div>
            )}
          </div>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
            {mode==="login" ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => setMode(mode==="login" ? "register" : "login")}
              className="text-brand-600 dark:text-brand-400 font-medium hover:underline">
              {mode==="login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}