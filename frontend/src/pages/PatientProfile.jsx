import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { User, Save } from "lucide-react";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS      = ["male", "female", "other", "prefer_not_to_say"];

export default function PatientProfile() {
  const { user } = useAuth();
  const [form,    setForm]    = useState({
    age: "", gender: "", phone: "", blood_group: "",
    allergies: "", chronic_conditions: "", emergency_contact: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    api.get("/patient/profile")
      .then(r => setForm({
        age:               r.data.age || "",
        gender:            r.data.gender || "",
        phone:             r.data.phone || "",
        blood_group:       r.data.blood_group || "",
        allergies:         r.data.allergies || "",
        chronic_conditions: r.data.chronic_conditions || "",
        emergency_contact: r.data.emergency_contact || "",
      }))
      .catch(() => toast.error("Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/patient/profile", {
        ...form,
        age: form.age ? Number(form.age) : null,
      });
      toast.success("Profile updated!");
    } catch { toast.error("Failed to update profile"); }
    finally  { setSaving(false); }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-display font-bold text-3xl text-gray-900 dark:text-white">My Profile</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Keep your medical information up to date</p>
      </motion.div>

      {/* Account info card */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }} className="card p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700
                          flex items-center justify-center text-white text-xl font-bold">
            {user?.full_name?.charAt(0)}
          </div>
          <div>
            <p className="font-display font-bold text-xl text-gray-900 dark:text-white">{user?.full_name}</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{user?.email}</p>
            <span className="inline-block mt-1 px-2.5 py-0.5 bg-brand-50 dark:bg-brand-950/50
                             text-brand-700 dark:text-brand-400 rounded-full text-xs font-bold border
                             border-brand-200 dark:border-brand-800/50">
              Patient
            </span>
          </div>
        </div>
      </motion.div>

      {/* Profile form */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }} className="card p-6">
        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
          <User size={18} className="text-brand-500" />
          <h2 className="font-display font-bold text-gray-900 dark:text-white">Medical Information</h2>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1,2,3,4].map(i => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <form onSubmit={save} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Age</label>
                <input type="number" value={form.age} onChange={set("age")}
                  placeholder="28" min="1" max="120" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Gender</label>
                <select value={form.gender} onChange={set("gender")} className="input">
                  <option value="">Select gender</option>
                  {GENDERS.map(g => (
                    <option key={g} value={g}>{g.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Phone</label>
                <input type="tel" value={form.phone} onChange={set("phone")}
                  placeholder="+91 98765 43210" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Blood Group</label>
                <select value={form.blood_group} onChange={set("blood_group")} className="input">
                  <option value="">Select blood group</option>
                  {BLOOD_GROUPS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Allergies
              </label>
              <input type="text" value={form.allergies} onChange={set("allergies")}
                placeholder="Penicillin, Peanuts, etc. (or None)" className="input" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Chronic Conditions
              </label>
              <input type="text" value={form.chronic_conditions} onChange={set("chronic_conditions")}
                placeholder="Diabetes, Hypertension, etc. (or None)" className="input" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Emergency Contact
              </label>
              <input type="text" value={form.emergency_contact} onChange={set("emergency_contact")}
                placeholder="Name - Phone number" className="input" />
            </div>

            <motion.button type="submit" disabled={saving} whileTap={{ scale: 0.98 }}
              className="btn-primary w-full flex items-center justify-center gap-2">
              {saving
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Save size={16} />}
              {saving ? "Saving..." : "Save Profile"}
            </motion.button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
