import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users, Stethoscope, Calendar, Activity, AlertTriangle,
  Clock, TrendingUp, Shield, ToggleLeft, ToggleRight
} from "lucide-react";
import api from "../utils/api";
import { format } from "date-fns";
import toast from "react-hot-toast";

function StatCard({ icon: Icon, label, value, color, sub, delay }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay }} className="card p-6">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
          <Icon size={20} className="text-white" />
        </div>
        {sub !== undefined && (
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full">
            {sub} today
          </span>
        )}
      </div>
      <p className="text-3xl font-display font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</p>
    </motion.div>
  );
}

const ROLE_BADGE = {
  patient: "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50",
  doctor:  "bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800/50",
  admin:   "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50",
};

export default function AdminDashboard() {
  const [stats,   setStats]   = useState(null);
  const [users,   setUsers]   = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [tab,     setTab]     = useState("users");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/admin/stats"),
      api.get("/admin/users"),
      api.get("/admin/doctors"),
    ]).then(([s, u, d]) => {
      setStats(s.data);
      setUsers(u.data.users || []);
      setDoctors(d.data || []);
    }).catch(() => toast.error("Failed to load admin data"))
      .finally(() => setLoading(false));
  }, []);

  async function toggleUser(id) {
    try {
      const { data } = await api.put(`/admin/users/${id}/toggle-active`);
      setUsers(u => u.map(user =>
        user.id === id ? { ...user, is_active: data.is_active } : user
      ));
      toast.success(data.message);
    } catch { toast.error("Failed to update user"); }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700
                          flex items-center justify-center">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-3xl text-gray-900 dark:text-white">Admin Panel</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">System overview and management</p>
          </div>
        </div>
      </motion.div>

      {/* Stats grid */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Users}         label="Total Users"       value={stats.total_users}        color="bg-brand-500"   sub={null}                           delay={0.1} />
          <StatCard icon={Stethoscope}   label="Doctors"           value={stats.total_doctors}      color="bg-violet-500"  sub={null}                           delay={0.2} />
          <StatCard icon={Calendar}      label="Appointments"      value={stats.total_appointments} color="bg-emerald-500" sub={stats.appointments_today}        delay={0.3} />
          <StatCard icon={AlertTriangle} label="Emergency Cases"   value={stats.emergency_cases}    color="bg-red-500"     sub={stats.pending_appointments}      delay={0.4} />
        </div>
      )}

      {/* Additional stat cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { icon: Activity, label: "Pre-Screenings", value: stats.total_screenings, color: "bg-cyan-500" },
            { icon: Clock,    label: "Pending",        value: stats.pending_appointments, color: "bg-amber-500" },
            { icon: TrendingUp, label: "Patients",     value: stats.total_patients, color: "bg-pink-500" },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="card p-5 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl ${s.color} flex items-center justify-center shrink-0`}>
                  <Icon size={22} className="text-white" />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold text-gray-900 dark:text-white">{s.value}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-2xl p-1 w-fit mb-6">
          {["users", "doctors"].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                ${tab === t
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
                }`}>
              {t === "users" ? `All Users (${users.length})` : `Doctors (${doctors.length})`}
            </button>
          ))}
        </div>

        {/* Users table */}
        {tab === "users" && (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    {["Name", "Email", "Role", "Joined", "Status", "Action"].map(h => (
                      <th key={h} className="text-left px-6 py-4 text-xs font-bold text-gray-500
                                             dark:text-gray-400 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-gray-50 dark:border-gray-800/50">
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} className="px-6 py-4">
                            <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : users.map(user => (
                    <tr key={user.id}
                      className="border-b border-gray-50 dark:border-gray-800/50
                                 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600
                                          flex items-center justify-center text-white text-sm font-bold shrink-0">
                            {user.full_name?.charAt(0)}
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white text-sm">
                            {user.full_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${ROLE_BADGE[user.role] || ""}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {user.created_at ? format(new Date(user.created_at), "MMM d, yyyy") : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold
                          ${user.is_active
                            ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400"
                            : "bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400"
                          }`}>
                          {user.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={() => toggleUser(user.id)}
                          className="flex items-center gap-1.5 text-xs font-medium text-gray-500
                                     hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                          {user.is_active
                            ? <><ToggleRight size={18} className="text-emerald-500" /> Deactivate</>
                            : <><ToggleLeft  size={18} className="text-red-400" /> Activate</>
                          }
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Doctors table */}
        {tab === "doctors" && (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    {["Doctor", "Specialty", "Experience", "Fee", "Status"].map(h => (
                      <th key={h} className="text-left px-6 py-4 text-xs font-bold text-gray-500
                                             dark:text-gray-400 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="border-b border-gray-50 dark:border-gray-800/50">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <td key={j} className="px-6 py-4">
                            <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : doctors.map(doc => (
                    <tr key={doc.id}
                      className="border-b border-gray-50 dark:border-gray-800/50
                                 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-violet-600
                                          flex items-center justify-center text-white text-sm font-bold">
                            {doc.full_name?.charAt(0)}
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white text-sm">
                            {doc.full_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{doc.specialty}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {doc.experience_years} yrs
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        ₹{doc.consultation_fee}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold
                          ${doc.is_available
                            ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                          }`}>
                          {doc.is_available ? "Available" : "Unavailable"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
