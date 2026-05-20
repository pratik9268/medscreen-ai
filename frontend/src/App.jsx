import { useState, useEffect, useRef } from "react";

const API = "http://localhost:8000";

const COLORS = {
  bg: "#0a0f1e",
  surface: "#111827",
  surfaceHover: "#1a2235",
  border: "#1e2d45",
  accent: "#2563eb",
  accentLight: "#3b82f6",
  accentGlow: "rgba(37,99,235,0.15)",
  userBubble: "#2563eb",
  agentBubble: "#1a2235",
  text: "#f1f5f9",
  textMuted: "#64748b",
  textSecondary: "#94a3b8",
  green: "#10b981",
  greenBg: "rgba(16,185,129,0.1)",
  red: "#ef4444",
  pill: "#1e3a5f",
  pillText: "#93c5fd",
  pillHover: "#2563eb",
};

function TypingIndicator() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 16px" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: "50%",
          background: COLORS.textMuted,
          animation: "bounce 1.2s infinite",
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: 8,
      padding: "0 16px",
    }}>
      {!isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "linear-gradient(135deg, #2563eb, #7c3aed)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, flexShrink: 0, marginRight: 8, marginTop: 4,
        }}>🏥</div>
      )}
      <div style={{
        maxWidth: "72%",
        background: isUser ? COLORS.userBubble : COLORS.agentBubble,
        color: COLORS.text,
        borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
        padding: "10px 14px",
        fontSize: 15,
        lineHeight: 1.5,
        border: isUser ? "none" : `1px solid ${COLORS.border}`,
      }}>
        {msg.content}
      </div>
      {isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "#1e3a5f",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, flexShrink: 0, marginLeft: 8, marginTop: 4,
        }}>👤</div>
      )}
    </div>
  );
}

function QuickReplies({ replies, onSelect, disabled }) {
  if (!replies || replies.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "8px 16px 4px" }}>
      {replies.map((r, i) => (
        <button key={i} onClick={() => onSelect(r)} disabled={disabled} style={{
          background: disabled ? COLORS.surface : COLORS.pill,
          color: disabled ? COLORS.textMuted : COLORS.pillText,
          border: `1px solid ${disabled ? COLORS.border : "#2563eb55"}`,
          borderRadius: 20, padding: "6px 14px", fontSize: 13,
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "all 0.15s", fontFamily: "inherit",
        }}
          onMouseEnter={e => { if (!disabled) { e.target.style.background = COLORS.pillHover; e.target.style.color = "#fff"; } }}
          onMouseLeave={e => { if (!disabled) { e.target.style.background = COLORS.pill; e.target.style.color = COLORS.pillText; } }}
        >{r}</button>
      ))}
    </div>
  );
}

function SummaryCard({ summary }) {
  const urgencyColor = {
    emergency: COLORS.red, urgent: "#f59e0b", routine: COLORS.green,
  }[summary.urgency] || COLORS.green;

  return (
    <div style={{
      margin: "12px 16px", background: COLORS.surface,
      border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 20,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ color: COLORS.text, fontWeight: 600, fontSize: 16 }}>Pre-Screening Complete</span>
        <span style={{
          background: `${urgencyColor}22`, color: urgencyColor,
          border: `1px solid ${urgencyColor}44`,
          borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 600,
          textTransform: "uppercase", letterSpacing: 1,
        }}>{summary.urgency}</span>
      </div>
      <Row label="Chief Complaint" value={summary.chief_complaint} />
      <Row label="Duration" value={summary.duration} />
      <Row label="Severity" value={`${summary.severity}/10`} />
      <Row label="Specialist" value={summary.recommended_specialist} accent />
      {summary.symptoms?.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ color: COLORS.textMuted, fontSize: 12, marginBottom: 6 }}>SYMPTOMS</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {summary.symptoms.map((s, i) => (
              <span key={i} style={{
                background: COLORS.accentGlow, color: COLORS.accentLight,
                border: `1px solid ${COLORS.accent}33`,
                borderRadius: 12, padding: "3px 10px", fontSize: 13,
              }}>{s}</span>
            ))}
          </div>
        </div>
      )}
      {summary.red_flags?.length > 0 && summary.red_flags[0] !== "none" && (
        <div style={{ marginTop: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px" }}>
          <div style={{ color: COLORS.red, fontSize: 12, fontWeight: 600, marginBottom: 4 }}>⚠ RED FLAGS</div>
          {summary.red_flags.map((f, i) => <div key={i} style={{ color: "#fca5a5", fontSize: 13 }}>{f}</div>)}
        </div>
      )}
      <div style={{ marginTop: 16, padding: "12px 0 0", borderTop: `1px solid ${COLORS.border}`, color: COLORS.textMuted, fontSize: 13 }}>
        ✅ Summary ready for Phase 2 — Report Generation
      </div>
    </div>
  );
}

function Row({ label, value, accent }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${COLORS.border}` }}>
      <span style={{ color: COLORS.textMuted, fontSize: 13 }}>{label}</span>
      <span style={{ color: accent ? COLORS.accentLight : COLORS.text, fontSize: 13, fontWeight: accent ? 600 : 400 }}>{value}</span>
    </div>
  );
}

// ── NEW: Report Download Button ───────────────────────────────────────────────
function ReportButton({ sessionId }) {
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [errorMsg, setErrorMsg] = useState("");

  async function handleDownload() {
    if (status === "loading") return;
    setStatus("loading");
    setErrorMsg("");

    try {
      // 1. Generate the report
      const res = await fetch(`${API}/report/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Report generation failed");
      }

      const data = await res.json();

      // 2. Trigger browser download
      const downloadUrl = `${API}${data.download_url}`;
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = data.report_filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setStatus("done");
      // Reset button after 4 seconds
      setTimeout(() => setStatus("idle"), 4000);

    } catch (e) {
      setErrorMsg(e.message);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 4000);
    }
  }

  const label = {
    idle:    "📄 Download PDF Report",
    loading: "⏳ Generating PDF...",
    done:    "✅ Downloaded!",
    error:   "❌ Failed — Retry",
  }[status];

  const bg = {
    idle:    "linear-gradient(135deg, #2563eb, #7c3aed)",
    loading: "#1e3a5f",
    done:    "linear-gradient(135deg, #059669, #10b981)",
    error:   "linear-gradient(135deg, #dc2626, #ef4444)",
  }[status];

  return (
    <div style={{ margin: "0 16px 12px" }}>
      <button
        onClick={handleDownload}
        disabled={status === "loading"}
        style={{
          width: "100%",
          background: bg,
          color: "#fff",
          border: "none",
          borderRadius: 12,
          padding: "13px 20px",
          fontSize: 15,
          fontWeight: 600,
          cursor: status === "loading" ? "not-allowed" : "pointer",
          fontFamily: "inherit",
          transition: "opacity 0.2s",
          opacity: status === "loading" ? 0.7 : 1,
          boxShadow: status === "idle" ? "0 4px 20px rgba(37,99,235,0.35)" : "none",
        }}
      >
        {label}
      </button>
      {status === "error" && errorMsg && (
        <div style={{ color: "#fca5a5", fontSize: 12, marginTop: 6, textAlign: "center" }}>
          {errorMsg}
        </div>
      )}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [quickReplies, setQuickReplies] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [summary, setSummary] = useState(null);
  const [symptoms, setSymptoms] = useState([]);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => { startSession(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  async function startSession() {
    try {
      setLoading(true);
      const res = await fetch(`${API}/session/start`, { method: "POST" });
      const data = await res.json();
      setSessionId(data.session_id);
      setMessages([{ role: "agent", content: data.greeting }]);
      setQuickReplies(data.quick_replies || []);
    } catch {
      setError("Cannot connect to backend. Make sure the FastAPI server is running on port 8000.");
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(text) {
    if (!text.trim() || loading || isComplete) return;
    const userMsg = text.trim();
    setInput("");
    setQuickReplies([]);
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);
    try {
      const res = await fetch(`${API}/session/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, message: userMsg }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "agent", content: data.reply }]);
      setQuickReplies(data.quick_replies || []);
      setSymptoms(data.symptoms_so_far || []);
      if (data.is_complete) {
        setIsComplete(true);
        setQuickReplies([]);
        const sumRes = await fetch(`${API}/session/${sessionId}/summary`);
        const sumData = await sumRes.json();
        setSummary(sumData.summary);
      }
    } catch {
      setMessages(prev => [...prev, { role: "agent", content: "Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh",
      background: COLORS.bg, fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e2d45; border-radius: 4px; }
        textarea:focus { outline: none; }
      `}</style>

      {/* Header */}
      <div style={{
        background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`,
        padding: "14px 20px", display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          background: "linear-gradient(135deg, #2563eb, #7c3aed)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
        }}>🏥</div>
        <div>
          <div style={{ color: COLORS.text, fontWeight: 600, fontSize: 15 }}>MedScreen AI</div>
          <div style={{ color: COLORS.green, fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.green }} />
            Online · Pre-Screening Assistant
          </div>
        </div>

        {/* Ready for report button — only shows when complete */}
        {isComplete && sessionId && (
          <button
            onClick={async () => {
              // Scroll to download button
              bottomRef.current?.scrollIntoView({ behavior: "smooth" });
            }}
            style={{
              marginLeft: "auto",
              background: "linear-gradient(135deg, #2563eb, #7c3aed)",
              color: "#fff", border: "none", borderRadius: 20,
              padding: "8px 16px", fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
              boxShadow: "0 2px 12px rgba(37,99,235,0.4)",
            }}
          >
            📄 Ready for report
          </button>
        )}

        {symptoms.length > 0 && !isComplete && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {symptoms.slice(0, 4).map((s, i) => (
              <span key={i} style={{
                background: COLORS.accentGlow, color: COLORS.accentLight,
                border: `1px solid ${COLORS.accent}33`,
                borderRadius: 12, padding: "2px 10px", fontSize: 11,
              }}>{s}</span>
            ))}
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", padding: "10px 20px", fontSize: 13 }}>
          ⚠ {error}
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", paddingTop: 16, paddingBottom: 8 }}>
        {messages.map((msg, i) => <Message key={i} msg={msg} />)}
        {loading && (
          <div style={{ display: "flex", padding: "0 16px 8px" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #2563eb, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, marginRight: 8 }}>🏥</div>
            <div style={{ background: COLORS.agentBubble, border: `1px solid ${COLORS.border}`, borderRadius: "18px 18px 18px 4px" }}>
              <TypingIndicator />
            </div>
          </div>
        )}
        {summary && <SummaryCard summary={summary} />}

        {/* PDF Download button — appears below summary when complete */}
        {isComplete && sessionId && <ReportButton sessionId={sessionId} />}

        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      <QuickReplies replies={quickReplies} onSelect={sendMessage} disabled={loading || isComplete} />

      {/* Input */}
      <div style={{ padding: "12px 16px 16px", background: COLORS.surface, borderTop: `1px solid ${COLORS.border}` }}>
        <div style={{
          display: "flex", gap: 10, alignItems: "flex-end",
          background: COLORS.bg,
          border: `1px solid ${isComplete ? COLORS.border : COLORS.accent + "55"}`,
          borderRadius: 24, padding: "8px 8px 8px 16px",
          transition: "border-color 0.2s",
        }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder={isComplete ? "Pre-screening complete" : "Describe your symptoms..."}
            disabled={loading || isComplete}
            rows={1}
            style={{
              flex: 1, background: "transparent", border: "none", color: COLORS.text,
              fontSize: 15, resize: "none", fontFamily: "inherit", lineHeight: 1.5,
              maxHeight: 120, overflowY: "auto", opacity: isComplete ? 0.4 : 1,
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading || isComplete}
            style={{
              width: 38, height: 38, borderRadius: "50%", border: "none",
              background: (!input.trim() || loading || isComplete) ? COLORS.border : COLORS.accent,
              color: "#fff", cursor: (!input.trim() || loading || isComplete) ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, flexShrink: 0, transition: "background 0.2s",
            }}
          >➤</button>
        </div>
        <div style={{ textAlign: "center", marginTop: 8, color: COLORS.textMuted, fontSize: 11 }}>
          Click a suggestion or type your own answer · Enter to send
        </div>
      </div>
    </div>
  );
}