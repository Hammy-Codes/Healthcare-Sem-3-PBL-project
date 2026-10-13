
#What this model does:
#- Gives each user a UUID identifier.
#- Stores a unique email address and full name.
#- Stores password_hash, never a plaintext password.
#- Tracks whether the account is active and when it was created.


from datetime import date, datetime

from uuid import UUID, uuid4
from sqlalchemy import Boolean,Date, DateTime, Float, ForeignKey, String, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    String,
    UniqueConstraint,
    Uuid,
    func,
)
from database import Base


class User(Base):
    __tablename__ = "users"

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
