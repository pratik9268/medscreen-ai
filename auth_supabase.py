"""
supabase_auth.py — Authentication via Supabase Auth
Replaces custom JWT + passlib entirely.
Supabase handles: tokens, refresh, email verify, password reset.
FastAPI just verifies the token Supabase issues.
"""

import os
from functools import lru_cache
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from supabase import create_client, Client

from database import get_db
from models import User, UserRole

# ── Supabase Client ───────────────────────────────────────────────────────────

SUPABASE_URL        = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY   = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    raise RuntimeError(
        "SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env\n"
        "Find them at: Supabase Dashboard → Settings → API"
    )


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    """Public client — used for auth operations (sign up, sign in)."""
    return create_client(SUPABASE_URL, SUPABASE_ANON_KEY)


@lru_cache(maxsize=1)
def get_supabase_admin() -> Client:
    """Service role client — used for admin operations (manage users)."""
    if not SUPABASE_SERVICE_KEY:
        raise RuntimeError("SUPABASE_SERVICE_KEY not set in .env")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


# ── Pydantic Schemas ──────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email:     EmailStr
    password:  str
    full_name: str
    role:      UserRole = UserRole.patient

class LoginRequest(BaseModel):
    email:    EmailStr
    password: str

class AuthResponse(BaseModel):
    access_token:  str
    refresh_token: str
    token_type:    str = "bearer"
    role:          UserRole
    user_id:       int       # our DB user id
    supabase_uid:  str       # supabase user id
    full_name:     str

class RefreshRequest(BaseModel):
    refresh_token: str


# ── Token Verification ────────────────────────────────────────────────────────

bearer_scheme = HTTPBearer()

def verify_supabase_token(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """
    Verify the Supabase JWT token.
    Supabase handles signature verification — we just call get_user().
    Returns the Supabase user dict.
    """
    token = credentials.credentials
    try:
        supabase = get_supabase()
        response = supabase.auth.get_user(token)
        if not response or not response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        return {"supabase_user": response.user, "token": token}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ── FastAPI Dependencies ──────────────────────────────────────────────────────

def get_current_user(
    token_data: dict = Depends(verify_supabase_token),
    db: Session = Depends(get_db),
) -> User:
    """
    Gets the current user from our DB using the Supabase UID.
    This links Supabase Auth identity to our application data.
    """
    supabase_user = token_data["supabase_user"]
    supabase_uid  = supabase_user.id

    user = db.query(User).filter(User.supabase_uid == supabase_uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found in database")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")
    return user


def require_role(*roles: UserRole):
    """Role-based access control factory."""
    def checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {[r.value for r in roles]}",
            )
        return current_user
    return checker

# Convenience shortcuts
require_patient         = require_role(UserRole.patient)
require_doctor          = require_role(UserRole.doctor)
require_admin           = require_role(UserRole.admin)
require_doctor_or_admin = require_role(UserRole.doctor, UserRole.admin)


# ── Auth Service Functions ────────────────────────────────────────────────────

def register_user(db: Session, req: RegisterRequest) -> AuthResponse:
    """
    1. Create user in Supabase Auth
    2. Create user record in our DB linked by supabase_uid
    3. Auto-create patient/doctor profile
    4. Return tokens
    """
    supabase = get_supabase()

    # Step 1 — Register with Supabase Auth
    try:
        auth_response = supabase.auth.sign_up({
            "email":    req.email,
            "password": req.password,
            "options": {
                "data": {
                    "full_name": req.full_name,
                    "role":      req.role.value,
                }
            }
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Registration failed: {str(e)}")

    if not auth_response.user:
        raise HTTPException(status_code=400, detail="Registration failed — no user returned")

    supabase_uid = auth_response.user.id

    # Step 2 — Check not already in our DB
    existing = db.query(User).filter(User.supabase_uid == supabase_uid).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already registered")

    # Step 3 — Create our DB user record
    from models import Patient, Doctor
    user = User(
        email=req.email,
        full_name=req.full_name,
        role=req.role,
        supabase_uid=supabase_uid,
    )
    db.add(user)
    db.flush()   # get user.id without committing

    # Step 4 — Auto-create role profile
    if req.role == UserRole.patient:
        db.add(Patient(user_id=user.id))
    elif req.role == UserRole.doctor:
        db.add(Doctor(user_id=user.id, specialty="General Practice"))

    db.commit()
    db.refresh(user)

    # Return tokens from Supabase session
    session = auth_response.session
    return AuthResponse(
        access_token=session.access_token  if session else "",
        refresh_token=session.refresh_token if session else "",
        role=user.role,
        user_id=user.id,
        supabase_uid=supabase_uid,
        full_name=user.full_name,
    )


def login_user(db: Session, req: LoginRequest) -> AuthResponse:
    """
    1. Sign in via Supabase Auth
    2. Look up our DB user by supabase_uid
    3. Return tokens + user info
    """
    supabase = get_supabase()

    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email":    req.email,
            "password": req.password,
        })
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not auth_response.user or not auth_response.session:
        raise HTTPException(status_code=401, detail="Login failed")

    supabase_uid = auth_response.user.id
    user = db.query(User).filter(User.supabase_uid == supabase_uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    return AuthResponse(
        access_token=auth_response.session.access_token,
        refresh_token=auth_response.session.refresh_token,
        role=user.role,
        user_id=user.id,
        supabase_uid=supabase_uid,
        full_name=user.full_name,
    )


def refresh_token(req: RefreshRequest) -> dict:
    """Exchange a refresh token for a new access token."""
    supabase = get_supabase()
    try:
        response = supabase.auth.refresh_session(req.refresh_token)
        if not response.session:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        return {
            "access_token":  response.session.access_token,
            "refresh_token": response.session.refresh_token,
            "token_type":    "bearer",
        }
    except Exception:
        raise HTTPException(status_code=401, detail="Token refresh failed")


def logout_user(token: str):
    """Invalidate the session in Supabase."""
    try:
        supabase = get_supabase()
        supabase.auth.sign_out()
    except Exception:
        pass   # logout should never hard-fail
