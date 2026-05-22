import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, User, FileText, AlertTriangle, Activity,
  Clock, Stethoscope, Download, CheckCircle, ChevronDown
} from "lucide-react";
import api from "../utils/api";
import { format } from "date-fns";
import toast from "react-hot-toast";

const URGENCY_BADGE = {
  emergency: "badge-emergency",
  urgent:    "badge-urgent",
  routine:   "badge-routine",
};

function Section({ title, icon: Icon, children, delay = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
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
      <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0 w-40">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-white text-right">{value || "—"}</span>
    </div>
  );
}

function SeverityBar({ value }) {
  const pct   = (value / 10) * 100;
  const color = value >= 8 ? "bg-red-500" : value >= 5 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="mt-1">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>1 — Minimal</span>
        <span className="font-bold text-gray-700 dark:text-gray-300">{value}/10</span>
        <span>10 — Unbearable</span>
      </div>
      <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
          className={`h-full ${color} rounded-full`} />
      </div>
    </div>
  );
}

export default function DoctorAppointmentDetail() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [notes,    setNotes]    = useState("");
  const [saving,   setSaving]   = useState(false);
  const [showJSON, setShowJSON] = useState(false);

  useEffect(() => {
    api.get(`/doctor/appointments/${id}/detail`)
      .then(r => { setData(r.data); setNotes(r.data.appointment?.notes || ""); })
      .catch(() => toast.error("Failed to load appointment"))
      .finally(() => setLoading(false));
  }, [id]);

  async function saveNotes() {
    setSaving(true);
    try {
      await api.put(`/doctor/appointments/${id}/notes`, { notes });
      toast.success("Notes saved & appointment marked complete");
    } catch { toast.error("Failed to save notes"); }
    finally { setSaving(false); }
  }

  async function downloadReport() {
    const path = data?.pre_screening?.report_path;
    if (!path) return toast.error("No report available");
    const filename = path.split(/[\\/]/).pop();
    window.open(`/report/download/${filename}`, "_blank");
  }

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!data) return (
    <div className="p-8 text-center text-gray-500">Appointment not found.</div>
  );

  const { appointment, patient, pre_screening } = data;
  const symptoms = [
    ...(pre_screening?.summary?.symptoms || []),
    ...(pre_screening?.summary?.associated_symptoms || []),
  ];
  const redFlags = (pre_screening?.summary?.red_flags || []).filter(f => f !== "none");

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-xl border border-gray-200 dark:border-gray-700
                     flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="font-display font-bold text-2xl text-gray-900 dark:text-white">
            Patient Detail
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Appointment #{id} · {format(new Date(appointment.scheduled_at), "MMM d, yyyy · hh:mm a")}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className={URGENCY_BADGE[appointment.urgency] || "badge-routine"}>
            {appointment.urgency}
          </span>
          {pre_screening?.is_report_generated && (
            <button onClick={downloadReport}
              className="btn-primary flex items-center gap-2 text-sm">
              <Download size={16} /> Download PDF
            </button>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          {/* Patient info */}
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
            <InfoRow label="Age"              value={patient.age ? `${patient.age} years` : null} />
            <InfoRow label="Gender"           value={patient.gender} />
            <InfoRow label="Phone"            value={patient.phone} />
            <InfoRow label="Blood Group"      value={patient.blood_group} />
            <InfoRow label="Allergies"        value={patient.allergies} />
            <InfoRow label="Chronic Conditions" value={patient.chronic_conditions} />
            <InfoRow label="Emergency Contact" value={patient.emergency_contact} />
          </Section>

          {/* Appointment info */}
          <Section title="Appointment" icon={Clock} delay={0.2}>
            <InfoRow label="Date & Time"  value={format(new Date(appointment.scheduled_at), "MMM d, yyyy · hh:mm a")} />
            <InfoRow label="Duration"     value={`${appointment.duration_minutes} minutes`} />
            <InfoRow label="Status"       value={appointment.status} />
            <InfoRow label="Urgency"      value={appointment.urgency} />
          </Section>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pre-screening summary */}
          {pre_screening ? (
            <>
              <Section title="Pre-Screening Summary" icon={Activity} delay={0.2}>
                <InfoRow label="Chief Complaint" value={pre_screening.chief_complaint} />
                <InfoRow label="Duration"        value={pre_screening.summary?.duration} />
                <div className="py-2.5 border-b border-gray-50 dark:border-gray-800/50">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Severity</p>
                  <SeverityBar value={pre_screening.severity || 0} />
                </div>
                <InfoRow label="Recommended Specialist" value={pre_screening.recommended_specialist} />

                {/* Symptoms */}
                {symptoms.length > 0 && (
                  <div className="pt-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Reported Symptoms</p>
                    <div className="flex flex-wrap gap-2">
                      {symptoms.map((s, i) => (
                        <span key={i} className="px-3 py-1 bg-brand-50 dark:bg-brand-950/50
                                                  text-brand-700 dark:text-brand-400
                                                  border border-brand-100 dark:border-brand-900/50
                                                  rounded-full text-xs font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Red flags */}
                {redFlags.length > 0 && (
                  <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/30
                                  border border-red-200 dark:border-red-800/50 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle size={16} className="text-red-500" />
                      <p className="text-sm font-bold text-red-600 dark:text-red-400">Red Flags</p>
                    </div>
                    {redFlags.map((f, i) => (
                      <p key={i} className="text-sm text-red-600 dark:text-red-400">• {f}</p>
                    ))}
                  </div>
                )}
              </Section>

              {/* Specialist Classification */}
              {pre_screening.classification && (
                <Section title="AI Classification" icon={Stethoscope} delay={0.3}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white text-lg">
                        🩺 {pre_screening.classification.primary_specialist}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {pre_screening.classification.primary_description}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-display font-bold text-brand-600 dark:text-brand-400">
                        {Math.round((pre_screening.classification.primary_confidence || 0) * 100)}%
                      </p>
                      <p className="text-xs text-gray-500">confidence</p>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl mb-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {pre_screening.classification.reasoning}
                    </p>
                  </div>

                  <InfoRow label="See within"        value={pre_screening.classification.see_doctor_within} />
                  <InfoRow label="Secondary referral" value={pre_screening.classification.secondary_specialist} />

                  {/* Raw JSON toggle */}
                  <button onClick={() => setShowJSON(s => !s)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mt-3">
                    <ChevronDown size={14} className={`transition-transform ${showJSON ? "rotate-180" : ""}`} />
                    {showJSON ? "Hide" : "Show"} raw classification data
                  </button>
                  {showJSON && (
                    <pre className="mt-2 p-3 bg-gray-900 text-green-400 rounded-xl text-xs overflow-auto max-h-48 font-mono">
                      {JSON.stringify(pre_screening.classification, null, 2)}
                    </pre>
                  )}
                </Section>
              )}
            </>
          ) : (
            <div className="card p-8 text-center">
              <FileText size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-gray-500 dark:text-gray-400">No pre-screening data available</p>
            </div>
          )}

          {/* Doctor Notes */}
          <Section title="Doctor's Notes" icon={FileText} delay={0.4}>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Notes are saved when you mark the appointment complete.
            </p>
            <textarea
              value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Enter your clinical observations, diagnosis, and treatment plan..."
              rows={6}
              className="input resize-none font-mono text-sm"
            />
            <div className="flex items-center gap-3 mt-3">
              <button onClick={saveNotes} disabled={saving}
                className="btn-primary flex items-center gap-2">
                {saving
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <CheckCircle size={16} />
                }
                {saving ? "Saving..." : "Save & Complete"}
              </button>
              {appointment.status === "completed" && (
                <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                  ✓ Appointment completed
                </span>
              )}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
