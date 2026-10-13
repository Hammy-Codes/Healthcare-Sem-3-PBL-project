#What this does:
#- Validates the email and password through UserCreate.
#- Hashes the password using Argon2.
#- Rejects duplicate email addresses.
#- Saves the user in PostgreSQL.
#- Returns the user's public fields, never the password hash.

from fastapi import Depends, FastAPI, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from pwdlib import PasswordHash

import models
from database import get_db
from schemas import UserCreate, UserResponse

app = FastAPI(
    title="Privacy Aware Clinical Care Platform",
    description="Backend API for the healthcare project",
    version="0.1.0",
)

password_hasher = PasswordHash.recommended()


@app.get("/")
def root():
    return {
        "message": "Healthcare Platform API is running",
        "status": "ok",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
    }


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
