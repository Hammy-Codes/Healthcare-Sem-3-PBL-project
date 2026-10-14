#What this does:
#- Validates the email and password through UserCreate.
#- Hashes the password using Argon2.
#- Rejects duplicate email addresses.
#- Saves the user in PostgreSQL.
#- Returns the user's public fields, never the password hash.


import os
from datetime import datetime, timedelta, timezone
from uuid import UUID
from fastapi.middleware.cors import CORSMiddleware
from typing import Callable
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pathlib import Path
import jwt
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session
from pwdlib import PasswordHash
from sqlalchemy.exc import IntegrityError
import models
from database import get_db
from schemas import (
    LoginRequest,
    PatientConsentCreate,
    PatientConsentResponse,
    PatientCreate,
    PatientResponse,
    UserCreate,
    UserResponse,
)

load_dotenv(Path(__file__).resolve().parent / ".env")

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
)

if not JWT_SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY is missing from backend/.env")

app = FastAPI(
    title="Privacy Aware Clinical Care Platform",
    description="Backend API for the healthcare project",
    version="0.1.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

password_hasher = PasswordHash.recommended()
bearer_scheme = HTTPBearer()


@app.get("/")
def root():
    return {
        "message": "Healthcare Platform API is running",
        "status": "ok",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.post(
    "/auth/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
):
    existing_user = db.scalar(
        select(models.User).where(
            models.User.email == user_data.email
        )
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = models.User(
        email=user_data.email,
        password_hash=password_hasher.hash(user_data.password),
        full_name=user_data.full_name,
    )

    db.add(user)

    try:
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        raise

    return user


@app.post("/auth/login")
def login_user(
    login_data: LoginRequest,
    db: Session = Depends(get_db),
):
    user = db.scalar(
        select(models.User).where(
            models.User.email == login_data.email
        )
    )

    if (
        user is None
        or not password_hasher.verify(
            login_data.password,
            user.password_hash,
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    access_token = jwt.encode(
        {
            "sub": str(user.id),
            "role": user.role,
            "exp": expires_at,
        },
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired access token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
        )
        subject = payload.get("sub")

        if not subject:
            raise credentials_exception

        user_id = UUID(subject)

    except (jwt.InvalidTokenError, ValueError, TypeError):
        raise credentials_exception

    user = db.get(models.User, user_id)

    if user is None or not user.is_active:
        raise credentials_exception

    return user


@app.get("/auth/me", response_model=UserResponse)
def read_current_user(
    current_user: models.User = Depends(get_current_user),
):
    return current_user

def require_role(*allowed_roles: str) -> Callable:
    def role_checker(
        current_user: models.User = Depends(get_current_user),
    ):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource",
            )
        return current_user

    return role_checker


def require_doctor_patient_relationship(
    patient_id: UUID,
    current_user: models.User,
    db: Session,
) -> models.Doctor:
    if current_user.role != "doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Doctor access required",
        )

    doctor = db.scalar(
        select(models.Doctor).where(
            models.Doctor.user_id == current_user.id
        )
    )

    if doctor is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Doctor profile not found",
        )

    relationship = db.scalar(
        select(models.CareRelationship).where(
            models.CareRelationship.patient_id == patient_id,
            models.CareRelationship.doctor_id == doctor.id,
            models.CareRelationship.ended_at.is_(None),
        )
    )

    if relationship is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No active care relationship with this patient",
        )
    consent = db.scalar(
        select(models.PatientConsent).where(
            models.PatientConsent.patient_id == patient_id,
            models.PatientConsent.doctor_id == doctor.id,
            models.PatientConsent.scope == "profile",
            models.PatientConsent.status == "granted",
            models.PatientConsent.revoked_at.is_(None),
        ).order_by(models.PatientConsent.granted_at.desc())
        )

    now = datetime.now(timezone.utc)

    if (
        consent is None
        or (
            consent.expires_at is not None
            and consent.expires_at <= now
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Valid profile consent required",
        )


    return doctor


@app.post(
    "/patients/me",
    response_model=PatientResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_my_patient_profile(
    patient_data: PatientCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing_patient = db.scalar(
        select(models.Patient).where(
            models.Patient.user_id == current_user.id
        )
    )

    if existing_patient:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Patient profile already exists",
        )

    patient = models.Patient(
        user_id=current_user.id,
        date_of_birth=patient_data.date_of_birth,
        phone=patient_data.phone,
    )

    db.add(patient)

    try:
        db.commit()
        db.refresh(patient)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Patient profile already exists",
        )

    return patient


@app.get("/patients/me", response_model=PatientResponse)
def get_my_patient_profile(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient = db.scalar(
        select(models.Patient).where(
            models.Patient.user_id == current_user.id
        )
    )

    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found",
        )

    return patient


@app.get("/doctors/patients/{patient_id}/profile", response_model=PatientResponse)
def get_patient_profile_as_doctor(
    patient_id: UUID,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # 1. Confirm the user is a doctor and has an active care relationship.
    require_doctor_patient_relationship(patient_id, current_user, db)

    # 2. Fetch the requested patient's profile.
    patient = db.scalar(
        select(models.Patient).where(models.Patient.id == patient_id)
    )

    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found",
        )

    return patient


@app.post(
    "/patients/me/consents",
    response_model=PatientConsentResponse,
    status_code=status.HTTP_201_CREATED,
)
def grant_consent(
    payload: PatientConsentCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "patient":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Patient access required",
        )

    patient = db.scalar(
        select(models.Patient).where(
            models.Patient.user_id == current_user.id
        )
    )
    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found",
        )

    doctor = db.get(models.Doctor, payload.doctor_id)
    if doctor is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found",
        )

    if payload.expires_at is not None:
        expiry = payload.expires_at
        if expiry.tzinfo is None or expiry.utcoffset() is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="expires_at must include a timezone",
            )
        if expiry <= datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="expires_at must be in the future",
            )

    consent = models.PatientConsent(
        patient_id=patient.id,
        doctor_id=doctor.id,
        scope=payload.scope,
        status="granted",
        expires_at=payload.expires_at,
    )
    db.add(consent)
    db.commit()
    db.refresh(consent)
    return consent


@app.post(
    "/patients/me/consents/{consent_id}/revoke",
    response_model=PatientConsentResponse,
)
def revoke_consent(
    consent_id: UUID,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "patient":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Patient access required",
        )

    patient = db.scalar(
        select(models.Patient).where(
            models.Patient.user_id == current_user.id
        )
    )
    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found",
        )

    consent = db.scalar(
        select(models.PatientConsent).where(
            models.PatientConsent.id == consent_id,
            models.PatientConsent.patient_id == patient.id,
        )
    )
    if consent is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consent record not found",
        )

    if consent.status == "granted":
        consent.status = "revoked"
        consent.revoked_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(consent)

    return consent
