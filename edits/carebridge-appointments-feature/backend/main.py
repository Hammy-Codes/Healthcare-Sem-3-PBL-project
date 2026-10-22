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
from pwdlib import PasswordHash
import jwt
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import or_, select
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

import models
from database import get_db
from schemas import (
    LoginRequest,
    AppointmentCreate,
    AppointmentResponse,
    DoctorDirectoryResponse,
    PatientConsentCreate,
    PatientConsentResponse,
    PatientCreate,
    PatientResponse,
    StructuredSymptomSubmissionCreate,
    StructuredSymptomSubmissionResponse,
    SymptomCatalogResponse,
    SymptomSubmissionCreate,
    SymptomSubmissionResponse,
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
        select(models.PatientConsent)
        .where(
            models.PatientConsent.patient_id == patient_id,
            models.PatientConsent.doctor_id == doctor.id,
            models.PatientConsent.scope == "profile",
        )
        .order_by(
            models.PatientConsent.granted_at.desc(),
            models.PatientConsent.id.desc(),
        )
        .limit(1)
    )

    now = datetime.now(timezone.utc)
    expires_at = consent.expires_at if consent is not None else None

    # SQLite may return naive datetimes; treat stored expiry as UTC.
    if expires_at is not None and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if (
        consent is None
        or consent.status != "granted"
        or consent.revoked_at is not None
        or (expires_at is not None and expires_at <= now)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Valid profile consent required",
        )

    return doctor


@app.get(
    "/symptoms/catalog",
    response_model=list[SymptomCatalogResponse],
)
def search_symptom_catalog(
    q: str | None = None,
    category: str | None = None,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    limit = max(1, min(limit, 500))

    query = select(models.SymptomCatalog).where(
        models.SymptomCatalog.is_active.is_(True)
    )

    if category:
        query = query.where(
            models.SymptomCatalog.category.ilike(category.strip())
        )

    if q and q.strip():
        search_term = f"%{q.strip()}%"
        query = query.where(
            or_(
                models.SymptomCatalog.name.ilike(search_term),
                models.SymptomCatalog.category.ilike(search_term),
                models.SymptomCatalog.aliases.cast(models.String).ilike(
                    search_term
                ),
            )
        )

    query = query.order_by(
        models.SymptomCatalog.category,
        models.SymptomCatalog.name,
    ).limit(limit)

    return db.scalars(query).all()


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

@app.post(
    "/patients/me/symptoms",
    response_model=SymptomSubmissionResponse,
    status_code=status.HTTP_201_CREATED,
)
def submit_my_symptoms(
    symptom_data: SymptomSubmissionCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "patient":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only patients can submit symptoms",
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

    submission = models.SymptomSubmission(
        patient_id=patient.id,
        symptoms=symptom_data.symptoms,
        duration=symptom_data.duration,
        notes=symptom_data.notes,
    )

    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission



@app.get(
    "/patients/me/symptoms",
    response_model=list[SymptomSubmissionResponse],
)
def get_my_symptoms(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "patient":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only patients can view their symptom submissions",
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

    submissions = db.scalars(
        select(models.SymptomSubmission)
        .where(models.SymptomSubmission.patient_id == patient.id)
        .order_by(models.SymptomSubmission.created_at.desc())
    ).all()

    results = []

    for submission in submissions:
        items = db.scalars(
            select(models.SymptomSubmissionItem)
            .where(
                models.SymptomSubmissionItem.submission_id
                == submission.id
            )
        ).all()

        symptom_ids = [item.symptom_id for item in items]
        symptom_names = []

        if symptom_ids:
            catalog_items = db.scalars(
                select(models.SymptomCatalog).where(
                    models.SymptomCatalog.id.in_(symptom_ids)
                )
            ).all()

            names_by_id = {
                item.id: item.name for item in catalog_items
            }
            symptom_names = [
                names_by_id[symptom_id]
                for symptom_id in symptom_ids
                if symptom_id in names_by_id
            ]

        results.append(
            SymptomSubmissionResponse(
                id=submission.id,
                patient_id=submission.patient_id,
                symptoms=submission.symptoms,
                duration=submission.duration,
                notes=submission.notes,
                status=submission.status,
                created_at=submission.created_at,
                severity=submission.severity,
                symptom_ids=symptom_ids,
                symptom_names=symptom_names,
            )
        )

    return results


@app.post(
    "/patients/me/symptoms/structured",
    response_model=StructuredSymptomSubmissionResponse,
    status_code=status.HTTP_201_CREATED,
)
def submit_structured_symptoms(
    symptom_data: StructuredSymptomSubmissionCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "patient":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only patients can submit symptoms",
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

    # Remove duplicate IDs while preserving selection order.
    symptom_ids = list(dict.fromkeys(symptom_data.symptom_ids))

    catalog_items = db.scalars(
        select(models.SymptomCatalog).where(
            models.SymptomCatalog.id.in_(symptom_ids),
            models.SymptomCatalog.is_active.is_(True),
        )
    ).all()

    catalog_by_id = {item.id: item for item in catalog_items}

    if len(catalog_by_id) != len(symptom_ids):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="One or more selected symptoms are invalid or inactive",
        )

    submission = models.SymptomSubmission(
        patient_id=patient.id,
        symptoms=", ".join(
            catalog_by_id[symptom_id].name for symptom_id in symptom_ids
        ),
        duration=symptom_data.duration,
        severity=symptom_data.severity,
        notes=symptom_data.notes,
    )
    db.add(submission)
    db.flush()

    for symptom_id in symptom_ids:
        db.add(
            models.SymptomSubmissionItem(
                submission_id=submission.id,
                symptom_id=symptom_id,
            )
        )

    try:
        db.commit()
        db.refresh(submission)
    except Exception:
        db.rollback()
        raise

    return StructuredSymptomSubmissionResponse(
        id=submission.id,
        patient_id=submission.patient_id,
        symptom_ids=symptom_ids,
        symptom_names=[
            catalog_by_id[symptom_id].name for symptom_id in symptom_ids
        ],
        duration=submission.duration,
        severity=submission.severity,
        notes=submission.notes,
        status=submission.status,
        created_at=submission.created_at,
    )

# Appointment booking and live clinician directory.
@app.get("/doctors/directory", response_model=list[DoctorDirectoryResponse])
def list_doctors_directory(
    q: str | None = None,
    db: Session = Depends(get_db),
):
    query = (
        select(models.Doctor, models.User, models.Facility)
        .join(models.User, models.Doctor.user_id == models.User.id)
        .outerjoin(models.Facility, models.Doctor.facility_id == models.Facility.id)
        .where(models.User.is_active.is_(True))
    )
    if q and q.strip():
        term = f"%{q.strip()}%"
        query = query.where(
            or_(models.User.full_name.ilike(term), models.Doctor.specialty.ilike(term),
                models.Facility.name.ilike(term))
        )
    rows = db.execute(query.order_by(models.User.full_name)).all()
    return [
        DoctorDirectoryResponse(
            id=doctor.id, full_name=user.full_name, specialty=doctor.specialty,
            facility_name=facility.name if facility else None,
            facility_address=facility.address if facility else None,
        )
        for doctor, user, facility in rows
    ]


def _appointment_response(appointment: models.Appointment, db: Session):
    row = db.execute(
        select(models.User.full_name, models.Doctor.specialty)
        .join(models.Doctor, models.Doctor.user_id == models.User.id)
        .where(models.Doctor.id == appointment.doctor_id)
    ).first()
    return AppointmentResponse(
        id=appointment.id, patient_id=appointment.patient_id,
        doctor_id=appointment.doctor_id, doctor_name=row[0], specialty=row[1],
        scheduled_at=appointment.scheduled_at, reason=appointment.reason,
        status=appointment.status, created_at=appointment.created_at,
    )


@app.post("/patients/me/appointments", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
def create_appointment(
    payload: AppointmentCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Only patients can book appointments")
    patient = db.scalar(select(models.Patient).where(models.Patient.user_id == current_user.id))
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    if payload.scheduled_at.tzinfo is None or payload.scheduled_at.utcoffset() is None:
        raise HTTPException(status_code=422, detail="scheduled_at must include a timezone")
    if payload.scheduled_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=422, detail="Appointment must be scheduled in the future")
    doctor = db.get(models.Doctor, payload.doctor_id)
    if doctor is None:
        raise HTTPException(status_code=404, detail="Doctor not found")
    doctor_user = db.get(models.User, doctor.user_id)
    if doctor_user is None or not doctor_user.is_active:
        raise HTTPException(status_code=404, detail="Doctor is not available")
    appointment = models.Appointment(
        patient_id=patient.id, doctor_id=doctor.id,
        scheduled_at=payload.scheduled_at, reason=payload.reason.strip(),
        status="booked",
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return _appointment_response(appointment, db)


@app.get("/patients/me/appointments", response_model=list[AppointmentResponse])
def list_my_appointments(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Patient access required")
    patient = db.scalar(select(models.Patient).where(models.Patient.user_id == current_user.id))
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    appointments = db.scalars(
        select(models.Appointment).where(models.Appointment.patient_id == patient.id)
        .order_by(models.Appointment.scheduled_at.desc())
    ).all()
    return [_appointment_response(item, db) for item in appointments]


@app.post("/patients/me/appointments/{appointment_id}/cancel", response_model=AppointmentResponse)
def cancel_my_appointment(
    appointment_id: UUID,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Patient access required")
    patient = db.scalar(select(models.Patient).where(models.Patient.user_id == current_user.id))
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    appointment = db.scalar(
        select(models.Appointment).where(
            models.Appointment.id == appointment_id,
            models.Appointment.patient_id == patient.id,
        )
    )
    if appointment is None:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if appointment.status != "booked":
        raise HTTPException(status_code=409, detail="Only booked appointments can be cancelled")
    appointment.status = "cancelled"
    db.commit()
    db.refresh(appointment)
    return _appointment_response(appointment, db)
