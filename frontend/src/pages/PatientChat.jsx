import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Download, Loader, Calendar, CheckCircle } from "lucide-react";
import api from "../utils/api";
import toast from "react-hot-toast";

const URGENCY_COLOR = {
  emergency: { badge: "badge-emergency", bg: "bg-red-50 dark:bg-red-900",        border: "border-red-200 dark:border-red-700"   },
  urgent:    { badge: "badge-urgent",    bg: "bg-amber-50 dark:bg-amber-900",     border: "border-amber-200 dark:border-amber-700" },
  routine:   { badge: "badge-routine",   bg: "bg-emerald-50 dark:bg-emerald-900", border: "border-emerald-200 dark:border-emerald-700" },
};

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      {[0,1,2].map(i => (
        <motion.div key={i} animate={{ y:[0,-5,0] }}
          transition={{ duration:0.8, repeat:Infinity, delay:i*0.15 }}
          className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500" />
      ))}
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700
                        flex items-center justify-center text-white text-sm shrink-0 mr-2 mt-1">🏥</div>
      )}
      <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed
        ${isUser
          ? "bg-brand-600 text-white rounded-tr-sm"
          : "bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-sm shadow-sm"
        }`}>
        {msg.content}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-xl bg-gray-200 dark:bg-gray-700
                        flex items-center justify-center text-sm shrink-0 ml-2 mt-1">👤</div>
      )}
    </motion.div>
  );
}

function QuickReplies({ replies, onSelect, disabled }) {
  if (!replies?.length) return null;
  return (
    <div className="flex flex-wrap gap-2 px-4 pb-2">
      {replies.map((r,i) => (
        <motion.button key={i} initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }}
          transition={{ delay:i*0.05 }} onClick={() => onSelect(r)} disabled={disabled}
          whileTap={{ scale:0.95 }}
          className="px-3 py-1.5 text-xs font-medium rounded-full border
                     border-brand-200 dark:border-brand-700 text-brand-700 dark:text-brand-400
                     bg-brand-50 dark:bg-brand-950 hover:bg-brand-100 dark:hover:bg-brand-900
                     disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          {r}
        </motion.button>
      ))}
    </div>
  );
}

function SummaryCard({ summary }) {
  const u = URGENCY_COLOR[summary.urgency] || URGENCY_COLOR.routine;
  return (
    <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
      className={`mx-4 mb-4 rounded-2xl border p-5 ${u.bg} ${u.border}`}>
      <div className="flex items-center justify-between mb-4">
        <span className="font-display font-bold text-gray-900 dark:text-white">Pre-Screening Complete</span>
        <span className={u.badge}>{summary.urgency}</span>
      </div>
      <div className="space-y-2">
        {[
          ["Chief Complaint", summary.chief_complaint],
          ["Duration",        summary.duration],
          ["Severity",        `${summary.severity}/10`],
          ["Specialist",      summary.recommended_specialist],
        ].map(([k,v]) => (
          <div key={k} className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">{k}</span>
            <span className="font-medium text-gray-900 dark:text-white">{v}</span>
          </div>
        ))}
      </div>
      {summary.symptoms?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {summary.symptoms.map((s,i) => (
            <span key={i} className="px-2.5 py-1 bg-white dark:bg-gray-800 rounded-full text-xs font-medium
                                     text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
              {s}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function ClassificationCard({ classification }) {
  const pct   = Math.round((classification.primary_confidence||0)*100);
  const color = pct>=80 ? "bg-emerald-500" : pct>=60 ? "bg-amber-500" : "bg-red-500";
  return (
    <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
      className="mx-4 mb-4 card overflow-hidden">
      <div className="bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-200 mb-1">Specialist Routing</p>
        <p className="font-display font-bold text-2xl">🩺 {classification.primary_specialist}</p>
        <p className="text-brand-200 text-sm mt-1">{classification.primary_description}</p>
        <div className="mt-3">
          <div className="flex justify-between text-xs text-brand-300 mb-1">
            <span>Confidence</span>
            <span className="font-bold text-white">{pct}%</span>
          </div>
          <div className="h-1.5 bg-brand-900 rounded-full overflow-hidden">
            <motion.div initial={{ width:0 }} animate={{ width:`${pct}%` }}
              transition={{ delay:0.3, duration:0.8 }}
              className={`h-full ${color} rounded-full`} />
          </div>
        </div>
      </div>
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-3 p-3 bg-brand-50 dark:bg-gray-800 rounded-xl">
          <span className="text-lg">🕐</span>
          <div>
            <p className="text-xs text-gray-500">See doctor within</p>
            <p className="font-semibold text-brand-700 dark:text-brand-400 text-sm">
              {classification.see_doctor_within}
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{classification.reasoning}</p>
        {classification.secondary_specialist && (
          <p className="text-xs text-gray-500">
            Also consider: <span className="font-medium">{classification.secondary_specialist}</span>
          </p>
        )}
      </div>
    </motion.div>
  );
}

function BookingPanel({ screeningId, specialist }) {
  const navigate  = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use the public appointments/doctors endpoint — no auth restriction
    api.get("/appointments/doctors")
      .then(r => setDoctors(r.data || []))
      .catch(() => setDoctors([]))
      .finally(() => setLoading(false));
  }, []);

  const specialistKey = specialist?.split(" ")[0]?.toLowerCase() || "";
  const matched = doctors.filter(d =>
    d.specialty?.toLowerCase().includes(specialistKey)
  );
  const list = matched.length > 0 ? matched : doctors;

  return (
    <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
      className="mx-4 mb-4 card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Calendar size={18} className="text-brand-500" />
        <h3 className="font-display font-bold text-gray-900 dark:text-white">Book an Appointment</h3>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Loader size={14} className="animate-spin" /> Loading available doctors...
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No doctors available right now.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Please ask an admin to add doctors to the system.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Recommended specialist: <span className="font-semibold text-gray-700 dark:text-gray-300">{specialist}</span>
          </p>
          {list.slice(0,3).map(doc => (
            <div key={doc.id}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-violet-600
                                flex items-center justify-center text-white font-bold shrink-0">
                  {doc.full_name?.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{doc.full_name}</p>
                  <p className="text-xs text-gray-500">{doc.specialty} · {doc.experience_years}yr exp</p>
                  {doc.consultation_fee > 0 && (
                    <p className="text-xs text-brand-600 dark:text-brand-400 font-medium">₹{doc.consultation_fee}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => navigate(`/patient/book/${doc.id}?screening=${screeningId}`)}
                className="btn-primary text-xs py-2 px-4 shrink-0">
                Book
              </button>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function PDFReadyCard({ onDownload, loading }) {
  return (
    <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
      className="mx-4 mb-4 card p-5 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
          <CheckCircle size={20} className="text-white" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-gray-900 dark:text-white text-sm">PDF Report Ready</p>
          <p className="text-xs text-gray-500 mt-0.5">Your pre-screening report has been generated</p>
        </div>
        <button onClick={onDownload} disabled={loading}
          className="btn-primary flex items-center gap-2 text-sm shrink-0">
          {loading ? <Loader size={14} className="animate-spin" /> : <Download size={14} />}
          {loading ? "..." : "Download"}
        </button>
      </div>
    </motion.div>
  );
}

export default function PatientChat() {
  const [sessionId,      setSessionId]      = useState(null);
  const [messages,       setMessages]       = useState([]);
  const [quickReplies,   setQuickReplies]   = useState([]);
  const [input,          setInput]          = useState("");
  const [loading,        setLoading]        = useState(false);
  const [isComplete,     setIsComplete]     = useState(false);
  const [summary,        setSummary]        = useState(null);
  const [classification, setClassification] = useState(null);
  const [classifying,    setClassifying]    = useState(false);
  const [symptoms,       setSymptoms]       = useState([]);
  const [reportLoading,  setReportLoading]  = useState(false);
  const [reportReady,    setReportReady]    = useState(false);
  const [reportUrl,      setReportUrl]      = useState(null);
  const [screeningId,    setScreeningId]    = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => { startSession(); }, []);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages, loading, classification, reportReady]);

  async function startSession() {
    try {
      setLoading(true);
      const { data } = await api.post("/session/start");
      setSessionId(data.session_id);
      setMessages([{ role:"agent", content:data.greeting }]);
      setQuickReplies(data.quick_replies||[]);
    } catch {
      toast.error("Cannot connect to agent. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  async function saveScreening(sid, sum, classif, rpath) {
    try {
      const { data } = await api.post("/screening/save", {
        session_id:     sid,
        summary:        sum,
        classification: classif,
        report_path:    rpath || null,
      });
      setScreeningId(data.screening_id);
      return data.screening_id;
    } catch (e) {
      console.error("Could not save screening:", e);
      return null;
    }
  }

  async function generatePDF(sid, sum, classif) {
    try {
      setReportLoading(true);
      const { data } = await api.post("/report/generate", { session_id: sid });
      setReportUrl(data.download_url);
      setReportReady(true);
      // Save screening with report path
      await saveScreening(sid, sum, classif, data.report_path);
      toast.success("Pre-screening saved & PDF report ready!");
    } catch {
      // PDF failed — still save screening without report
      await saveScreening(sid, sum, classif, null);
      toast("Pre-screening saved. PDF generation failed.", { icon:"⚠️" });
    } finally {
      setReportLoading(false);
    }
  }

  async function runClassification(sid, sum) {
    setClassifying(true);
    try {
      const { data } = await api.post("/classify", { session_id: sid });
      setClassification(data);
      // Auto-generate PDF and save to DB
      await generatePDF(sid, sum, data);
      return data;
    } catch {
      // Classification failed — save without it
      await saveScreening(sid, sum, {}, null);
    } finally {
      setClassifying(false);
    }
  }

  async function sendMessage(text) {
    if (!text.trim() || loading || isComplete) return;
    const msg = text.trim();
    setInput("");
    setQuickReplies([]);
    setMessages(prev => [...prev, { role:"user", content:msg }]);
    setLoading(true);
    try {
      const { data } = await api.post("/session/chat", { session_id:sessionId, message:msg });
      setMessages(prev => [...prev, { role:"agent", content:data.reply }]);
      setQuickReplies(data.quick_replies||[]);
      setSymptoms(data.symptoms_so_far||[]);
      if (data.is_complete) {
        setIsComplete(true);
        setQuickReplies([]);
        const sumRes = await api.get(`/session/${sessionId}/summary`);
        const sum    = sumRes.data.summary;
        setSummary(sum);
        await runClassification(sessionId, sum);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function downloadReport() {
    if (!reportUrl) return;
    const link = document.createElement("a");
    link.href     = reportUrl;
    link.download = reportUrl.split("/").pop();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700
                            flex items-center justify-center text-white text-lg">🏥</div>
            <div>
              <p className="font-display font-bold text-gray-900 dark:text-white">MedScreen AI</p>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Online · Pre-Screening</p>
              </div>
            </div>
          </div>

          {symptoms.length > 0 && !isComplete && (
            <div className="hidden md:flex gap-2">
              {symptoms.slice(0,3).map((s,i) => (
                <span key={i} className="px-2.5 py-1 bg-brand-50 dark:bg-brand-950
                                          text-brand-700 dark:text-brand-400
                                          border border-brand-200 dark:border-brand-800
                                          rounded-full text-xs font-medium">{s}</span>
              ))}
            </div>
          )}

          {reportReady && (
            <button onClick={downloadReport}
              className="btn-primary flex items-center gap-2 text-sm">
              <Download size={16} /> PDF Report
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 max-w-3xl mx-auto w-full">
        <AnimatePresence>
          {messages.map((msg,i) => <Message key={i} msg={msg} />)}
        </AnimatePresence>

        {loading && (
          <div className="flex justify-start mb-3 ml-4">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700
                            flex items-center justify-center text-white text-sm mr-2 mt-1">🏥</div>
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700
                            rounded-2xl rounded-tl-sm shadow-sm">
              <TypingDots />
            </div>
          </div>
        )}

        {summary && <SummaryCard summary={summary} />}

        {classifying && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
            className="mx-4 mb-4 card p-5 flex items-center gap-3">
            <Loader size={18} className="animate-spin text-brand-500" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white text-sm">
                Classifying specialist & generating PDF report...
              </p>
              <p className="text-xs text-gray-500">This may take a few seconds</p>
            </div>
          </motion.div>
        )}

        {classification && !classifying && (
          <>
            <ClassificationCard classification={classification} />
            {reportReady && <PDFReadyCard onDownload={downloadReport} loading={false} />}
            {!reportReady && reportLoading && (
              <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
                className="mx-4 mb-4 card p-4 flex items-center gap-3">
                <Loader size={16} className="animate-spin text-brand-500" />
                <p className="text-sm text-gray-500">Generating PDF report...</p>
              </motion.div>
            )}
            <BookingPanel
              screeningId={screeningId}
              specialist={classification.primary_specialist}
            />
          </>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      <div className="max-w-3xl mx-auto w-full">
        <QuickReplies replies={quickReplies} onSelect={sendMessage} disabled={loading||isComplete} />
      </div>

      {/* Input */}
      <div className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <div className={`flex items-end gap-3 bg-gray-50 dark:bg-gray-800 border rounded-2xl px-4 py-3
                           transition-all duration-200
                           ${isComplete ? "border-gray-200 dark:border-gray-700" : "border-brand-300 dark:border-brand-700"}`}>
            <textarea
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key==="Enter"&&!e.shiftKey) { e.preventDefault(); sendMessage(input); }}}
              placeholder={isComplete ? "Pre-screening complete" : "Describe your symptoms..."}
              disabled={loading||isComplete} rows={1}
              className="flex-1 bg-transparent border-none outline-none resize-none
                         text-gray-900 dark:text-gray-100 placeholder-gray-400
                         text-sm leading-relaxed max-h-32 overflow-y-auto disabled:opacity-40"
            />
            <motion.button onClick={() => sendMessage(input)}
              disabled={!input.trim()||loading||isComplete}
              whileTap={{ scale:0.9 }}
              className="w-9 h-9 rounded-xl bg-brand-600 hover:bg-brand-700 text-white
                         flex items-center justify-center shrink-0 transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed">
              <Send size={16} />
            </motion.button>
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">
            Click a suggestion or type · Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}