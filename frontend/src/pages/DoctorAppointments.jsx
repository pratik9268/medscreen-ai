import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, ChevronRight, Clock } from "lucide-react";
import api from "../utils/api";
import { format } from "date-fns";
import toast from "react-hot-toast";

const URGENCY_BADGE = { emergency: "badge-emergency", urgent: "badge-urgent", routine: "badge-routine" };
const STATUS_STYLE  = {
  confirmed: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400",
  pending:   "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400",
  completed: "bg-gray-100 dark:bg-gray-800 text-gray-500",
  cancelled: "bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400",
};

export default function DoctorAppointments() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [view,         setView]         = useState("upcoming"); // upcoming | today

  useEffect(() => {
    setLoading(true);
    const endpoint = view === "today"
      ? "/doctor/appointments/today"
      : "/doctor/appointments/upcoming";

    api.get(endpoint)
      .then(r => setAppointments(r.data))
      .catch(() => toast.error("Failed to load appointments"))
      .finally(() => setLoading(false));
  }, [view]);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-display font-bold text-3xl text-gray-900 dark:text-white">Appointments</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your patient schedule</p>
      </motion.div>

      {/* Toggle */}
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-2xl p-1 w-fit mb-6">
        {["today", "upcoming"].map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
              ${view === v
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400"
              }`}>
            {v === "today" ? "Today" : "Upcoming"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-16">
          <Calendar size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            No {view === "today" ? "appointments today" : "upcoming appointments"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appt, i) => (
            <motion.div key={appt.id}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(`/doctor/appointments/${appt.id}`)}
              className="card p-5 flex items-center justify-between cursor-pointer
                         hover:shadow-md hover:border-brand-200 dark:hover:border-brand-800/50
                         transition-all duration-200">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600
                                flex items-center justify-center text-white font-bold">
                  {appt.patient_name?.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{appt.patient_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Clock size={12} className="text-gray-400" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {format(new Date(appt.scheduled_at), "MMM d, yyyy · hh:mm a")}
                      {" · "}{appt.duration_minutes}min
                    </p>
                  </div>
                  {appt.patient_age && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Age {appt.patient_age} · {appt.patient_gender}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={URGENCY_BADGE[appt.urgency] || "badge-routine"}>{appt.urgency}</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_STYLE[appt.status]}`}>
                  {appt.status}
                </span>
                <ChevronRight size={16} className="text-gray-400" />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
