"""
FastAPI backend — MedScreen AI v0.4.0
Auth:     Supabase Auth
Database: Supabase PostgreSQL
Run with: uvicorn server:app --reload
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
import uuid, os
from dotenv import load_dotenv
load_dotenv()

from database import get_db, create_tables, check_connection
from routers import (
    auth_router, patient_router, doctor_router,
    admin_router, appointment_router, screening_router
)
from agent.symptom_collector import SymptomCollectorSession
from agent.report_generator import generate_report
from agent.specialist_classifier import classify_specialist

app = FastAPI(
    title="MedScreen AI",
    version="0.4.0",
    description="AI-Powered Patient Pre-Screening — Supabase Auth + PostgreSQL",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Startup ───────────────────────────────────────────────────────────────────

@app.on_event("startup")
def startup():
    check_connection()
    create_tables()

# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(auth_router)
app.include_router(patient_router)
app.include_router(doctor_router)
app.include_router(admin_router)
app.include_router(appointment_router)
app.include_router(screening_router)

# ── In-memory Agent Sessions ──────────────────────────────────────────────────

sessions: dict[str, SymptomCollectorSession] = {}

# ── Agent Routes (Phase 1-3 — unchanged) ─────────────────────────────────────

class StartResponse(BaseModel):
    session_id:    str
    greeting:      str
    quick_replies: list[str]

class ChatRequest(BaseModel):
    session_id: str
    message:    str

class ChatResponse(BaseModel):
    reply:           str
    is_complete:     bool
    symptoms_so_far: list[str]
    quick_replies:   list[str]

class SummaryResponse(BaseModel):
    session_id: str
    summary:    dict

class ReportRequest(BaseModel):
    session_id: Optional[str] = None
    summary:    Optional[dict] = None

class ReportResponse(BaseModel):
    report_path:     str
    report_filename: str
    download_url:    str

class ClassifyRequest(BaseModel):
    session_id: Optional[str] = None
    summary:    Optional[dict] = None


@app.post("/session/start", response_model=StartResponse, tags=["Agent"])
def start_session():
    session_id           = str(uuid.uuid4())
    session              = SymptomCollectorSession()
    sessions[session_id] = session
    greeting, quick_replies = session.get_greeting()
    return StartResponse(session_id=session_id, greeting=greeting, quick_replies=quick_replies)


@app.post("/session/chat", response_model=ChatResponse, tags=["Agent"])
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


@app.get("/session/{session_id}/summary", response_model=SummaryResponse, tags=["Agent"])
def get_summary(session_id: str):
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    summary = session.get_summary()
    if not summary:
        raise HTTPException(status_code=400, detail="Session not complete yet")
    return SummaryResponse(session_id=session_id, summary=summary)


@app.post("/report/generate", response_model=ReportResponse, tags=["Agent"])
def create_report(req: ReportRequest):
    if req.session_id:
        session = sessions.get(req.session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        summary = session.get_summary()
        if not summary:
            raise HTTPException(status_code=400, detail="Session not complete yet")
    elif req.summary:
        summary = req.summary
    else:
        raise HTTPException(status_code=422, detail="Provide session_id or summary")

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


@app.get("/report/download/{filename}", tags=["Agent"])
def download_report(filename: str):
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    path = os.path.join("reports", filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Report not found")
    return FileResponse(path, media_type="application/pdf", filename=filename)


@app.post("/classify", tags=["Agent"])
def classify(req: ClassifyRequest):
    if req.session_id:
        session = sessions.get(req.session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        summary = session.get_summary()
        if not summary:
            raise HTTPException(status_code=400, detail="Session not complete yet")
    elif req.summary:
        summary = req.summary
    else:
        raise HTTPException(status_code=422, detail="Provide session_id or summary")

    try:
        result = classify_specialist(summary)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Classification failed: {str(e)}")

    return result


@app.get("/health", tags=["Health"])
def health():
    return {
        "status":          "ok",
        "version":         "0.4.0",
        "auth":            "supabase",
        "database":        "supabase-postgresql",
        "active_sessions": len(sessions),
    }