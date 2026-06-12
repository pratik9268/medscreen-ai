import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, Clock, Users, ChevronRight, AlertTriangle, CheckCircle, Activity, Wifi } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import { format } from "date-fns";
import { useRealtimeAppointments } from "../hooks/useRealtimeAppointments";
import toast from "react-hot-toast";

const URGENCY_BADGE = {
  emergency: "badge-emergency",
  urgent:    "badge-urgent",
  routine:   "badge-routine",
};

function AppointmentRow({ appt, onView, isNew }) {
  return (
    <motion.div
      initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }}
      whileHover={{ x:2 }}
      className={`flex items-center justify-between p-4 rounded-xl
                  hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer
                  ${isNew ? "bg-brand-50 dark:bg-brand-950/30 ring-1 ring-brand-200 dark:ring-brand-800" : "bg-gray-50 dark:bg-gray-800/50"}`}
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
        {isNew && <span className="text-xs font-bold text-brand-600 dark:text-brand-400 animate-pulse">NEW</span>}
        <span className={URGENCY_BADGE[appt.urgency]||"badge-routine"}>{appt.urgency}</span>
        <ChevronRight size={16} className="text-gray-400" />
      </div>
    </motion.div>
  );
}

export default function DoctorDashboard() {
  const { user }                         = useAuth();
  const [today,    setToday]             = useState([]);
  const [upcoming, setUpcoming]          = useState([]);
  const [doctorId, setDoctorId]          = useState(null);
  const [loading,  setLoading]           = useState(true);
  const [newApptIds, setNewApptIds]      = useState(new Set());

  useEffect(() => {
    Promise.all([
      api.get("/doctor/appointments/today"),
      api.get("/doctor/appointments/upcoming"),
      api.get("/doctor/profile"),
    ]).then(([t, u, p]) => {
      setToday(t.data);
      setUpcoming(u.data);
      setDoctorId(p.data?.id || null);
    }).finally(() => setLoading(false));
  }, []);

  // Realtime — new appointments booked by patients
  const handleInsert = useCallback((newRow) => {
    // Refetch to get full appointment with patient info
    api.get("/doctor/appointments/upcoming").then(r => {
      setUpcoming(r.data);
      // Mark this appointment as new for highlight
      setNewApptIds(prev => new Set([...prev, newRow.id]));
      // Remove highlight after 10s
      setTimeout(() => {
        setNewApptIds(prev => { const s = new Set(prev); s.delete(newRow.id); return s; });
      }, 10000);
    });
    toast("📅 New appointment booked!", { icon:"🎉", duration:5000 });
  }, []);

  // Realtime — status updates (e.g. patient cancels)
  const handleUpdate = useCallback((newRow) => {
    setToday(prev => prev.map(a => a.id === newRow.id ? { ...a, status: newRow.status } : a));
    setUpcoming(prev => {
      if (newRow.status === "cancelled") {
        return prev.filter(a => a.id !== newRow.id);
      }
      return prev.map(a => a.id === newRow.id ? { ...a, status: newRow.status } : a);
    });
    if (newRow.status === "cancelled") {
      toast("❌ A patient cancelled their appointment", { duration: 4000 });
    }
  }, []);

  useRealtimeAppointments({
    role:     "doctor",
    entityId: doctorId,
    onInsert: handleInsert,
    onUpdate: handleUpdate,
  });

  const emergency = today.filter(a => a.urgency==="emergency").length;
  const urgent    = today.filter(a => a.urgency==="urgent").length;
  const viewDetail = id => window.open(`/doctor/appointments/${id}`, "_self");

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-3xl text-gray-900 dark:text-white">
              Dr. {user?.full_name?.replace(/^Dr\.?\s*/i,"")} 👨‍⚕️
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {format(new Date(), "EEEE, MMMM d yyyy")}
            </p>
          </div>
          {/* Live indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5
                          bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800
                          rounded-full text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <Wifi size={12} className="animate-pulse" />
            Live updates on
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon:Calendar,      label:"Today's Patients", value:today.length,    color:"bg-brand-500"  },
          { icon:AlertTriangle, label:"Emergency",        value:emergency,        color:"bg-red-500"    },
          { icon:Activity,      label:"Urgent",           value:urgent,           color:"bg-amber-500"  },
          { icon:Clock,         label:"Upcoming",         value:upcoming.length,  color:"bg-violet-500" },
        ].map((s,i) => {
          const Icon = s.icon;
          return (
            <motion.div key={i} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
              transition={{ delay:i*0.1 }} className="card p-6">
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
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
          transition={{ delay:0.3 }} className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg text-gray-900 dark:text-white">Today's Schedule</h2>
            <Link to="/doctor/today" className="text-brand-600 dark:text-brand-400 text-sm font-medium hover:underline">
              Full view
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
            </div>
          ) : today.length===0 ? (
            <div className="text-center py-8">
              <CheckCircle size={32} className="mx-auto text-emerald-400 mb-2" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">No appointments today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {today.map(appt => (
                <AppointmentRow key={appt.id} appt={appt} onView={viewDetail}
                  isNew={newApptIds.has(appt.id)} />
              ))}
            </div>
          )}
        </motion.div>

        {/* Upcoming */}
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
          transition={{ delay:0.4 }} className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg text-gray-900 dark:text-white">Upcoming</h2>
            <Link to="/doctor/appointments" className="text-brand-600 dark:text-brand-400 text-sm font-medium hover:underline">
              View all
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
            </div>
          ) : upcoming.length===0 ? (
            <div className="text-center py-8">
              <Calendar size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">No upcoming appointments</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.slice(0,5).map(appt => (
                <AppointmentRow key={appt.id} appt={appt} onView={viewDetail}
                  isNew={newApptIds.has(appt.id)} />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}