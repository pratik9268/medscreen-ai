import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, Clock, Users, ChevronRight, AlertTriangle, CheckCircle, Activity } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import { format, isToday } from "date-fns";

const URGENCY_BADGE = {
  emergency: "badge-emergency",
  urgent:    "badge-urgent",
  routine:   "badge-routine",
};

function AppointmentRow({ appt, onView }) {
  return (
    <motion.div whileHover={{ x: 2 }}
      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50
                 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
      onClick={() => onView(appt.id)}>
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-950/50
                        flex items-center justify-center text-brand-700 dark:text-brand-400 font-bold text-sm">
          {appt.patient_name?.charAt(0)}
        </div>
        <div>
          <p className="font-medium text-gray-900 dark:text-white text-sm">{appt.patient_name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {format(new Date(appt.scheduled_at), "hh:mm a")} · {appt.duration_minutes}min
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={URGENCY_BADGE[appt.urgency] || "badge-routine"}>{appt.urgency}</span>
        <ChevronRight size={16} className="text-gray-400" />
      </div>
    </motion.div>
  );
}

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [today,    setToday]    = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/doctor/appointments/today"),
      api.get("/doctor/appointments/upcoming"),
    ]).then(([t, u]) => {
      setToday(t.data);
      setUpcoming(u.data);
    }).finally(() => setLoading(false));
  }, []);

  const emergency = today.filter(a => a.urgency === "emergency").length;
  const urgent    = today.filter(a => a.urgency === "urgent").length;

  const viewDetail = (id) => window.open(`/doctor/appointments/${id}`, "_self");

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-display font-bold text-3xl text-gray-900 dark:text-white">
          Dr. {user?.full_name?.replace(/^Dr\.?\s*/i, "")} 👨‍⚕️
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {format(new Date(), "EEEE, MMMM d yyyy")}
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Calendar,      label: "Today's Patients", value: today.length,             color: "bg-brand-500"   },
          { icon: AlertTriangle, label: "Emergency",         value: emergency,                color: "bg-red-500"     },
          { icon: Activity,      label: "Urgent",            value: urgent,                   color: "bg-amber-500"   },
          { icon: Clock,         label: "Upcoming",          value: upcoming.length,          color: "bg-violet-500"  },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }} className="card p-6">
              <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center mb-4`}>
                <Icon size={20} className="text-white" />
              </div>
              <p className="text-2xl font-display font-bold text-gray-900 dark:text-white">{s.value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{s.label}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }} className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg text-gray-900 dark:text-white">
              Today's Schedule
            </h2>
            <Link to="/doctor/today"
              className="text-brand-600 dark:text-brand-400 text-sm font-medium hover:underline">
              Full view
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
            </div>
          ) : today.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle size={32} className="mx-auto text-emerald-400 mb-2" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">No appointments today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {today.map(appt => (
                <AppointmentRow key={appt.id} appt={appt} onView={viewDetail} />
              ))}
            </div>
          )}
        </motion.div>

        {/* Upcoming */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }} className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg text-gray-900 dark:text-white">
              Upcoming Appointments
            </h2>
            <Link to="/doctor/appointments"
              className="text-brand-600 dark:text-brand-400 text-sm font-medium hover:underline">
              View all
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
            </div>
          ) : upcoming.length === 0 ? (
            <div className="text-center py-8">
              <Calendar size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">No upcoming appointments</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.slice(0, 5).map(appt => (
                <div key={appt.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => viewDetail(appt.id)}>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{appt.patient_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {format(new Date(appt.scheduled_at), "MMM d · hh:mm a")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={URGENCY_BADGE[appt.urgency] || "badge-routine"}>{appt.urgency}</span>
                    <ChevronRight size={14} className="text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
