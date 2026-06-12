import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, X, Wifi } from "lucide-react";
import api from "../utils/api";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useRealtimeAppointments } from "../hooks/useRealtimeAppointments";

const URGENCY_BADGE = { emergency: "badge-emergency", urgent: "badge-urgent", routine: "badge-routine" };

const STATUS_STYLE = {
  confirmed: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400",
  pending:   "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400",
  completed: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
  cancelled: "bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400",
  no_show:   "bg-gray-100 dark:bg-gray-800 text-gray-500",
};

const STATUS_LABEL = {
  confirmed: "Confirmed ✓",
  pending:   "Pending",
  completed: "Completed ✓",
  cancelled: "Cancelled",
  no_show:   "No Show",
};

// Live status badge with pulse for active statuses
function StatusBadge({ status }) {
  const isActive = ["confirmed", "pending"].includes(status);
  return (
    <span className={`relative px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${STATUS_STYLE[status]}`}>
      {isActive && (
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 animate-pulse" />
      )}
      {STATUS_LABEL[status] || status}
    </span>
  );
}

export default function PatientAppointments() {
  const { user }                         = useAuth();
  const [appointments, setAppointments]  = useState([]);
  const [patientId,    setPatientId]     = useState(null);
  const [loading,      setLoading]       = useState(true);
  const [filter,       setFilter]        = useState("all");
  const [liveUpdate,   setLiveUpdate]    = useState(null); // tracks last realtime event

  // Load appointments + get patient ID for realtime
  useEffect(() => {
    Promise.all([
      api.get("/patient/appointments"),
      api.get("/patient/profile"),
    ]).then(([apptRes, profileRes]) => {
      setAppointments(apptRes.data);
      setPatientId(profileRes.data?.id || null);
    }).catch(() => toast.error("Failed to load appointments"))
      .finally(() => setLoading(false));
  }, []);

  // Realtime handlers
  const handleUpdate = useCallback((newRow) => {
    setAppointments(prev =>
      prev.map(a => a.id === newRow.id
        ? { ...a, status: newRow.status, scheduled_at: newRow.scheduled_at }
        : a
      )
    );
    // Show live notification
    const msg = newRow.status === "completed"  ? "✅ Appointment marked complete by doctor"
               : newRow.status === "cancelled"  ? "❌ Appointment was cancelled"
               : newRow.status === "confirmed"  ? "✅ Appointment confirmed"
               : `📋 Appointment updated to ${newRow.status}`;
    toast(msg, { duration: 4000 });
    setLiveUpdate({ id: newRow.id, ts: Date.now() });
  }, []);

  const handleInsert = useCallback((newRow) => {
    // Refetch to get full appointment with doctor name etc.
    api.get("/patient/appointments").then(r => setAppointments(r.data));
    toast("📅 New appointment booked!", { duration: 3000 });
  }, []);

  // Subscribe to realtime
  useRealtimeAppointments({
    role:     "patient",
    entityId: patientId,
    onUpdate: handleUpdate,
    onInsert: handleInsert,
  });

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
      <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} className="mb-8">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="font-display font-bold text-3xl text-gray-900 dark:text-white">My Appointments</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">All your scheduled visits</p>
          </div>
          {/* Live indicator */}
          <div className="ml-auto flex items-center gap-2 px-3 py-1.5
                          bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800
                          rounded-full text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <Wifi size={12} className="animate-pulse" />
            Live updates on
          </div>
        </div>
      </motion.div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {["all","confirmed","completed","cancelled"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all
              ${filter===f
                ? "bg-brand-600 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}>
            {f.charAt(0).toUpperCase()+f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Calendar size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No appointments found</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {filtered.map((appt, i) => {
              const isJustUpdated = liveUpdate?.id === appt.id && (Date.now() - liveUpdate.ts < 5000);
              return (
                <motion.div key={appt.id}
                  initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
                  transition={{ delay:i*0.05 }}
                  className={`card p-5 flex items-center justify-between transition-all duration-500
                    ${isJustUpdated ? "ring-2 ring-brand-400 ring-offset-2 dark:ring-offset-gray-950" : ""}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/50 flex items-center justify-center">
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
                    <span className={URGENCY_BADGE[appt.urgency]||"badge-routine"}>{appt.urgency}</span>
                    <StatusBadge status={appt.status} />
                    {["confirmed","pending"].includes(appt.status) && (
                      <button onClick={() => cancel(appt.id)}
                        className="w-8 h-8 rounded-xl border border-red-200 dark:border-red-800/50
                                   text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30
                                   flex items-center justify-center transition-colors">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}