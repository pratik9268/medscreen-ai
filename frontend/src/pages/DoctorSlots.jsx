import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Clock, CheckCircle } from "lucide-react";
import api from "../utils/api";
import toast from "react-hot-toast";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const TIMES = Array.from({ length: 27 }, (_, i) => {
  const h = Math.floor(i / 2) + 7;
  const m = i % 2 === 0 ? "00" : "30";
  const hour = h > 12 ? h - 12 : h;
  const ampm = h >= 12 ? "PM" : "AM";
  return { value: `${String(h).padStart(2, "0")}:${m}`, label: `${hour}:${m} ${ampm}` };
});

export default function DoctorSlots() {
  const [slots,   setSlots]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding,  setAdding]  = useState(false);
  const [form,    setForm]    = useState({ day_of_week: 0, start_time: "09:00", end_time: "17:00" });

  const fetchSlots = () => {
    api.get("/doctor/slots")
      .then(r => setSlots(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSlots(); }, []);

  async function addSlot() {
    if (form.start_time >= form.end_time) return toast.error("End time must be after start time");
    setAdding(true);
    try {
      await api.post("/doctor/slots", { ...form, day_of_week: Number(form.day_of_week) });
      toast.success("Time slot added");
      fetchSlots();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to add slot");
    } finally { setAdding(false); }
  }

  async function removeSlot(id) {
    try {
      await api.delete(`/doctor/slots/${id}`);
      toast.success("Slot removed");
      setSlots(s => s.filter(sl => sl.id !== id));
    } catch { toast.error("Failed to remove slot"); }
  }

  // Group by day
  const byDay = DAYS.map((day, idx) => ({
    day, idx,
    slots: slots.filter(s => s.day_of_week === idx),
  }));

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-display font-bold text-3xl text-gray-900 dark:text-white">My Schedule</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Set your available time windows. Appointment slots are generated automatically.
        </p>
      </motion.div>

      {/* Add slot form */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }} className="card p-6 mb-8">
        <h2 className="font-display font-bold text-lg text-gray-900 dark:text-white mb-4">
          Add Availability Window
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Day</label>
            <select value={form.day_of_week}
              onChange={e => setForm(f => ({ ...f, day_of_week: e.target.value }))}
              className="input">
              {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">From</label>
            <select value={form.start_time}
              onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
              className="input">
              {TIMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">To</label>
            <select value={form.end_time}
              onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
              className="input">
              {TIMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={addSlot} disabled={adding}
              className="btn-primary w-full flex items-center justify-center gap-2">
              {adding
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Plus size={18} />}
              Add Slot
            </button>
          </div>
        </div>
      </motion.div>

      {/* Weekly view */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }} className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))
        ) : (
          byDay.map(({ day, idx, slots: daySlots }) => (
            <div key={idx}
              className={`card p-4 ${daySlots.length === 0 ? "opacity-50" : ""}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${daySlots.length > 0 ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"}`} />
                  <span className="font-semibold text-gray-900 dark:text-white w-28">{day}</span>
                  {daySlots.length === 0 && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">Not available</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  <AnimatePresence>
                    {daySlots.map(slot => (
                      <motion.div key={slot.id}
                        initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-2 px-3 py-1.5
                                   bg-brand-50 dark:bg-brand-950/50
                                   border border-brand-200 dark:border-brand-800/50
                                   rounded-xl text-sm">
                        <Clock size={12} className="text-brand-500" />
                        <span className="text-brand-700 dark:text-brand-300 font-medium">
                          {slot.start_time} – {slot.end_time}
                        </span>
                        <button onClick={() => removeSlot(slot.id)}
                          className="text-red-400 hover:text-red-600 transition-colors ml-1">
                          <Trash2 size={12} />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          ))
        )}
      </motion.div>

      {slots.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="mt-6 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle size={16} />
          {slots.length} availability window{slots.length !== 1 ? "s" : ""} set across the week
        </motion.div>
      )}
    </div>
  );
}
