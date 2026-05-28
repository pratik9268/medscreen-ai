import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Download, AlertTriangle, Clock, ChevronDown, ChevronUp, X } from "lucide-react";
import api from "../utils/api";
import { format } from "date-fns";
import toast from "react-hot-toast";

const URGENCY_BADGE = { emergency:"badge-emergency", urgent:"badge-urgent", routine:"badge-routine" };

function ScreeningDetail({ screening, onClose }) {
  const summary        = screening.summary        || {};
  const classification = screening.classification || {};
  const symptoms = [
    ...(summary.symptoms||[]),
    ...(summary.associated_symptoms||[]),
  ];
  const redFlags = (summary.red_flags||[]).filter(f => f!=="none"&&f!=="None"&&f);

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <motion.div initial={{ scale:0.9, opacity:0 }} animate={{ scale:1, opacity:1 }}
        exit={{ scale:0.9, opacity:0 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900">
          <div>
            <h2 className="font-display font-bold text-xl text-gray-900 dark:text-white">
              {summary.chief_complaint || "Pre-Screening Report"}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {format(new Date(screening.created_at), "MMM d, yyyy · hh:mm a")}
            </p>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-700
                       flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Overview */}
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Chief Complaint", summary.chief_complaint],
              ["Duration",        summary.duration],
              ["Severity",        `${screening.severity}/10`],
              ["Urgency",         screening.urgency],
              ["Specialist",      screening.recommended_specialist],
              ["Appt Duration",   `${screening.recommended_duration_minutes}min`],
            ].map(([k,v]) => (
              <div key={k} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">{k}</p>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">{v||"—"}</p>
              </div>
            ))}
          </div>

          {/* Symptoms */}
          {symptoms.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Reported Symptoms</p>
              <div className="flex flex-wrap gap-2">
                {symptoms.map((s,i) => (
                  <span key={i} className="px-3 py-1.5 bg-brand-50 dark:bg-brand-950
                                            text-brand-700 dark:text-brand-400
                                            border border-brand-200 dark:border-brand-800
                                            rounded-full text-xs font-medium">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Red flags */}
          {redFlags.length > 0 && (
            <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-red-500" />
                <p className="font-bold text-red-600 dark:text-red-400 text-sm">Red Flags</p>
              </div>
              {redFlags.map((f,i) => (
                <p key={i} className="text-sm text-red-600 dark:text-red-400">• {f}</p>
              ))}
            </div>
          )}

          {/* Clinical narrative */}
          {summary.patient_history_hints && summary.patient_history_hints !== "none" && (
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">History Notes</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
                {summary.patient_history_hints}
              </p>
            </div>
          )}

          {/* AI Classification */}
          {classification.primary_specialist && (
            <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-br from-brand-600 to-brand-800 p-4 text-white">
                <p className="text-xs text-brand-200 mb-1">AI Specialist Routing</p>
                <p className="font-display font-bold text-lg">🩺 {classification.primary_specialist}</p>
                <div className="flex justify-between items-center mt-2">
                  <p className="text-brand-200 text-xs">{classification.primary_description}</p>
                  <span className="text-white font-bold text-sm">
                    {Math.round((classification.primary_confidence||0)*100)}% confidence
                  </span>
                </div>
              </div>
              {classification.reasoning && (
                <div className="p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">{classification.reasoning}</p>
                  {classification.see_doctor_within && (
                    <p className="text-xs text-brand-600 dark:text-brand-400 font-medium mt-2">
                      ⏱ See doctor within: {classification.see_doctor_within}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function PatientReports() {
  const [screenings, setScreenings] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState(null);
  const [fullData,   setFullData]   = useState({});

  useEffect(() => {
    api.get("/patient/pre-screenings")
      .then(r => setScreenings(r.data||[]))
      .catch(() => toast.error("Failed to load reports"))
      .finally(() => setLoading(false));
  }, []);

  async function openDetail(s) {
    if (fullData[s.id]) { setSelected(fullData[s.id]); return; }
    try {
      const { data } = await api.get(`/screening/${s.id}`);
      setFullData(prev => ({ ...prev, [s.id]: data }));
      setSelected(data);
    } catch { toast.error("Could not load screening details"); }
  }

  async function downloadReport(s, e) {
    e.stopPropagation();
    if (!s.is_report_generated) {
      return toast.error("No PDF report yet. Complete a pre-screening chat to generate one.");
    }
    try {
      const detail = fullData[s.id] || (await api.get(`/screening/${s.id}`)).data;
      if (!detail.report_path) return toast.error("Report file not found");
      const filename = detail.report_path.split(/[\\/]/).pop();
      window.open(`/report/download/${filename}`, "_blank");
    } catch { toast.error("Could not download report"); }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} className="mb-8">
        <h1 className="font-display font-bold text-3xl text-gray-900 dark:text-white">My Reports</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Click any record to view full details · Download PDF reports
        </p>
      </motion.div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : screenings.length === 0 ? (
        <div className="text-center py-16 card p-12">
          <FileText size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 font-medium">No screening records yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Complete a pre-screening chat to see your records here
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {screenings.map((s,i) => (
            <motion.div key={s.id}
              initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
              transition={{ delay:i*0.05 }}
              onClick={() => openDetail(s)}
              className="card p-5 flex items-center justify-between cursor-pointer
                         hover:shadow-md hover:border-brand-200 dark:hover:border-brand-800
                         transition-all duration-200">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0
                  ${s.urgency==="emergency" ? "bg-red-100 dark:bg-red-900"
                    : s.urgency==="urgent"  ? "bg-amber-100 dark:bg-amber-900"
                    : "bg-emerald-100 dark:bg-emerald-900"}`}>
                  {s.urgency==="emergency"||s.urgency==="urgent"
                    ? <AlertTriangle size={20} className={s.urgency==="emergency" ? "text-red-600":"text-amber-600"} />
                    : <FileText size={20} className="text-emerald-600" />}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{s.chief_complaint}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Clock size={12} className="text-gray-400" />
                    <p className="text-xs text-gray-500">
                      {format(new Date(s.created_at), "MMM d, yyyy · hh:mm a")}
                    </p>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Severity {s.severity}/10 · {s.recommended_specialist}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className={URGENCY_BADGE[s.urgency]||"badge-routine"}>{s.urgency}</span>
                <button
                  onClick={e => downloadReport(s, e)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium
                              border transition-all
                    ${s.is_report_generated
                      ? "border-brand-200 dark:border-brand-700 text-brand-700 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950"
                      : "border-gray-200 dark:border-gray-700 text-gray-400 cursor-not-allowed"
                    }`}>
                  <Download size={14} />
                  {s.is_report_generated ? "PDF" : "No PDF"}
                </button>
                <ChevronDown size={16} className="text-gray-400" />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      <AnimatePresence>
        {selected && (
          <ScreeningDetail screening={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}