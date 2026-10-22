
from getpass import getpass

from pwdlib import PasswordHash
from sqlalchemy import select

import models
from database import SessionLocal

EMAIL = "dev.doctor@example.com"
password_hasher = PasswordHash.recommended()


def main():
    password = getpass("Set a password for the development doctor: ")
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters.")

    db = SessionLocal()
    try:
        user = db.scalar(
            select(models.User).where(models.User.email == EMAIL)
        )

        if user is None:
            user = models.User(
                email=EMAIL,
                password_hash=password_hasher.hash(password),
                full_name="Development Doctor",
                role="doctor",
                is_active=True,
            )
            db.add(user)
            db.flush()
        elif user.role != "doctor":
            raise ValueError(
                "That email already exists but is not a doctor account."
            )
        else:
            user.password_hash = password_hasher.hash(password)

        doctor = db.scalar(
            select(models.Doctor).where(
                models.Doctor.user_id == user.id
            )
        )

        if doctor is None:
            doctor = models.Doctor(
                user_id=user.id,
                specialty="General Medicine",
                registration_number="DEV-DOCTOR-001",
            )
            db.add(doctor)

        db.commit()
        print("Development doctor account ready.")
        print("Email:", EMAIL)
        print("Doctor user ID:", user.id)
        print("Doctor profile ID:", doctor.id)

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
