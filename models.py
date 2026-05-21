"""
models.py — SQLAlchemy ORM models for MedScreen AI
Database: Supabase (PostgreSQL)
Auth:     Supabase Auth (no password stored in our DB)
"""

from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean,
    DateTime, ForeignKey, Enum as SAEnum, JSON, Index
)
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func
import enum

Base = declarative_base()


# ── Enums ─────────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    patient = "patient"
    doctor  = "doctor"
    admin   = "admin"

class Gender(str, enum.Enum):
    male       = "male"
    female     = "female"
    other      = "other"
    prefer_not = "prefer_not_to_say"

class AppointmentStatus(str, enum.Enum):
    pending   = "pending"
    confirmed = "confirmed"
    completed = "completed"
    cancelled = "cancelled"
    no_show   = "no_show"

class Urgency(str, enum.Enum):
    routine   = "routine"
    urgent    = "urgent"
    emergency = "emergency"


# ── Users ─────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id           = Column(Integer, primary_key=True, index=True)
    supabase_uid = Column(String(255), unique=True, index=True, nullable=False)
    # ↑ Links our DB user to Supabase Auth user
    # No password_hash — Supabase Auth handles passwords
    email        = Column(String(255), unique=True, index=True, nullable=False)
    full_name    = Column(String(255), nullable=False)
    role         = Column(SAEnum(UserRole, name="userrole"), nullable=False, default=UserRole.patient)
    is_active    = Column(Boolean, default=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    updated_at   = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    patient_profile = relationship("Patient", back_populates="user", uselist=False)
    doctor_profile  = relationship("Doctor",  back_populates="user", uselist=False)

    def __repr__(self):
        return f"<User {self.email} [{self.role}]>"


# ── Patient Profile ───────────────────────────────────────────────────────────

class Patient(Base):
    __tablename__ = "patients"

    id                 = Column(Integer, primary_key=True, index=True)
    user_id            = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    age                = Column(Integer)
    gender             = Column(SAEnum(Gender, name="gender"))
    phone              = Column(String(20))
    blood_group        = Column(String(5))
    allergies          = Column(Text)
    chronic_conditions = Column(Text)
    emergency_contact  = Column(String(255))
    created_at         = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user           = relationship("User",         back_populates="patient_profile")
    pre_screenings = relationship("PreScreening", back_populates="patient", order_by="PreScreening.created_at.desc()")
    appointments   = relationship("Appointment",  back_populates="patient", order_by="Appointment.scheduled_at.desc()")

    def __repr__(self):
        return f"<Patient user_id={self.user_id}>"


# ── Doctor Profile ────────────────────────────────────────────────────────────

class Doctor(Base):
    __tablename__ = "doctors"

    id               = Column(Integer, primary_key=True, index=True)
    user_id          = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    specialty        = Column(String(100), nullable=False, default="General Practice")
    qualifications   = Column(Text)
    experience_years = Column(Integer, default=0)
    bio              = Column(Text)
    consultation_fee = Column(Float, default=0.0)
    is_available     = Column(Boolean, default=True)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user         = relationship("User",           back_populates="doctor_profile")
    time_slots   = relationship("DoctorTimeSlot", back_populates="doctor", order_by="DoctorTimeSlot.day_of_week")
    appointments = relationship("Appointment",     back_populates="doctor", order_by="Appointment.scheduled_at.desc()")

    def __repr__(self):
        return f"<Doctor {self.specialty} user_id={self.user_id}>"


# ── Doctor Time Slots ─────────────────────────────────────────────────────────

class DoctorTimeSlot(Base):
    """
    Doctors define their own available time windows per day.
    day_of_week: 0=Monday … 6=Sunday
    """
    __tablename__ = "doctor_time_slots"

    id          = Column(Integer, primary_key=True, index=True)
    doctor_id   = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    day_of_week = Column(Integer, nullable=False)    # 0=Mon … 6=Sun
    start_time  = Column(String(5), nullable=False)  # "09:00"
    end_time    = Column(String(5), nullable=False)  # "17:00"
    is_active   = Column(Boolean, default=True)

    doctor = relationship("Doctor", back_populates="time_slots")

    __table_args__ = (
        Index("ix_slots_doctor_day", "doctor_id", "day_of_week"),
    )

    def __repr__(self):
        days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
        return f"<Slot {days[self.day_of_week]} {self.start_time}-{self.end_time}>"


# ── Pre-Screening ─────────────────────────────────────────────────────────────

class PreScreening(Base):
    __tablename__ = "pre_screenings"

    id                          = Column(Integer, primary_key=True, index=True)
    patient_id                  = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    session_id                  = Column(String(100), unique=True, index=True)
    summary                     = Column(JSON)
    classification              = Column(JSON)
    report_path                 = Column(String(500))
    chief_complaint             = Column(String(500))
    urgency                     = Column(SAEnum(Urgency, name="urgency"), default=Urgency.routine)
    severity                    = Column(Integer, default=0)
    recommended_specialist      = Column(String(100))
    recommended_duration_minutes = Column(Integer, default=30)
    is_report_generated         = Column(Boolean, default=False)
    created_at                  = Column(DateTime(timezone=True), server_default=func.now())

    patient     = relationship("Patient",     back_populates="pre_screenings")
    appointment = relationship("Appointment", back_populates="pre_screening", uselist=False)

    __table_args__ = (
        Index("ix_screenings_patient", "patient_id"),
    )

    def __repr__(self):
        return f"<PreScreening patient_id={self.patient_id} urgency={self.urgency}>"


# ── Appointments ──────────────────────────────────────────────────────────────

class Appointment(Base):
    __tablename__ = "appointments"

    id                  = Column(Integer, primary_key=True, index=True)
    patient_id          = Column(Integer, ForeignKey("patients.id",       ondelete="CASCADE"),  nullable=False)
    doctor_id           = Column(Integer, ForeignKey("doctors.id",        ondelete="CASCADE"),  nullable=False)
    pre_screening_id    = Column(Integer, ForeignKey("pre_screenings.id", ondelete="SET NULL"), nullable=True)
    scheduled_at        = Column(DateTime(timezone=True), nullable=False)
    duration_minutes    = Column(Integer, default=30)
    status              = Column(SAEnum(AppointmentStatus, name="appointmentstatus"), default=AppointmentStatus.pending)
    urgency             = Column(SAEnum(Urgency, name="urgency"), default=Urgency.routine)
    notes               = Column(Text)
    cancellation_reason = Column(Text)
    created_at          = Column(DateTime(timezone=True), server_default=func.now())
    updated_at          = Column(DateTime(timezone=True), onupdate=func.now())

    patient       = relationship("Patient",      back_populates="appointments")
    doctor        = relationship("Doctor",       back_populates="appointments")
    pre_screening = relationship("PreScreening", back_populates="appointment")

    __table_args__ = (
        Index("ix_appt_doctor_date",  "doctor_id",  "scheduled_at"),
        Index("ix_appt_patient_date", "patient_id", "scheduled_at"),
    )

    def __repr__(self):
        return f"<Appointment patient={self.patient_id} doctor={self.doctor_id} at={self.scheduled_at}>"
