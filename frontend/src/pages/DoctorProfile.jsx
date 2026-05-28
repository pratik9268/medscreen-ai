import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Stethoscope, Save, User, Award, Clock, DollarSign } from "lucide-react";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const SPECIALTIES = [
  "General Practice",
  "Cardiologist",
  "Neurologist",
  "Orthopedic Surgeon",
  "Gastroenterologist",
  "Pulmonologist",
  "Dermatologist",
  "Psychiatrist",
  "ENT Specialist",
  "Ophthalmologist",
  "Endocrinologist",
  "Urologist",
  "Emergency Medicine",
  "Pediatrician",
  "Gynecologist",
  "Oncologist",
  "Radiologist",
  "Anesthesiologist",
  "Rheumatologist",
  "Nephrologist",
];

function Section({ title, icon: Icon, children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="card p-6"
    >
      <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
        <Icon size={18} className="text-brand-500" />
        <h2 className="font-display font-bold text-gray-900 dark:text-white">{title}</h2>
      </div>
      {children}
    </motion.div>
  );
}

export default function DoctorProfile() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    specialty:        "",
    qualifications:   "",
    experience_years: "",
    bio:              "",
    consultation_fee: "",
    is_available:     true,
  });
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    api.get("/doctor/profile")
      .then(r => setForm({
        specialty:        r.data.specialty        || "",
        qualifications:   r.data.qualifications   || "",
        experience_years: r.data.experience_years || "",
        bio:              r.data.bio              || "",
        consultation_fee: r.data.consultation_fee || "",
        is_available:     r.data.is_available     ?? true,
      }))
      .catch(() => toast.error("Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/doctor/profile", {
        ...form,
        experience_years: form.experience_years ? Number(form.experience_years) : null,
        consultation_fee: form.consultation_fee  ? Number(form.consultation_fee)  : null,
      });
      toast.success("Profile updated successfully!");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-display font-bold text-3xl text-gray-900 dark:text-white">My Profile</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Manage your professional information visible to patients
        </p>
      </motion.div>

      {/* Account card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card p-6 mb-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-400 to-violet-700
                            flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {user?.full_name?.charAt(0)}
            </div>
            <div>
              <p className="font-display font-bold text-xl text-gray-900 dark:text-white">
                {user?.full_name}
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{user?.email}</p>
              <span className="inline-block mt-1.5 px-3 py-0.5
                               bg-violet-50 dark:bg-violet-900
                               text-violet-700 dark:text-violet-300
                               rounded-full text-xs font-bold border
                               border-violet-200 dark:border-violet-700">
                Doctor
              </span>
            </div>
          </div>

          {/* Availability toggle */}
          <div className="flex flex-col items-end gap-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">Availability</p>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, is_available: !f.is_available }))}
              className={`relative w-14 h-7 rounded-full transition-colors duration-200 focus:outline-none
                ${form.is_available ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow
                                transition-transform duration-200
                                ${form.is_available ? "translate-x-7" : "translate-x-0"}`} />
            </button>
            <p className={`text-xs font-medium ${form.is_available ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400"}`}>
              {form.is_available ? "Accepting patients" : "Not available"}
            </p>
          </div>
        </div>
      </motion.div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <form onSubmit={save} className="space-y-6">

          {/* Professional Details */}
          <Section title="Professional Details" icon={Stethoscope} delay={0.2}>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Specialty <span className="text-red-500">*</span>
                  </label>
                  <select value={form.specialty} onChange={set("specialty")} required className="input">
                    <option value="">Select specialty</option>
                    {SPECIALTIES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Years of Experience
                  </label>
                  <input
                    type="number" value={form.experience_years} onChange={set("experience_years")}
                    placeholder="10" min="0" max="60" className="input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Qualifications
                </label>
                <input
                  type="text" value={form.qualifications} onChange={set("qualifications")}
                  placeholder="MBBS, MD Cardiology, DM (Cardiology)"
                  className="input"
                />
                <p className="text-xs text-gray-400 mt-1">Separate multiple qualifications with commas</p>
              </div>
            </div>
          </Section>

          {/* Bio */}
          <Section title="About You" icon={User} delay={0.3}>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Professional Bio
              </label>
              <textarea
                value={form.bio} onChange={set("bio")}
                placeholder="Tell patients about your expertise, approach to care, and areas of interest..."
                rows={5}
                className="input resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                {form.bio.length}/500 characters
              </p>
            </div>
          </Section>

          {/* Consultation */}
          <Section title="Consultation Details" icon={DollarSign} delay={0.4}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Consultation Fee (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
                  <input
                    type="number" value={form.consultation_fee} onChange={set("consultation_fee")}
                    placeholder="500" min="0" className="input pl-8"
                  />
                </div>
              </div>
              <div className="flex flex-col justify-end">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current Status</p>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${form.is_available ? "bg-emerald-500" : "bg-gray-400"}`} />
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {form.is_available ? "Accepting new patients" : "Not accepting patients"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* Save button */}
          <motion.button
            type="submit" disabled={saving}
            whileTap={{ scale: 0.98 }}
            className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base"
          >
            {saving
              ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Save size={18} />
            }
            {saving ? "Saving..." : "Save Profile"}
          </motion.button>
        </form>
      )}
    </div>
  );
}
