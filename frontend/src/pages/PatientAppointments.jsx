import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, X } from "lucide-react";
import api from "../utils/api";
import { format } from "date-fns";
import toast from "react-hot-toast";

const URGENCY_BADGE = { emergency: "badge-emergency", urgent: "badge-urgent", routine: "badge-routine" };

const STATUS_STYLE = {
  confirmed: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400",
  pending:   "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400",
  completed: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
  cancelled: "bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400",
  no_show:   "bg-gray-100 dark:bg-gray-800 text-gray-500",
};

export default function PatientAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [filter,       setFilter]       = useState("all");

  useEffect(() => {
    api.get("/patient/appointments")
      .then(r => setAppointments(r.data))
      .catch(() => toast.error("Failed to load appointments"))
      .finally(() => setLoading(false));
  }, []);

  async function cancel(id) {
    if (!confirm("Cancel this appointment?")) return;
    try {
      await api.put(`/appointments/${id}/cancel`);
      setAppointments(prev =>
        prev.map(a => a.id === id ? { ...a, status: "cancelled" } : a)
      );
      toast.success("Appointment cancelled");
    } catch { toast.error("Failed to cancel"); }
  }

  const filtered = appointments.filter(a =>
    filter === "all" ? true : a.status === filter
  );

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-display font-bold text-3xl text-gray-900 dark:text-white">My Appointments</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">All your scheduled visits</p>
      </motion.div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {["all", "confirmed", "completed", "cancelled"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
              ${filter === f
                ? "bg-brand-600 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Calendar size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No appointments found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((appt, i) => (
            <motion.div key={appt.id}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/50
                                flex items-center justify-center">
                  <Calendar size={20} className="text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{appt.doctor_name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{appt.doctor_specialty}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock size={12} className="text-gray-400" />
                    <p className="text-xs text-gray-500">
                      {format(new Date(appt.scheduled_at), "MMM d, yyyy · hh:mm a")}
                      {" · "}{appt.duration_minutes}min
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={URGENCY_BADGE[appt.urgency] || "badge-routine"}>{appt.urgency}</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_STYLE[appt.status]}`}>
                  {appt.status}
                </span>
                {["confirmed", "pending"].includes(appt.status) && (
                  <button onClick={() => cancel(appt.id)}
                    className="w-8 h-8 rounded-xl border border-red-200 dark:border-red-800/50
                               text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30
                               flex items-center justify-center transition-colors">
                    <X size={14} />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
