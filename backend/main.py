#What this does:
#- Validates the email and password through UserCreate.
#- Hashes the password using Argon2.
#- Rejects duplicate email addresses.
#- Saves the user in PostgreSQL.
#- Returns the user's public fields, never the password hash.


import os
from datetime import datetime, timedelta, timezone
from uuid import UUID
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
