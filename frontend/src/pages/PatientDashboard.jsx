import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MessageSquare, Calendar, FileText, ArrowRight, Clock, AlertTriangle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import { format } from "date-fns";

const URGENCY_BADGE = {
  emergency: "badge-emergency",
  urgent:    "badge-urgent",
  routine:   "badge-routine",
};

const STATUS_COLOR = {
  confirmed: "text-emerald-600 dark:text-emerald-400",
  pending:   "text-amber-600 dark:text-amber-400",
  completed: "text-gray-400",
  cancelled: "text-red-400",
};

function StatCard({ icon: Icon, label, value, color, delay }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay }} className="card p-6">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-4`}>
        <Icon size={20} className="text-white" />
      </div>
      <p className="text-2xl font-display font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</p>
    </motion.div>
  );
}

export default function PatientDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [screenings,   setScreenings]   = useState([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/patient/appointments"),
      api.get("/patient/pre-screenings"),
    ]).then(([a, s]) => {
      setAppointments(a.data);
      setScreenings(s.data);
    }).finally(() => setLoading(false));
  }, []);

  const upcoming  = appointments.filter(a => ["confirmed","pending"].includes(a.status));
  const completed = appointments.filter(a => a.status === "completed");

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-display font-bold text-3xl text-gray-900 dark:text-white">
          Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"},
          {" "}{user?.full_name?.split(" ")[0]} 👋
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Here's your health overview</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Calendar}     label="Upcoming"    value={upcoming.length}      color="bg-brand-500"   delay={0.1} />
        <StatCard icon={FileText}     label="Screenings"  value={screenings.length}    color="bg-violet-500"  delay={0.2} />
        <StatCard icon={Clock}        label="Completed"   value={completed.length}     color="bg-emerald-500" delay={0.3} />
        <StatCard icon={AlertTriangle}label="Emergency"   value={screenings.filter(s => s.urgency === "emergency").length} color="bg-red-500" delay={0.4} />
      </div>

      {/* Quick actions */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          {
            to: "/patient/chat", icon: MessageSquare,
            title: "Start Pre-Screening",
            desc: "Chat with AI to describe your symptoms",
            color: "from-brand-500 to-brand-700",
          },
          {
            to: "/patient/appointments", icon: Calendar,
            title: "View Appointments",
            desc: "See your upcoming scheduled visits",
            color: "from-violet-500 to-violet-700",
          },
          {
            to: "/patient/reports", icon: FileText,
            title: "My Reports",
            desc: "Download your pre-screening PDFs",
            color: "from-emerald-500 to-emerald-700",
          },
        ].map((item, i) => {
          const Icon = item.icon;
          return (
            <Link key={i} to={item.to}>
              <motion.div whileHover={{ y: -2, scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className={`bg-gradient-to-br ${item.color} rounded-2xl p-6 text-white cursor-pointer`}>
                <Icon size={24} className="mb-3 opacity-90" />
                <p className="font-semibold text-base">{item.title}</p>
                <p className="text-sm opacity-75 mt-1">{item.desc}</p>
                <ArrowRight size={16} className="mt-3 opacity-70" />
              </motion.div>
            </Link>
          );
        })}
      </motion.div>

      {/* Upcoming appointments */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }} className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg text-gray-900 dark:text-white">
            Upcoming Appointments
          </h2>
          <Link to="/patient/appointments" className="text-brand-600 dark:text-brand-400 text-sm font-medium hover:underline">
            View all
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
          </div>
        ) : upcoming.length === 0 ? (
          <div className="text-center py-8">
            <Calendar size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">No upcoming appointments</p>
            <Link to="/patient/chat" className="btn-primary inline-flex mt-3 text-sm">
              Start Pre-Screening
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.slice(0, 3).map(appt => (
              <div key={appt.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{appt.doctor_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{appt.doctor_specialty}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {format(new Date(appt.scheduled_at), "MMM d, yyyy")}
                  </p>
                  <p className="text-xs text-gray-500">{format(new Date(appt.scheduled_at), "hh:mm a")}</p>
                </div>
                <div className="ml-4">
                  <span className={`text-xs font-semibold ${STATUS_COLOR[appt.status]}`}>
                    {appt.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Recent screenings */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }} className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg text-gray-900 dark:text-white">
            Recent Pre-Screenings
          </h2>
          <Link to="/patient/reports" className="text-brand-600 dark:text-brand-400 text-sm font-medium hover:underline">
            View all
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
          </div>
        ) : screenings.length === 0 ? (
          <div className="text-center py-8">
            <FileText size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">No screenings yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {screenings.slice(0, 3).map(s => (
              <div key={s.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{s.chief_complaint}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {format(new Date(s.created_at), "MMM d, yyyy")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={URGENCY_BADGE[s.urgency] || "badge-routine"}>{s.urgency}</span>
                  {s.is_report_generated && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">PDF ✓</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
