from datetime import datetime, timedelta, timezone
from uuid import uuid4

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import main
import models
from database import Base, get_db


@pytest.fixture
def test_environment():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(
        bind=engine,
        autoflush=False,
        expire_on_commit=False,
    )

    Base.metadata.create_all(bind=engine)

    def override_get_db():
        with TestingSessionLocal() as db:
            yield db

    main.app.dependency_overrides[get_db] = override_get_db

    try:
        with TestingSessionLocal() as db:
            patient_user = models.User(
                id=uuid4(),
                email="patient-test@example.com",
                password_hash="not-a-real-password-hash",
                full_name="Test Patient",
                role="patient",
                is_active=True,
            )
            doctor_user = models.User(
                id=uuid4(),
                email="doctor-test@example.com",
                password_hash="not-a-real-password-hash",
                full_name="Test Doctor",
                role="doctor",
                is_active=True,
            )
            db.add_all([patient_user, doctor_user])
            db.flush()

            patient = models.Patient(
                id=uuid4(),
                user_id=patient_user.id,
            )
            doctor = models.Doctor(
                id=uuid4(),
                user_id=doctor_user.id,
                specialty="General Medicine",
                registration_number=f"TEST-{uuid4()}",
            )
            db.add_all([patient, doctor])
            db.flush()

            relationship = models.CareRelationship(
                id=uuid4(),
                patient_id=patient.id,
                doctor_id=doctor.id,
            )
            db.add(relationship)
            db.commit()

            patient_id = patient.id
            doctor_id = doctor.id
            patient_user_id = patient_user.id
            doctor_user_id = doctor_user.id

        def make_token(user_id):
            return jwt.encode(
                {
                    "sub": str(user_id),
                    "exp": datetime.now(timezone.utc)
                    + timedelta(minutes=10),
                },
                main.JWT_SECRET_KEY,
                algorithm=main.JWT_ALGORITHM,
            )

        with TestClient(main.app) as client:
            yield {
                "client": client,
                "session_factory": TestingSessionLocal,
                "patient_id": patient_id,
                "doctor_id": doctor_id,
                "patient_token": make_token(patient_user_id),
                "doctor_token": make_token(doctor_user_id),
            }
    finally:
        main.app.dependency_overrides.pop(get_db, None)
        Base.metadata.drop_all(bind=engine)
        engine.dispose()
