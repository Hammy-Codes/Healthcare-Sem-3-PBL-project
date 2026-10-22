
from uuid import UUID

from sqlalchemy import select

import models
from database import SessionLocal

DOCTOR_USER_ID = UUID("708eabe9-0ba3-4451-9fc9-8b7981a041e9")
PATIENT_PROFILE_ID = UUID("74566a63-6afd-43e1-825e-d7979aa88c21")


def main():
    db = SessionLocal()
    try:
        doctor = db.scalar(
            select(models.Doctor).where(
                models.Doctor.user_id == DOCTOR_USER_ID
            )
        )
        patient = db.get(models.Patient, PATIENT_PROFILE_ID)

        if doctor is None:
            raise ValueError("Development doctor profile not found.")
        if patient is None:
            raise ValueError("Patient profile not found.")

        existing = db.scalar(
            select(models.CareRelationship).where(
                models.CareRelationship.patient_id == patient.id,
                models.CareRelationship.doctor_id == doctor.id,
                models.CareRelationship.ended_at.is_(None),
            )
        )

        if existing is None:
            db.add(
                models.CareRelationship(
                    patient_id=patient.id,
                    doctor_id=doctor.id,
                    relationship_type="primary",
                )
            )
            db.commit()
            print("Active care relationship created.")
        else:
            print("An active care relationship already exists.")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
