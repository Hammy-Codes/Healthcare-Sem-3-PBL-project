
#What this model does:
#- Gives each user a UUID identifier.
#- Stores a unique email address and full name.
#- Stores password_hash, never a plaintext password.
#- Tracks whether the account is active and when it was created.


from datetime import date, datetime

from uuid import UUID, uuid4
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Float,
    ForeignKey,
    JSON,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import LargeBinary
from database import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
    CheckConstraint(
        "role IN ('patient', 'doctor')",
        name="ck_users_role",
    ),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid4,
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )
    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    full_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )
    role: Mapped[str] = mapped_column(
    String(20),
    default="patient",
    server_default="patient",
    nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

#What these relationships mean
#- A patient profile links to a users account.
#- A doctor profile links to a users account and optionally a facility.
#- A care relationship links a patient to a doctor.

class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid4
    )
    user_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("users.id"), unique=True, nullable=False
    )
    date_of_birth: Mapped[datetime | None] = mapped_column(
    DateTime(timezone=True),
    nullable=True,

    )
    phone: Mapped[str | None] = mapped_column(
        String(30), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(),
        nullable=False
    )


class Facility(Base):
    __tablename__ = "facilities"

    id: Mapped[UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid4
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    address: Mapped[str] = mapped_column(String(500), nullable=False)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(),
        nullable=False
    )


class Doctor(Base):
    __tablename__ = "doctors"
    __table_args__ = (
        UniqueConstraint(
            "registration_number", name="uq_doctors_registration_number"
        ),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid4
    )
    user_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("users.id"), unique=True, nullable=False
    )
    facility_id: Mapped[UUID | None] = mapped_column(
        Uuid, ForeignKey("facilities.id"), nullable=True
    )
    specialty: Mapped[str] = mapped_column(String(120), nullable=False)
    registration_number: Mapped[str] = mapped_column(
        String(100), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(),
        nullable=False
    )


class CareRelationship(Base):
    __tablename__ = "care_relationships"

    id: Mapped[UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid4
    )
    patient_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("patients.id"), nullable=False
    )
    doctor_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("doctors.id"), nullable=False
    )
    relationship_type: Mapped[str] = mapped_column(
        String(50), default="primary", nullable=False
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(),
        nullable=False
    )
    ended_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class PatientConsent(Base):
    __tablename__ = "patient_consents"
    __table_args__ = (
        CheckConstraint(
            "status IN ('granted', 'revoked')",
            name="ck_patient_consents_status",
        ),
        CheckConstraint(
            "scope IN ('profile', 'medical_history', 'vitals')",
            name="ck_patient_consents_scope",
        ),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid4
    )
    patient_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("patients.id"), nullable=False, index=True
    )
    doctor_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("doctors.id"), nullable=False, index=True
    )
    scope: Mapped[str] = mapped_column(
        String(50), nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(20), default="granted", server_default="granted",
        nullable=False
    )
    granted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(),
        nullable=False
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

class SymptomSubmission(Base):
    __tablename__ = "symptom_submissions"
    __table_args__ = (
        CheckConstraint(
            "status IN ('submitted', 'reviewed')",
            name="ck_symptom_submissions_status",
        ),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid4
    )
    patient_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("patients.id"), nullable=False, index=True
    )
    symptoms: Mapped[str] = mapped_column(Text, nullable=False)
    duration: Mapped[str] = mapped_column(String(100), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    severity: Mapped[str | None] = mapped_column(String(20), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), default="submitted",
        server_default="submitted", nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(),
        nullable=False
    )


class SymptomCatalog(Base):
    __tablename__ = "symptom_catalog"
    __table_args__ = (
        UniqueConstraint("name", name="uq_symptom_catalog_name"),
    )

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    aliases: Mapped[list[str]] = mapped_column(
        JSON, nullable=False, default=list, server_default="[]"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )


class SymptomSubmissionItem(Base):
    __tablename__ = "symptom_submission_items"

    submission_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("symptom_submissions.id", ondelete="CASCADE"),
        primary_key=True,
    )
    symptom_id: Mapped[str] = mapped_column(
        String(100),
        ForeignKey("symptom_catalog.id"),
        primary_key=True,
        index=True,
    )

class Appointment(Base):
    __tablename__ = "appointments"
    __table_args__ = (
        CheckConstraint(
            "status IN ('booked', 'cancelled', 'completed')",
            name="ck_appointments_status",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    patient_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("patients.id"), nullable=False, index=True
    )
    doctor_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("doctors.id"), nullable=False, index=True
    )
    scheduled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    reason: Mapped[str] = mapped_column(String(500), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="booked", server_default="booked"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class ClinicalRecord(Base):
    __tablename__ = "clinical_records"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    patient_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("patients.id"), nullable=False, index=True)
    doctor_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("doctors.id"), nullable=False, index=True)
    record_type: Mapped[str] = mapped_column(String(30), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class PrescriptionDocument(Base):
    __tablename__ = "prescription_documents"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    patient_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("patients.id"), nullable=False, index=True)
    doctor_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("doctors.id"), nullable=False, index=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_base64: Mapped[str] = mapped_column("file_data",LargeBinary, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
