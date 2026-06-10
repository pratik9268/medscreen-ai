import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, User, FileText, AlertTriangle, Activity,
  Clock, Stethoscope, Download, CheckCircle, ChevronDown,
  X, Eye, Calendar, ChevronLeft, ChevronRight
} from "lucide-react";
import api from "../utils/api";
import { format, addDays, startOfToday, parseISO } from "date-fns";
import toast from "react-hot-toast";

const URGENCY_BADGE = {
  emergency: "badge-emergency",
  urgent:    "badge-urgent",
  routine:   "badge-routine",
};

const STATUS_COLOR = {
  confirmed: "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700",
  pending:   "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700",
  completed: "bg-gray-100 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700",
  cancelled: "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 border-red-200 dark:border-red-700",
};

function Section({ title, icon: Icon, children, delay=0 }) {
  return (
    <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
      transition={{ delay }} className="card p-6">
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100 dark:border-gray-800">
        <Icon size={18} className="text-brand-500" />
        <h3 className="font-display font-bold text-gray-900 dark:text-white">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-start py-2.5 border-b border-gray-50 dark:border-gray-800/50 last:border-0">
      <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0 w-44">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-white text-right">{value||"—"}</span>
    </div>
  );
}

function SeverityBar({ value }) {
  const pct   = (value/10)*100;
  const color = value>=8 ? "bg-red-500" : value>=5 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="mt-1">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>1 — Minimal</span>
        <span className="font-bold text-gray-700 dark:text-gray-300">{value}/10</span>
        <span>10 — Unbearable</span>
      </div>
      <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <motion.div initial={{ width:0 }} animate={{ width:`${pct}%` }}
          transition={{ delay:0.5, duration:0.8, ease:"easeOut" }}
          className={`h-full ${color} rounded-full`} />
      </div>
    </div>
  );
}

// ── PDF Viewer Modal — uses iframe with inline=true header ───────────────────
function PDFViewerModal({ filename, onClose }) {
  // ?inline=true tells FastAPI to serve with Content-Disposition: inline
  // so Chrome renders it inside the iframe instead of downloading
  const viewUrl     = `/api/report/download/${filename}?inline=true`;
  const downloadUrl = `/api/report/download/${filename}`;

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      className="fixed inset-0 bg-black/80 z-50 flex flex-col"
      onClick={onClose}>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-900 shrink-0 border-b border-gray-700"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <FileText size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white font-medium text-sm">{filename}</p>
            <p className="text-gray-400 text-xs">Pre-Screening Report</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a href={downloadUrl} download={filename}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700
                       text-white text-sm font-medium rounded-xl transition-colors"
            onClick={e => e.stopPropagation()}>
            <Download size={15} /> Download
          </a>
          <button onClick={onClose}
            className="w-9 h-9 rounded-xl bg-gray-700 hover:bg-gray-600
                       flex items-center justify-center text-gray-300 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* PDF iframe — inline=true prevents Chrome from downloading */}
      <div className="flex-1 overflow-hidden" onClick={e => e.stopPropagation()}>
        <iframe
          src={viewUrl}
          className="w-full h-full border-0 bg-white"
          title="Pre-Screening Report"
          style={{ minHeight: "100%" }}
        />
      </div>
    </motion.div>
  );
}

// ── Reschedule Modal with Doctor Schedule View ────────────────────────────────
function RescheduleModal({ appointmentId, doctorId, currentDateTime, duration, onClose, onRescheduled }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [weekOffset,   setWeekOffset]   = useState(0);
  const [slots,        setSlots]        = useState([]);
  const [booked,       setBooked]       = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedTime, setSelectedTime] = useState(null);
  const [saving,       setSaving]       = useState(false);

  const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const today = startOfToday();

  // Generate 7 days for current week view
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(today, weekOffset * 7 + i);
    return {
      date:      d,
      dateStr:   format(d, "yyyy-MM-dd"),
      label:     DAYS[i],
      dayNum:    format(d, "d"),
      monthStr:  format(d, "MMM"),
      isPast:    d < today,
    };
  });

  // Load slots when date selected
  useEffect(() => {
    if (!selectedDate) return;
    setSlotsLoading(true);
    setSelectedTime(null);

    Promise.all([
      api.post("/appointments/available-slots", {
        doctor_id: doctorId,
        date:      selectedDate,
        urgency:   "routine",
        severity:  5,
      }),
      // Get all appointments for this doctor on this day
      api.get(`/doctor/appointments/upcoming`),
    ]).then(([slotsRes, apptRes]) => {
      setSlots(slotsRes.data.available_slots || []);
      // Filter appointments for selected date
      const dayAppts = (apptRes.data || []).filter(a => {
        const apptDate = format(new Date(a.scheduled_at), "yyyy-MM-dd");
        return apptDate === selectedDate && a.id !== appointmentId;
      });
      setBooked(dayAppts);
    }).catch(() => {
      setSlots([]);
      toast.error("Could not load schedule");
    }).finally(() => setSlotsLoading(false));
  }, [selectedDate]);

  async function confirmReschedule() {
    if (!selectedDate || !selectedTime) return toast.error("Select a date and time slot");
    setSaving(true);
    try {
      await api.put(`/doctor/appointments/${appointmentId}/reschedule`, {
        scheduled_at: `${selectedDate}T${selectedTime}:00`,
      });
      toast.success("Appointment rescheduled successfully");
      onRescheduled(`${selectedDate}T${selectedTime}:00`);
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Reschedule failed");
    } finally {
      setSaving(false);
    }
  }

  // Generate time grid 8am–6pm in 30min slots
  const TIME_SLOTS = Array.from({ length: 20 }, (_, i) => {
    const h = Math.floor(i/2) + 8;
    const m = i % 2 === 0 ? "00" : "30";
    return `${String(h).padStart(2,"0")}:${m}`;
  });

  function getSlotStatus(timeStr) {
    // Is it in available slots from doctor's schedule?
    const isAvailable = slots.some(s => {
      const slotTime = format(new Date(s.start), "HH:mm");
      return slotTime === timeStr;
    });
    // Is it already booked?
    const isBooked = booked.some(a => {
      const apptTime = format(new Date(a.scheduled_at), "HH:mm");
      return apptTime === timeStr;
    });

    if (isBooked)    return "booked";
    if (isAvailable) return "available";
    return "unavailable";
  }

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <motion.div initial={{ scale:0.95, opacity:0 }} animate={{ scale:1, opacity:1 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div>
            <h3 className="font-display font-bold text-xl text-gray-900 dark:text-white">
              Reschedule Appointment
            </h3>
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-0.5">
              Current: {format(new Date(currentDateTime), "MMM d, yyyy · hh:mm a")}
            </p>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-700
                       flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Week navigation */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Select Date</h4>
              <div className="flex items-center gap-2">
                <button onClick={() => setWeekOffset(w => Math.max(0, w-1))}
                  disabled={weekOffset === 0}
                  className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700
                             flex items-center justify-center disabled:opacity-40
                             hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400 w-24 text-center">
                  {format(addDays(today, weekOffset*7), "MMM d")} –{" "}
                  {format(addDays(today, weekOffset*7+6), "d")}
                </span>
                <button onClick={() => setWeekOffset(w => w+1)}
                  className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700
                             flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Day picker */}
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map(d => (
                <button key={d.dateStr}
                  onClick={() => !d.isPast && setSelectedDate(d.dateStr)}
                  disabled={d.isPast}
                  className={`flex flex-col items-center py-3 rounded-xl border-2 transition-all
                    ${d.isPast ? "opacity-30 cursor-not-allowed border-gray-100 dark:border-gray-800"
                      : selectedDate === d.dateStr
                        ? "border-brand-500 bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-400"
                        : "border-gray-200 dark:border-gray-700 hover:border-brand-300 text-gray-600 dark:text-gray-400"
                    }`}>
                  <span className="text-xs font-medium">{d.label}</span>
                  <span className="text-lg font-bold mt-0.5">{d.dayNum}</span>
                  <span className="text-xs opacity-60">{d.monthStr}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Time grid */}
          {selectedDate && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                  Schedule for {format(new Date(selectedDate), "EEEE, MMM d")}
                </h4>
                {/* Legend */}
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-emerald-200 dark:bg-emerald-800 inline-block" />
                    Available
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-red-200 dark:bg-red-800 inline-block" />
                    Booked
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-gray-100 dark:bg-gray-800 inline-block" />
                    Unavailable
                  </span>
                </div>
              </div>

              {slotsLoading ? (
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({length:12}).map((_,i) => (
                    <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {TIME_SLOTS.map(time => {
                    const status  = getSlotStatus(time);
                    const h       = parseInt(time.split(":")[0]);
                    const m       = time.split(":")[1];
                    const label   = `${h>12?h-12:h}:${m} ${h>=12?"PM":"AM"}`;
                    const bookedAppt = booked.find(a => format(new Date(a.scheduled_at), "HH:mm") === time);

                    return (
                      <button key={time}
                        onClick={() => status === "available" && setSelectedTime(time)}
                        disabled={status !== "available"}
                        title={
                          status === "booked"      ? `Booked: ${bookedAppt?.patient_name||"Patient"}`
                          : status === "unavailable" ? "Outside working hours"
                          : "Click to select"
                        }
                        className={`relative py-3 px-2 rounded-xl border-2 text-xs font-medium
                                    transition-all duration-150 text-center
                          ${status === "available" && selectedTime === time
                            ? "border-brand-500 bg-brand-600 text-white shadow-lg shadow-brand-200 dark:shadow-brand-900"
                            : status === "available"
                              ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 hover:border-brand-400 hover:bg-brand-50 cursor-pointer"
                              : status === "booked"
                                ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 text-red-500 cursor-not-allowed"
                                : "border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-gray-300 dark:text-gray-700 cursor-not-allowed"
                          }`}>
                        {label}
                        {status === "booked" && (
                          <span className="block text-xs opacity-70 truncate mt-0.5">
                            {bookedAppt?.patient_name?.split(" ")[0] || "Booked"}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {slots.length === 0 && !slotsLoading && (
                <div className="text-center py-4 text-gray-400 text-sm">
                  No available slots on this day — doctor may not be working.
                </div>
              )}
            </div>
          )}

          {/* Selected summary */}
          {selectedDate && selectedTime && (
            <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
              className="p-4 bg-brand-50 dark:bg-brand-950 border border-brand-200 dark:border-brand-800 rounded-xl">
              <p className="text-sm font-medium text-brand-700 dark:text-brand-400">
                ✓ New appointment: {format(new Date(selectedDate), "EEEE, MMM d, yyyy")} at{" "}
                {(() => {
                  const h = parseInt(selectedTime.split(":")[0]);
                  const m = selectedTime.split(":")[1];
                  return `${h>12?h-12:h}:${m} ${h>=12?"PM":"AM"}`;
                })()}
              </p>
              <p className="text-xs text-brand-500 mt-0.5">Duration: {duration} minutes</p>
            </motion.div>
          )}

          {/* Confirm button */}
          <button onClick={confirmReschedule}
            disabled={!selectedDate || !selectedTime || saving}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3">
            {saving
              ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Calendar size={18} />}
            {saving ? "Rescheduling..." : "Confirm Reschedule"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function DoctorAppointmentDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const [data,           setData]           = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [notes,          setNotes]          = useState("");
  const [saving,         setSaving]         = useState(false);
  const [showJSON,       setShowJSON]       = useState(false);
  const [pdfModal,       setPdfModal]       = useState(false);
  const [rescheduleModal,setRescheduleModal]= useState(false);
  const [pdfFilename,    setPdfFilename]    = useState(null);

  useEffect(() => {
    api.get(`/doctor/appointments/${id}/detail`)
      .then(r => {
        setData(r.data);
        setNotes(r.data.appointment?.notes||"");
        if (r.data.pre_screening?.report_path) {
          const fname = r.data.pre_screening.report_path.split(/[\\/]/).pop();
          setPdfFilename(fname);
        }
      })
      .catch(() => toast.error("Failed to load appointment"))
      .finally(() => setLoading(false));
  }, [id]);

  async function saveNotes() {
    setSaving(true);
    try {
      await api.put(`/doctor/appointments/${id}/notes`, { notes });
      toast.success("Notes saved & appointment marked complete");
      setData(prev => ({ ...prev, appointment: { ...prev.appointment, status:"completed" } }));
    } catch { toast.error("Failed to save notes"); }
    finally  { setSaving(false); }
  }

  function handleRescheduled(newDateTime) {
    setData(prev => ({
      ...prev,
      appointment: { ...prev.appointment, scheduled_at: newDateTime, status: "confirmed" }
    }));
    toast.success("Schedule updated!");
  }

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!data) return <div className="p-8 text-center text-gray-500">Appointment not found.</div>;

  const { appointment, patient, pre_screening } = data;
  const symptoms  = [...(pre_screening?.summary?.symptoms||[]), ...(pre_screening?.summary?.associated_symptoms||[])];
  const redFlags  = (pre_screening?.summary?.red_flags||[]).filter(f => f && f.toLowerCase()!=="none");

  return (
    <>
      <div className="p-8 max-w-5xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
          className="flex items-center gap-4 mb-8 flex-wrap">
          <button onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl border border-gray-200 dark:border-gray-700
                       flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="font-display font-bold text-2xl text-gray-900 dark:text-white">Patient Detail</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Appointment #{id} · {format(new Date(appointment.scheduled_at), "MMM d, yyyy · hh:mm a")}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 flex-wrap justify-end">
            <span className={URGENCY_BADGE[appointment.urgency]||"badge-routine"}>
              {appointment.urgency}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${STATUS_COLOR[appointment.status]||""}`}>
              {appointment.status}
            </span>

            {["confirmed","pending"].includes(appointment.status) && (
              <button onClick={() => setRescheduleModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border
                           border-amber-300 dark:border-amber-700
                           text-amber-700 dark:text-amber-400
                           hover:bg-amber-50 dark:hover:bg-amber-950
                           text-sm font-medium transition-colors">
                <Calendar size={15} /> Reschedule
              </button>
            )}

            {pdfFilename && (
              <>
                <button onClick={() => setPdfModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border
                             border-brand-200 dark:border-brand-700
                             text-brand-700 dark:text-brand-400
                             hover:bg-brand-50 dark:hover:bg-brand-950
                             text-sm font-medium transition-colors">
                  <Eye size={15} /> View PDF
                </button>
                <a href={`/api/report/download/${pdfFilename}`}
                  download={pdfFilename}
                  className="btn-primary flex items-center gap-2 text-sm">
                  <Download size={15} /> Download
                </a>
              </>
            )}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left */}
          <div className="space-y-6">
            <Section title="Patient Information" icon={User} delay={0.1}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600
                                flex items-center justify-center text-white font-bold text-lg">
                  {patient.full_name?.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">{patient.full_name}</p>
                  <p className="text-xs text-gray-500">{patient.email}</p>
                </div>
              </div>
              <InfoRow label="Age"                value={patient.age ? `${patient.age} yrs` : null} />
              <InfoRow label="Gender"             value={patient.gender} />
              <InfoRow label="Phone"              value={patient.phone} />
              <InfoRow label="Blood Group"        value={patient.blood_group} />
              <InfoRow label="Allergies"          value={patient.allergies} />
              <InfoRow label="Chronic Conditions" value={patient.chronic_conditions} />
              <InfoRow label="Emergency Contact"  value={patient.emergency_contact} />
            </Section>

            <Section title="Appointment" icon={Clock} delay={0.2}>
              <InfoRow label="Date & Time" value={format(new Date(appointment.scheduled_at), "MMM d, yyyy · hh:mm a")} />
              <InfoRow label="Duration"    value={`${appointment.duration_minutes} min`} />
              <InfoRow label="Status"      value={appointment.status} />
              <InfoRow label="Urgency"     value={appointment.urgency} />
            </Section>
          </div>

          {/* Right */}
          <div className="lg:col-span-2 space-y-6">
            {pre_screening ? (
              <>
                <Section title="Pre-Screening Summary" icon={Activity} delay={0.2}>
                  <InfoRow label="Chief Complaint"       value={pre_screening.chief_complaint} />
                  <InfoRow label="Duration"              value={pre_screening.summary?.duration} />
                  <div className="py-2.5 border-b border-gray-50 dark:border-gray-800/50">
                    <p className="text-sm text-gray-500 mb-2">Severity</p>
                    <SeverityBar value={pre_screening.severity||0} />
                  </div>
                  <InfoRow label="Recommended Specialist" value={pre_screening.recommended_specialist} />
                  {symptoms.length > 0 && (
                    <div className="pt-2">
                      <p className="text-sm text-gray-500 mb-2">Symptoms</p>
                      <div className="flex flex-wrap gap-2">
                        {symptoms.map((s,i) => (
                          <span key={i} className="px-3 py-1 bg-brand-50 dark:bg-brand-950
                                                    text-brand-700 dark:text-brand-400
                                                    border border-brand-100 dark:border-brand-900
                                                    rounded-full text-xs font-medium">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {redFlags.length > 0 && (
                    <div className="mt-4 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle size={16} className="text-red-500" />
                        <p className="text-sm font-bold text-red-600 dark:text-red-400">Red Flags</p>
                      </div>
                      {redFlags.map((f,i) => <p key={i} className="text-sm text-red-600 dark:text-red-400">• {f}</p>)}
                    </div>
                  )}
                </Section>

                {pre_screening.classification && (
                  <Section title="AI Classification" icon={Stethoscope} delay={0.3}>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white text-lg">
                          🩺 {pre_screening.classification.primary_specialist}
                        </p>
                        <p className="text-sm text-gray-500">{pre_screening.classification.primary_description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-display font-bold text-brand-600 dark:text-brand-400">
                          {Math.round((pre_screening.classification.primary_confidence||0)*100)}%
                        </p>
                        <p className="text-xs text-gray-500">confidence</p>
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl mb-3">
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {pre_screening.classification.reasoning}
                      </p>
                    </div>
                    <InfoRow label="See within"         value={pre_screening.classification.see_doctor_within} />
                    <InfoRow label="Secondary referral" value={pre_screening.classification.secondary_specialist} />
                    <button onClick={() => setShowJSON(s=>!s)}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mt-3">
                      <ChevronDown size={14} className={`transition-transform ${showJSON?"rotate-180":""}`} />
                      {showJSON?"Hide":"Show"} raw data
                    </button>
                    {showJSON && (
                      <pre className="mt-2 p-3 bg-gray-900 text-green-400 rounded-xl text-xs overflow-auto max-h-48 font-mono">
                        {JSON.stringify(pre_screening.classification, null, 2)}
                      </pre>
                    )}
                  </Section>
                )}

                {/* PDF Report */}
                <Section title="Pre-Screening Report" icon={FileText} delay={0.35}>
                  {pdfFilename ? (
                    <div className="flex items-center justify-between p-4
                                    bg-emerald-50 dark:bg-emerald-950
                                    border border-emerald-200 dark:border-emerald-800 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                          <FileText size={18} className="text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-sm">PDF Report Available</p>
                          <p className="text-xs text-gray-500 font-mono">{pdfFilename}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setPdfModal(true)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium
                                     border border-brand-200 dark:border-brand-700
                                     text-brand-700 dark:text-brand-400
                                     hover:bg-brand-50 dark:hover:bg-brand-950 transition-colors">
                          <Eye size={14} /> View
                        </button>
                        <a href={`/api/report/download/${pdfFilename}`}
                          download={pdfFilename}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium
                                     bg-brand-600 hover:bg-brand-700 text-white transition-colors">
                          <Download size={14} /> Download
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-400">
                      <FileText size={28} className="mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No PDF report for this screening</p>
                    </div>
                  )}
                </Section>
              </>
            ) : (
              <div className="card p-8 text-center">
                <FileText size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500">No pre-screening data available</p>
              </div>
            )}

            {/* Doctor Notes */}
            <Section title="Doctor's Notes" icon={FileText} delay={0.4}>
              <p className="text-xs text-gray-500 mb-3">Saved when you mark the appointment complete.</p>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Enter clinical observations, diagnosis, and treatment plan..."
                rows={5} className="input resize-none font-mono text-sm" />
              <div className="flex items-center gap-3 mt-3">
                <button onClick={saveNotes} disabled={saving}
                  className="btn-primary flex items-center gap-2">
                  {saving
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <CheckCircle size={16} />}
                  {saving ? "Saving..." : "Save & Complete"}
                </button>
                {appointment.status==="completed" && (
                  <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">✓ Completed</span>
                )}
              </div>
            </Section>
          </div>
        </div>
      </div>

      {/* PDF Viewer Modal */}
      <AnimatePresence>
        {pdfModal && pdfFilename && (
          <PDFViewerModal
            filename={pdfFilename}
            onClose={() => setPdfModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Reschedule Modal */}
      <AnimatePresence>
        {rescheduleModal && (
          <RescheduleModal
            appointmentId={Number(id)}
            doctorId={data?.doctor?.id || appointment?.doctor_id}
            currentDateTime={appointment.scheduled_at}
            duration={appointment.duration_minutes}
            onClose={() => setRescheduleModal(false)}
            onRescheduled={handleRescheduled}
          />
        )}
      </AnimatePresence>
    </>
  );
}