
from datetime import date
from uuid import UUID
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=150)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    full_name: str
    is_active: bool
    role: str

class PatientCreate(BaseModel):
    date_of_birth: date | None = None
    phone: str | None = Field(default=None, max_length=30)


class PatientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    date_of_birth: date | None
    phone: str | None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)



class PatientConsentCreate(BaseModel):
    doctor_id: UUID
    scope: Literal["profile", "medical_history", "vitals"]
    expires_at: datetime | None = None


class PatientConsentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    patient_id: UUID
    doctor_id: UUID
    scope: str
    status: str
    granted_at: datetime
    expires_at: datetime | None
    revoked_at: datetime | None

class SymptomSubmissionCreate(BaseModel):
    symptoms: str = Field(min_length=3, max_length=5000)
    duration: str = Field(min_length=1, max_length=100)
    notes: str | None = Field(default=None, max_length=3000)



class SymptomSubmissionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    patient_id: UUID
    symptoms: str
    duration: str
    notes: str | None
    status: str
    created_at: datetime

    # Structured symptom fields
    severity: str | None = None
    symptom_ids: list[str] = Field(default_factory=list)
    symptom_names: list[str] = Field(default_factory=list)


class SymptomCatalogResponse(BaseModel):
    id: str
    name: str
    category: str
    aliases: list[str]


class StructuredSymptomSubmissionCreate(BaseModel):
    symptom_ids: list[str] = Field(min_length=1, max_length=20)
    duration: str = Field(min_length=1, max_length=100)
    severity: Literal["mild", "moderate", "severe"]
    notes: str | None = Field(default=None, max_length=3000)


class StructuredSymptomSubmissionResponse(BaseModel):
    id: UUID
    patient_id: UUID
    symptom_ids: list[str]
    symptom_names: list[str]
    duration: str
    severity: str | None
    notes: str | None
    status: str
    created_at: datetime

class DoctorDirectoryResponse(BaseModel):
    id: UUID
    full_name: str
    specialty: str
    facility_name: str | None = None
    facility_address: str | None = None


class AppointmentCreate(BaseModel):
    doctor_id: UUID
    scheduled_at: datetime
    reason: str = Field(min_length=3, max_length=500)


class AppointmentResponse(BaseModel):
    id: UUID
    patient_id: UUID
    doctor_id: UUID
    doctor_name: str
    specialty: str
    scheduled_at: datetime
    reason: str
    status: Literal["booked", "approved", "cancelled", "completed"]
    created_at: datetime


class DoctorRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=150)
    specialty: str = Field(min_length=2, max_length=120)
    registration_number: str = Field(min_length=3, max_length=100)

class DoctorProfileResponse(BaseModel):
    id: UUID
    user_id: UUID
    full_name: str
    email: EmailStr
    specialty: str
    registration_number: str
    facility_name: str | None = None
    facility_address: str | None = None

class DoctorAppointmentResponse(BaseModel):
    id: UUID
    patient_id: UUID
    patient_name: str
    doctor_id: UUID
    scheduled_at: datetime
    reason: str
    status: str
    created_at: datetime

class AppointmentDecision(BaseModel):
    status: Literal["approved", "rejected", "completed"]

class DoctorPatientResponse(BaseModel):
    patient_id: UUID
    full_name: str
    date_of_birth: datetime | None = None
    phone: str | None = None
    symptoms: list[SymptomSubmissionResponse] = Field(default_factory=list)


class ClinicalRecordCreate(BaseModel):
    record_type: Literal["diagnosis", "note"]
    title: str = Field(min_length=2, max_length=200)
    content: str = Field(min_length=2, max_length=10000)

class ClinicalRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    patient_id: UUID
    doctor_id: UUID
    record_type: str
    title: str
    content: str
    created_at: datetime

class PrescriptionCreate(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    content_type: Literal["application/pdf", "image/jpeg", "image/png"]
    file_base64: str = Field(min_length=1, max_length=12000000)

class PrescriptionMetadata(BaseModel):
    id: UUID
    patient_id: UUID
    doctor_id: UUID
    filename: str
    content_type: str
    created_at: datetime

class FollowUpCreate(BaseModel):
    scheduled_at: datetime
    reason: str = Field(min_length=3, max_length=500)
