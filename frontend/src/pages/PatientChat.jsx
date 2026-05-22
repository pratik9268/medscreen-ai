import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Download, Loader } from "lucide-react";
import api from "../utils/api";
import toast from "react-hot-toast";

const URGENCY_COLOR = {
  emergency: { badge: "badge-emergency", bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-200 dark:border-red-800/50" },
  urgent:    { badge: "badge-urgent",    bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800/50" },
  routine:   { badge: "badge-routine",   bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800/50" },
};

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      {[0, 1, 2].map(i => (
        <motion.div key={i}
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
          className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500"
        />
      ))}
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700
                        flex items-center justify-center text-white text-sm shrink-0 mr-2 mt-1">
          🏥
        </div>
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
                        flex items-center justify-center text-sm shrink-0 ml-2 mt-1">
          👤
        </div>
      )}
    </motion.div>
  );
}

function QuickReplies({ replies, onSelect, disabled }) {
  if (!replies?.length) return null;
  return (
    <div className="flex flex-wrap gap-2 px-4 pb-2">
      {replies.map((r, i) => (
        <motion.button key={i}
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
          onClick={() => onSelect(r)} disabled={disabled}
          whileTap={{ scale: 0.95 }}
          className="px-3 py-1.5 text-xs font-medium rounded-full border
                     border-brand-200 dark:border-brand-700/50
                     text-brand-700 dark:text-brand-400
                     bg-brand-50 dark:bg-brand-950/40
                     hover:bg-brand-100 dark:hover:bg-brand-900/50
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-colors">
          {r}
        </motion.button>
      ))}
    </div>
  );
}

function SummaryCard({ summary }) {
  const u = URGENCY_COLOR[summary.urgency] || URGENCY_COLOR.routine;
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
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
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">{k}</span>
            <span className="font-medium text-gray-900 dark:text-white">{v}</span>
          </div>
        ))}
      </div>
      {summary.symptoms?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {summary.symptoms.map((s, i) => (
            <span key={i} className="px-2.5 py-1 bg-white/60 dark:bg-black/20 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300">
              {s}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function ClassificationCard({ classification }) {
  const pct   = Math.round((classification.primary_confidence || 0) * 100);
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-red-500";
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="mx-4 mb-4 card overflow-hidden">
      <div className="bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-200 mb-1">
          Specialist Routing
        </p>
        <p className="font-display font-bold text-2xl">🩺 {classification.primary_specialist}</p>
        <p className="text-brand-200 text-sm mt-1">{classification.primary_description}</p>
        <div className="mt-3">
          <div className="flex justify-between text-xs text-brand-300 mb-1">
            <span>Confidence</span><span className="font-bold text-white">{pct}%</span>
          </div>
          <div className="h-1.5 bg-brand-900/50 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className={`h-full ${color} rounded-full`} />
          </div>
        </div>
      </div>
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-3 p-3 bg-brand-50 dark:bg-brand-950/30 rounded-xl">
          <span className="text-lg">🕐</span>
          <div>
            <p className="text-xs text-gray-500">See doctor within</p>
            <p className="font-semibold text-brand-700 dark:text-brand-400 text-sm">
              {classification.see_doctor_within}
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {classification.reasoning}
        </p>
        {classification.secondary_specialist && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Also consider: <span className="font-medium">{classification.secondary_specialist}</span>
          </p>
        )}
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
  const bottomRef = useRef(null);

  useEffect(() => { startSession(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading, classification]);

  async function startSession() {
    try {
      setLoading(true);
      const { data } = await api.post("/session/start");
      setSessionId(data.session_id);
      setMessages([{ role: "agent", content: data.greeting }]);
      setQuickReplies(data.quick_replies || []);
    } catch { toast.error("Cannot connect to agent. Make sure the backend is running."); }
    finally  { setLoading(false); }
  }

  async function runClassification(sid) {
    setClassifying(true);
    try {
      const { data } = await api.post("/classify", { session_id: sid });
      setClassification(data);
    } catch { /* silent fail */ }
    finally { setClassifying(false); }
  }

  async function sendMessage(text) {
    if (!text.trim() || loading || isComplete) return;
    const msg = text.trim();
    setInput("");
    setQuickReplies([]);
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setLoading(true);
    try {
      const { data } = await api.post("/session/chat", { session_id: sessionId, message: msg });
      setMessages(prev => [...prev, { role: "agent", content: data.reply }]);
      setQuickReplies(data.quick_replies || []);
      setSymptoms(data.symptoms_so_far || []);
      if (data.is_complete) {
        setIsComplete(true);
        setQuickReplies([]);
        const sum = await api.get(`/session/${sessionId}/summary`);
        setSummary(sum.data.summary);
        await runClassification(sessionId);
      }
    } catch { toast.error("Something went wrong. Please try again."); }
    finally  { setLoading(false); }
  }

  async function downloadReport() {
    setReportLoading(true);
    try {
      const { data } = await api.post("/report/generate", { session_id: sessionId });
      const link = document.createElement("a");
      link.href     = data.download_url;
      link.download = data.report_filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Report downloaded!");
    } catch { toast.error("Failed to generate report"); }
    finally  { setReportLoading(false); }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700
                            flex items-center justify-center text-white text-lg">
              🏥
            </div>
            <div>
              <p className="font-display font-bold text-gray-900 dark:text-white">MedScreen AI</p>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Online · Pre-Screening</p>
              </div>
            </div>
          </div>

          {symptoms.length > 0 && (
            <div className="hidden md:flex gap-2">
              {symptoms.slice(0, 3).map((s, i) => (
                <span key={i} className="px-2.5 py-1 bg-brand-50 dark:bg-brand-950/50
                                          text-brand-700 dark:text-brand-400
                                          border border-brand-200 dark:border-brand-800/50
                                          rounded-full text-xs font-medium">
                  {s}
                </span>
              ))}
            </div>
          )}

          {isComplete && (
            <button onClick={downloadReport} disabled={reportLoading}
              className="btn-primary flex items-center gap-2 text-sm">
              {reportLoading
                ? <Loader size={16} className="animate-spin" />
                : <Download size={16} />}
              {reportLoading ? "Generating..." : "PDF Report"}
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 max-w-3xl mx-auto w-full">
        <AnimatePresence>
          {messages.map((msg, i) => <Message key={i} msg={msg} />)}
        </AnimatePresence>

        {loading && (
          <div className="flex justify-start mb-3 ml-4">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700
                            flex items-center justify-center text-white text-sm mr-2 mt-1">
              🏥
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-tl-sm shadow-sm">
              <TypingDots />
            </div>
          </div>
        )}

        {summary       && <SummaryCard summary={summary} />}

        {classifying   && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="mx-4 mb-4 card p-5 flex items-center gap-3">
            <Loader size={18} className="animate-spin text-brand-500" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white text-sm">Running specialist classification...</p>
              <p className="text-xs text-gray-500">Analyzing symptoms · Routing to specialist</p>
            </div>
          </motion.div>
        )}

        {classification && !classifying && <ClassificationCard classification={classification} />}

        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      <div className="max-w-3xl mx-auto w-full">
        <QuickReplies replies={quickReplies} onSelect={sendMessage} disabled={loading || isComplete} />
      </div>

      {/* Input */}
      <div className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <div className={`flex items-end gap-3 bg-gray-50 dark:bg-gray-800
                           border rounded-2xl px-4 py-3 transition-all duration-200
                           ${isComplete ? "border-gray-200 dark:border-gray-700" : "border-brand-300 dark:border-brand-700/50"}`}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
              placeholder={isComplete ? "Pre-screening complete" : "Describe your symptoms..."}
              disabled={loading || isComplete}
              rows={1}
              className="flex-1 bg-transparent border-none outline-none resize-none
                         text-gray-900 dark:text-gray-100 placeholder-gray-400
                         text-sm leading-relaxed max-h-32 overflow-y-auto
                         disabled:opacity-40"
            />
            <motion.button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading || isComplete}
              whileTap={{ scale: 0.9 }}
              className="w-9 h-9 rounded-xl bg-brand-600 hover:bg-brand-700 text-white
                         flex items-center justify-center shrink-0 transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed">
              <Send size={16} />
            </motion.button>
          </div>
          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-2">
            Click a suggestion or type · Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
