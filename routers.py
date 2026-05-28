"""
routers.py — All API route handlers organized by role
Covers: auth, patient, doctor, admin, appointments, pre-screening
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timedelta

from database import get_db
from models import (
    User, Patient, Doctor, DoctorTimeSlot, Appointment,
    PreScreening, UserRole, Gender, AppointmentStatus, Urgency
)
from auth_supabase import (
    RegisterRequest, LoginRequest, AuthResponse, RefreshRequest,
    register_user, login_user, refresh_token, logout_user, get_current_user,
    require_patient, require_doctor, require_admin,
    require_doctor_or_admin, get_supabase_admin,
)

# ── Dynamic Duration Logic ────────────────────────────────────────────────────

DURATION_MAP = {
    # urgency → base minutes
    "emergency": 60,
    "urgent":    45,
    "routine":   20,
}

SEVERITY_EXTRA = {
    # severity band → extra minutes
    (8, 10): 15,
    (5, 7):  10,
    (1, 4):  0,
}

def calculate_appointment_duration(urgency: str, severity: int) -> int:
    """
    Dynamically calculate appointment duration based on case severity.
    Emergency cases get more time; routine mild cases get standard slots.
    """
    base = DURATION_MAP.get(urgency, 30)
    extra = 0
    for (low, high), mins in SEVERITY_EXTRA.items():
        if low <= severity <= high:
            extra = mins
            break
    return base + extra


# ── Auth Router ───────────────────────────────────────────────────────────────

auth_router = APIRouter(prefix="/auth", tags=["Authentication"])

@auth_router.post("/register", response_model=AuthResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    user  = register_user(db, req)
    # Auto-create profile based on role
    if user.role == UserRole.patient:
        db.add(Patient(user_id=user.id))
        db.commit()
    elif user.role == UserRole.doctor:
        db.add(Doctor(user_id=user.id, specialty="General Practice"))
        db.commit()
    return login_user(db, LoginRequest(email=req.email, password=req.password))

@auth_router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    return login_user(db, req)

@auth_router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "id":        current_user.id,
        "email":     current_user.email,
        "full_name": current_user.full_name,
        "role":      current_user.role,
        "is_active": current_user.is_active,
    }


# ── Patient Router ────────────────────────────────────────────────────────────

patient_router = APIRouter(prefix="/patient", tags=["Patient"])

class PatientProfileUpdate(BaseModel):
    age:                Optional[int]    = None
    gender:             Optional[Gender] = None
    phone:              Optional[str]    = None
    blood_group:        Optional[str]    = None
    allergies:          Optional[str]    = None
    chronic_conditions: Optional[str]    = None
    emergency_contact:  Optional[str]    = None

@patient_router.get("/profile")
def get_patient_profile(
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    return {
        "user_id":           current_user.id,
        "full_name":         current_user.email,
        "email":             current_user.email,
        "age":               patient.age,
        "gender":            patient.gender,
        "phone":             patient.phone,
        "blood_group":       patient.blood_group,
        "allergies":         patient.allergies,
        "chronic_conditions": patient.chronic_conditions,
        "emergency_contact": patient.emergency_contact,
    }

@patient_router.put("/profile")
def update_patient_profile(
    data: PatientProfileUpdate,
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(patient, field, value)
    db.commit()
    db.refresh(patient)
    return {"message": "Profile updated successfully"}

@patient_router.get("/appointments")
def get_patient_appointments(
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    appointments = db.query(Appointment).filter(
        Appointment.patient_id == patient.id
    ).order_by(Appointment.scheduled_at.desc()).all()

    result = []
    for appt in appointments:
        doctor_user = db.query(User).filter(User.id == appt.doctor.user_id).first()
        result.append({
            "id":               appt.id,
            "doctor_name":      doctor_user.full_name if doctor_user else "Unknown",
            "doctor_specialty": appt.doctor.specialty,
            "scheduled_at":     appt.scheduled_at.isoformat(),
            "duration_minutes": appt.duration_minutes,
            "status":           appt.status,
            "urgency":          appt.urgency,
        })
    return result

@patient_router.get("/pre-screenings")
def get_patient_screenings(
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    screenings = db.query(PreScreening).filter(
        PreScreening.patient_id == patient.id
    ).order_by(PreScreening.created_at.desc()).all()

    return [{
        "id":                    s.id,
        "chief_complaint":       s.chief_complaint,
        "urgency":               s.urgency,
        "severity":              s.severity,
        "recommended_specialist": s.recommended_specialist,
        "is_report_generated":   s.is_report_generated,
        "created_at":            s.created_at.isoformat(),
    } for s in screenings]


# ── Doctor Router ─────────────────────────────────────────────────────────────

doctor_router = APIRouter(prefix="/doctor", tags=["Doctor"])

class DoctorProfileUpdate(BaseModel):
    specialty:        Optional[str]   = None
    qualifications:   Optional[str]   = None
    experience_years: Optional[int]   = None
    bio:              Optional[str]   = None
    consultation_fee: Optional[float] = None
    is_available:     Optional[bool]  = None

class TimeSlotCreate(BaseModel):
    day_of_week: int   # 0=Mon … 6=Sun
    start_time:  str   # "09:00"
    end_time:    str   # "17:00"

class DoctorNotes(BaseModel):
    notes: str

@doctor_router.get("/profile")
def get_doctor_profile(
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db),
):
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    return {
        "id":               doctor.id,
        "full_name":        current_user.full_name,
        "email":            current_user.email,
        "specialty":        doctor.specialty,
        "qualifications":   doctor.qualifications,
        "experience_years": doctor.experience_years,
        "bio":              doctor.bio,
        "consultation_fee": doctor.consultation_fee,
        "is_available":     doctor.is_available,
    }

@doctor_router.put("/profile")
def update_doctor_profile(
    data: DoctorProfileUpdate,
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db),
):
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(doctor, field, value)
    db.commit()
    return {"message": "Profile updated"}

# ── Doctor Time Slots ─────────────────────────────────────────────────────────

@doctor_router.get("/slots")
def get_my_slots(
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db),
):
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    slots  = db.query(DoctorTimeSlot).filter(
        DoctorTimeSlot.doctor_id == doctor.id,
        DoctorTimeSlot.is_active == True,
    ).all()
    days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
    return [{
        "id":          s.id,
        "day":         days[s.day_of_week],
        "day_of_week": s.day_of_week,
        "start_time":  s.start_time,
        "end_time":    s.end_time,
    } for s in slots]

@doctor_router.post("/slots")
def add_slot(
    slot: TimeSlotCreate,
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db),
):
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    new_slot = DoctorTimeSlot(
        doctor_id=doctor.id,
        day_of_week=slot.day_of_week,
        start_time=slot.start_time,
        end_time=slot.end_time,
    )
    db.add(new_slot)
    db.commit()
    db.refresh(new_slot)
    return {"message": "Slot added", "slot_id": new_slot.id}

@doctor_router.delete("/slots/{slot_id}")
def remove_slot(
    slot_id: int,
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db),
):
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    slot   = db.query(DoctorTimeSlot).filter(
        DoctorTimeSlot.id == slot_id,
        DoctorTimeSlot.doctor_id == doctor.id,
    ).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    slot.is_active = False
    db.commit()
    return {"message": "Slot removed"}

# ── Doctor Appointments ───────────────────────────────────────────────────────

@doctor_router.get("/appointments/today")
def get_today_appointments(
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db),
):
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    today_start = datetime.utcnow().replace(hour=0,  minute=0,  second=0,  microsecond=0)
    today_end   = datetime.utcnow().replace(hour=23, minute=59, second=59, microsecond=0)

    appointments = db.query(Appointment).filter(
        Appointment.doctor_id == doctor.id,
        Appointment.scheduled_at >= today_start,
        Appointment.scheduled_at <= today_end,
        Appointment.status.in_([AppointmentStatus.pending, AppointmentStatus.confirmed]),
    ).order_by(Appointment.scheduled_at).all()

    return [_format_appointment(appt, db) for appt in appointments]

@doctor_router.get("/appointments/upcoming")
def get_upcoming_appointments(
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db),
):
    doctor    = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    from_date = datetime.utcnow()

    appointments = db.query(Appointment).filter(
        Appointment.doctor_id == doctor.id,
        Appointment.scheduled_at >= from_date,
        Appointment.status.in_([AppointmentStatus.pending, AppointmentStatus.confirmed]),
    ).order_by(Appointment.scheduled_at).all()

    return [_format_appointment(appt, db) for appt in appointments]

@doctor_router.get("/appointments/{appointment_id}/detail")
def get_appointment_detail(
    appointment_id: int,
    current_user: User = Depends(require_doctor_or_admin),
    db: Session = Depends(get_db),
):
    """Full patient detail + pre-screening summary + classification for a doctor."""
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    patient_user = db.query(User).filter(User.id == appt.patient.user_id).first()
    screening    = appt.pre_screening

    return {
        "appointment": {
            "id":               appt.id,
            "scheduled_at":     appt.scheduled_at.isoformat(),
            "duration_minutes": appt.duration_minutes,
            "status":           appt.status,
            "urgency":          appt.urgency,
            "notes":            appt.notes,
        },
        "patient": {
            "id":                  appt.patient.id,
            "full_name":           patient_user.full_name if patient_user else "Unknown",
            "email":               patient_user.email if patient_user else "",
            "age":                 appt.patient.age,
            "gender":              appt.patient.gender,
            "phone":               appt.patient.phone,
            "blood_group":         appt.patient.blood_group,
            "allergies":           appt.patient.allergies,
            "chronic_conditions":  appt.patient.chronic_conditions,
            "emergency_contact":   appt.patient.emergency_contact,
        },
        "pre_screening": {
            "id":                    screening.id        if screening else None,
            "chief_complaint":       screening.chief_complaint  if screening else None,
            "urgency":               screening.urgency   if screening else None,
            "severity":              screening.severity  if screening else None,
            "summary":               screening.summary   if screening else None,
            "classification":        screening.classification if screening else None,
            "report_path":           screening.report_path    if screening else None,
            "is_report_generated":   screening.is_report_generated if screening else False,
            "recommended_duration":  screening.recommended_duration_minutes if screening else 30,
        } if screening else None,
    }

@doctor_router.put("/appointments/{appointment_id}/notes")
def add_appointment_notes(
    appointment_id: int,
    data: DoctorNotes,
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db),
):
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    appt.notes  = data.notes
    appt.status = AppointmentStatus.completed
    db.commit()
    return {"message": "Notes saved and appointment marked complete"}

@doctor_router.put("/appointments/{appointment_id}/status")
def update_appointment_status(
    appointment_id: int,
    status: AppointmentStatus,
    current_user: User = Depends(require_doctor_or_admin),
    db: Session = Depends(get_db),
):
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    appt.status = status
    db.commit()
    return {"message": f"Status updated to {status}"}


# ── Appointment Booking (Patient-facing) ─────────────────────────────────────

appointment_router = APIRouter(prefix="/appointments", tags=["Appointments"])

class BookAppointmentRequest(BaseModel):
    doctor_id:       int
    scheduled_at:    datetime
    pre_screening_id: Optional[int] = None

class AvailableSlotsRequest(BaseModel):
    doctor_id:  int
    date:       str   # "YYYY-MM-DD"
    urgency:    str = "routine"
    severity:   int = 5

@appointment_router.post("/available-slots")
def get_available_slots(
    req: AvailableSlotsRequest,
    db: Session = Depends(get_db),
):
    """
    Returns available time slots for a doctor on a given date.
    Slot duration is dynamic based on urgency + severity.
    """
    from datetime import date
    target_date = datetime.strptime(req.date, "%Y-%m-%d").date()
    day_of_week = target_date.weekday()  # 0=Mon

    doctor = db.query(Doctor).filter(Doctor.id == req.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    # Get doctor's availability for this day
    day_slots = db.query(DoctorTimeSlot).filter(
        DoctorTimeSlot.doctor_id == req.doctor_id,
        DoctorTimeSlot.day_of_week == day_of_week,
        DoctorTimeSlot.is_active == True,
    ).all()

    if not day_slots:
        return {"available_slots": [], "message": "Doctor not available on this day"}

    # Calculate duration for this patient's case
    duration = calculate_appointment_duration(req.urgency, req.severity)

    # Get already booked appointments for this day
    day_start = datetime.combine(target_date, datetime.min.time())
    day_end   = datetime.combine(target_date, datetime.max.time())
    booked    = db.query(Appointment).filter(
        Appointment.doctor_id == req.doctor_id,
        Appointment.scheduled_at >= day_start,
        Appointment.scheduled_at <= day_end,
        Appointment.status.notin_([AppointmentStatus.cancelled]),
    ).all()

    booked_times = [(a.scheduled_at, a.scheduled_at + timedelta(minutes=a.duration_minutes)) for a in booked]

    # Generate free slots
    available = []
    for window in day_slots:
        slot_start = datetime.combine(target_date, datetime.strptime(window.start_time, "%H:%M").time())
        slot_end   = datetime.combine(target_date, datetime.strptime(window.end_time,   "%H:%M").time())

        current = slot_start
        while current + timedelta(minutes=duration) <= slot_end:
            end = current + timedelta(minutes=duration)
            # Check no overlap with booked appointments
            overlap = any(
                not (end <= b_start or current >= b_end)
                for b_start, b_end in booked_times
            )
            if not overlap:
                available.append({
                    "start":            current.isoformat(),
                    "end":              end.isoformat(),
                    "duration_minutes": duration,
                    "label":            current.strftime("%I:%M %p"),
                })
            current += timedelta(minutes=duration)

    return {
        "available_slots":    available,
        "duration_minutes":   duration,
        "urgency":            req.urgency,
        "severity":           req.severity,
        "total_slots":        len(available),
    }

@appointment_router.post("/book")
def book_appointment(
    req: BookAppointmentRequest,
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    doctor = db.query(Doctor).filter(Doctor.id == req.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    # Pull screening info for dynamic duration
    screening = None
    urgency   = Urgency.routine
    duration  = 30

    if req.pre_screening_id:
        screening = db.query(PreScreening).filter(PreScreening.id == req.pre_screening_id).first()
        if screening:
            urgency  = screening.urgency
            duration = screening.recommended_duration_minutes

    # Conflict check
    appt_end = req.scheduled_at + timedelta(minutes=duration)
    conflict  = db.query(Appointment).filter(
        Appointment.doctor_id == req.doctor_id,
        Appointment.status.notin_([AppointmentStatus.cancelled]),
        Appointment.scheduled_at < appt_end,
        (Appointment.scheduled_at + timedelta(minutes=duration)) > req.scheduled_at,
    ).first()
    if conflict:
        raise HTTPException(status_code=409, detail="This time slot is already booked")

    appt = Appointment(
        patient_id=patient.id,
        doctor_id=req.doctor_id,
        pre_screening_id=req.pre_screening_id,
        scheduled_at=req.scheduled_at,
        duration_minutes=duration,
        urgency=urgency,
        status=AppointmentStatus.confirmed,
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)

    return {
        "message":          "Appointment booked successfully",
        "appointment_id":   appt.id,
        "scheduled_at":     appt.scheduled_at.isoformat(),
        "duration_minutes": appt.duration_minutes,
        "status":           appt.status,
        "urgency":          appt.urgency,
    }

@appointment_router.put("/{appointment_id}/cancel")
def cancel_appointment(
    appointment_id: int,
    reason: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    appt.status              = AppointmentStatus.cancelled
    appt.cancellation_reason = reason
    db.commit()
    return {"message": "Appointment cancelled"}


# ── Admin Router ──────────────────────────────────────────────────────────────

admin_router = APIRouter(prefix="/admin", tags=["Admin"])

@admin_router.get("/stats")
def get_stats(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return {
        "total_users":        db.query(User).count(),
        "total_patients":     db.query(Patient).count(),
        "total_doctors":      db.query(Doctor).count(),
        "total_appointments": db.query(Appointment).count(),
        "total_screenings":   db.query(PreScreening).count(),
        "appointments_today": db.query(Appointment).filter(
            Appointment.scheduled_at >= datetime.utcnow().replace(hour=0, minute=0, second=0),
            Appointment.scheduled_at <= datetime.utcnow().replace(hour=23, minute=59, second=59),
        ).count(),
        "pending_appointments": db.query(Appointment).filter(
            Appointment.status == AppointmentStatus.pending
        ).count(),
        "emergency_cases": db.query(PreScreening).filter(
            PreScreening.urgency == Urgency.emergency
        ).count(),
    }

@admin_router.get("/users")
def list_users(
    role:   Optional[str] = None,
    page:   int = 1,
    limit:  int = 20,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    total = query.count()
    users = query.offset((page - 1) * limit).limit(limit).all()
    return {
        "total": total,
        "page":  page,
        "users": [{
            "id":        u.id,
            "email":     u.email,
            "full_name": u.full_name,
            "role":      u.role,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        } for u in users],
    }

@admin_router.put("/users/{user_id}/toggle-active")
def toggle_user_active(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not user.is_active
    db.commit()
    return {"message": f"User {'activated' if user.is_active else 'deactivated'}", "is_active": user.is_active}

@admin_router.get("/appointments")
def list_all_appointments(
    status: Optional[str] = None,
    page:   int = 1,
    limit:  int = 20,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = db.query(Appointment)
    if status:
        query = query.filter(Appointment.status == status)
    total = query.count()
    appts = query.order_by(Appointment.scheduled_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return {
        "total": total,
        "appointments": [_format_appointment(a, db) for a in appts],
    }

@admin_router.get("/doctors")
def list_doctors(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    doctors = db.query(Doctor).all()
    return [{
        "id":               d.id,
        "full_name":        db.query(User).filter(User.id == d.user_id).first().full_name,
        "specialty":        d.specialty,
        "experience_years": d.experience_years,
        "is_available":     d.is_available,
        "consultation_fee": d.consultation_fee,
    } for d in doctors]

@admin_router.post("/create-doctor")
def create_doctor_account(
    req: RegisterRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin creates doctor accounts directly."""
    req.role = UserRole.doctor
    user   = register_user(db, req)
    doctor = Doctor(user_id=user.id, specialty="General Practice")
    db.add(doctor)
    db.commit()
    return {"message": "Doctor account created", "user_id": user.id}


# ── Pre-Screening Save (called after Phase 1+3 complete) ─────────────────────

screening_router = APIRouter(prefix="/screening", tags=["Pre-Screening"])

class SaveScreeningRequest(BaseModel):
    session_id:     str
    summary:        dict
    classification: dict
    report_path:    Optional[str] = None

@screening_router.post("/save")
def save_screening(
    req: SaveScreeningRequest,
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    """Save Phase 1 + Phase 3 results to DB after pre-screening completes."""
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    # Calculate dynamic duration
    urgency  = req.classification.get("urgency_flag", "routine")
    severity = req.summary.get("severity", 5)
    duration = calculate_appointment_duration(urgency, int(severity))

    screening = PreScreening(
        patient_id=patient.id,
        session_id=req.session_id,
        summary=req.summary,
        classification=req.classification,
        report_path=req.report_path,
        chief_complaint=req.summary.get("chief_complaint"),
        urgency=urgency,
        severity=int(severity),
        recommended_specialist=req.classification.get("primary_specialist"),
        recommended_duration_minutes=duration,
        is_report_generated=bool(req.report_path),
    )
    db.add(screening)
    db.commit()
    db.refresh(screening)

    return {
        "screening_id":              screening.id,
        "recommended_duration_minutes": duration,
        "urgency":                   urgency,
        "message":                   "Pre-screening saved successfully",
    }

@screening_router.get("/{screening_id}")
def get_screening(
    screening_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    screening = db.query(PreScreening).filter(PreScreening.id == screening_id).first()
    if not screening:
        raise HTTPException(status_code=404, detail="Screening not found")
    return {
        "id":             screening.id,
        "chief_complaint": screening.chief_complaint,
        "urgency":        screening.urgency,
        "severity":       screening.severity,
        "summary":        screening.summary,
        "classification": screening.classification,
        "report_path":    screening.report_path,
        "created_at":     screening.created_at.isoformat(),
        "recommended_duration_minutes": screening.recommended_duration_minutes,
    }


# ── Shared Helper ─────────────────────────────────────────────────────────────

def _format_appointment(appt: Appointment, db: Session) -> dict:
    patient_user = db.query(User).filter(User.id == appt.patient.user_id).first()
    doctor_user  = db.query(User).filter(User.id == appt.doctor.user_id).first()
    return {
        "id":               appt.id,
        "patient_name":     patient_user.full_name  if patient_user else "Unknown",
        "patient_email":    patient_user.email       if patient_user else "",
        "doctor_name":      doctor_user.full_name    if doctor_user  else "Unknown",
        "doctor_specialty": appt.doctor.specialty,
        "scheduled_at":     appt.scheduled_at.isoformat(),
        "duration_minutes": appt.duration_minutes,
        "status":           appt.status,
        "urgency":          appt.urgency,
        "notes":            appt.notes,
        "pre_screening_id": appt.pre_screening_id,
        "patient_age":      appt.patient.age,
        "patient_gender":   appt.patient.gender,
    }


# ── Public Available Doctors (patients use this for booking) ──────────────────

@appointment_router.get("/doctors")
def list_available_doctors(
    db: Session = Depends(get_db),
):
    """
    Public endpoint — no auth required.
    Returns all doctors with is_available=True for patient booking.
    """
    doctors = db.query(Doctor).filter(Doctor.is_available == True).all()
    result = []
    for d in doctors:
        user = db.query(User).filter(User.id == d.user_id).first()
        if user:
            result.append({
                "id":               d.id,
                "full_name":        user.full_name,
                "specialty":        d.specialty,
                "qualifications":   d.qualifications,
                "experience_years": d.experience_years,
                "consultation_fee": d.consultation_fee,
                "bio":              d.bio,
                "is_available":     d.is_available,
            })
    return result