import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Clock, CheckCircle } from "lucide-react";
import api from "../utils/api";
import { format, addDays, startOfToday } from "date-fns";
import toast from "react-hot-toast";

export default function BookAppointment() {
  const { doctorId }      = useParams();
  const [searchParams]    = useSearchParams();
  const screeningId       = searchParams.get("screening");
  const navigate          = useNavigate();

  const [doctor,    setDoctor]    = useState(null);
  const [date,      setDate]      = useState(format(addDays(startOfToday(), 1), "yyyy-MM-dd"));
  const [slots,     setSlots]     = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [screening, setScreening] = useState(null);

  useEffect(() => {
    // Load doctor info and screening info
    api.get("/admin/doctors").then(r => {
      const d = (r.data || []).find(d => d.id === Number(doctorId));
      setDoctor(d);
    });
    if (screeningId) {
      api.get(`/screening/${screeningId}`).then(r => setScreening(r.data)).catch(() => {});
    }
  }, [doctorId, screeningId]);

  useEffect(() => {
    if (!doctorId || !date) return;
    setSlotsLoading(true);
    api.post("/appointments/available-slots", {
      doctor_id: Number(doctorId),
      date,
      urgency:  screening?.urgency  || "routine",
      severity: screening?.severity || 5,
    })
      .then(r => { setSlots(r.data.available_slots || []); setSelected(null); })
      .catch(() => toast.error("Could not load slots"))
      .finally(() => setSlotsLoading(false));
  }, [doctorId, date, screening]);

  async function book() {
    if (!selected) return toast.error("Please select a time slot");
    setLoading(true);
    try {
      await api.post("/appointments/book", {
        doctor_id:        Number(doctorId),
        scheduled_at:     selected,
        pre_screening_id: screeningId ? Number(screeningId) : null,
      });
      toast.success("Appointment booked successfully!");
      navigate("/patient/appointments");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Booking failed");
    } finally {
      setLoading(false);
    }
  }

  // Generate next 7 days for date picker
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(startOfToday(), i + 1);
    return { value: format(d, "yyyy-MM-dd"), label: format(d, "EEE"), day: format(d, "d") };
  });

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-xl border border-gray-200 dark:border-gray-700
                     flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="font-display font-bold text-2xl text-gray-900 dark:text-white">Book Appointment</h1>
          {doctor && <p className="text-gray-500 text-sm">{doctor.full_name} · {doctor.specialty}</p>}
        </div>
      </motion.div>

      {/* Screening context */}
      {screening && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="card p-4 mb-6 bg-brand-50 dark:bg-brand-950 border-brand-200 dark:border-brand-800">
          <p className="text-sm font-medium text-brand-700 dark:text-brand-400">
            Booking based on pre-screening: <span className="font-bold">{screening.chief_complaint}</span>
          </p>
          <p className="text-xs text-brand-600 dark:text-brand-500 mt-1">
            Urgency: {screening.urgency} · Severity: {screening.severity}/10 ·
            Duration: {screening.recommended_duration_minutes}min appointment
          </p>
        </motion.div>
      )}

      {/* Date picker */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }} className="card p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={18} className="text-brand-500" />
          <h2 className="font-display font-bold text-gray-900 dark:text-white">Select Date</h2>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {dates.map(d => (
            <button key={d.value} onClick={() => setDate(d.value)}
              className={`flex flex-col items-center py-3 rounded-xl border-2 transition-all
                ${date === d.value
                  ? "border-brand-500 bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-400"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 text-gray-600 dark:text-gray-400"
                }`}>
              <span className="text-xs font-medium">{d.label}</span>
              <span className="text-lg font-bold mt-0.5">{d.day}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Time slots */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }} className="card p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={18} className="text-brand-500" />
          <h2 className="font-display font-bold text-gray-900 dark:text-white">Select Time</h2>
          {slots.length > 0 && (
            <span className="text-xs text-gray-500 ml-auto">
              {slots[0]?.duration_minutes}min slots
            </span>
          )}
        </div>

        {slotsLoading ? (
          <div className="grid grid-cols-4 gap-2">
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : slots.length === 0 ? (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
            No available slots on this day. Try another date.
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {slots.map((slot, i) => (
              <button key={i} onClick={() => setSelected(slot.start)}
                className={`py-2.5 rounded-xl text-sm font-medium border-2 transition-all
                  ${selected === slot.start
                    ? "border-brand-500 bg-brand-600 text-white"
                    : "border-gray-200 dark:border-gray-700 hover:border-brand-300 text-gray-700 dark:text-gray-300"
                  }`}>
                {slot.label}
              </button>
            ))}
          </div>
        )}
      </motion.div>

      {/* Book button */}
      <motion.button
        onClick={book} disabled={!selected || loading}
        whileTap={{ scale: 0.98 }}
        className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base">
        {loading
          ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          : <CheckCircle size={20} />
        }
        {loading ? "Booking..." : "Confirm Appointment"}
      </motion.button>
    </div>
  );
}
