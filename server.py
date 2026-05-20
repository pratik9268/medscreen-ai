"""
FastAPI backend — exposes the symptom collector agent via REST endpoints.
Run with: uvicorn server:app --reload
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import uuid
import os
from dotenv import load_dotenv
load_dotenv()

from agent.symptom_collector import SymptomCollectorSession
from agent.report_generator import generate_report

app = FastAPI(title="AI Patient Pre-Screening Agent", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session store
sessions: dict[str, SymptomCollectorSession] = {}


# ── Models ───────────────────────────────────────────────────────────────────

class StartResponse(BaseModel):
    session_id: str
    greeting: str
    quick_replies: list[str]

class ChatRequest(BaseModel):
    session_id: str
    message: str

class ChatResponse(BaseModel):
    reply: str
    is_complete: bool
    symptoms_so_far: list[str]
    quick_replies: list[str]

class SummaryResponse(BaseModel):
    session_id: str
    summary: dict

class ReportRequest(BaseModel):
    session_id: str | None = None   # Use session's summary if provided
    summary: dict | None = None     # Or pass summary directly

class ReportResponse(BaseModel):
    report_path: str
    report_filename: str
    download_url: str


# ── Routes ───────────────────────────────────────────────────────────────────

@app.post("/session/start", response_model=StartResponse)
def start_session():
    session_id = str(uuid.uuid4())
    session = SymptomCollectorSession()
    sessions[session_id] = session
    greeting, quick_replies = session.get_greeting()
    return StartResponse(session_id=session_id, greeting=greeting, quick_replies=quick_replies)


@app.post("/session/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    session = sessions.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    reply, is_complete, quick_replies = session.chat(req.message)
    return ChatResponse(
        reply=reply,
        is_complete=is_complete,
        symptoms_so_far=session.get_symptoms(),
        quick_replies=quick_replies,
    )


@app.get("/session/{session_id}/summary", response_model=SummaryResponse)
def get_summary(session_id: str):
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    summary = session.get_summary()
    if not summary:
        raise HTTPException(status_code=400, detail="Session not complete yet")
    return SummaryResponse(session_id=session_id, summary=summary)


@app.post("/report/generate", response_model=ReportResponse)
def create_report(req: ReportRequest):
    """
    Generate a PDF pre-screening report.
    Supply either:
      - session_id  → pulls the summary from that session
      - summary     → uses the provided dict directly
    """
    if req.session_id:
        session = sessions.get(req.session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        summary = session.get_summary()
        if not summary:
            raise HTTPException(status_code=400, detail="Session not complete yet — no summary available")
    elif req.summary:
        summary = req.summary
    else:
        raise HTTPException(status_code=422, detail="Provide either session_id or summary")

    try:
        path = generate_report(summary)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")

    filename = os.path.basename(path)
    return ReportResponse(
        report_path=path,
        report_filename=filename,
        download_url=f"/report/download/{filename}",
    )


@app.get("/report/download/{filename}")
def download_report(filename: str):
    """Serve a generated PDF for download."""
    # Sanitise filename — no path traversal
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    path = os.path.join("reports", filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Report not found")
    return FileResponse(
        path,
        media_type="application/pdf",
        filename=filename,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/health")
def health():
    return {"status": "ok", "active_sessions": len(sessions)}