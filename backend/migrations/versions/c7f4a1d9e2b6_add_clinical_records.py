"""Add clinical records, prescriptions and patient vitals"""
from alembic import op
import sqlalchemy as sa

revision = "c7f4a1d9e2b6"
down_revision = "b0d1c2e3f4a5"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table("patient_diagnoses", sa.Column("id", sa.Uuid(), primary_key=True), sa.Column("patient_id", sa.Uuid(), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False), sa.Column("doctor_id", sa.Uuid(), sa.ForeignKey("doctors.id"), nullable=False), sa.Column("diagnosis", sa.String(250), nullable=False), sa.Column("notes", sa.Text(), nullable=True), sa.Column("status", sa.String(20), server_default="active", nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    op.create_index("ix_patient_diagnoses_patient_id", "patient_diagnoses", ["patient_id"])
    op.create_index("ix_patient_diagnoses_doctor_id", "patient_diagnoses", ["doctor_id"])
    op.create_table("clinical_notes", sa.Column("id", sa.Uuid(), primary_key=True), sa.Column("patient_id", sa.Uuid(), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False), sa.Column("doctor_id", sa.Uuid(), sa.ForeignKey("doctors.id"), nullable=False), sa.Column("appointment_id", sa.Uuid(), sa.ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True), sa.Column("title", sa.String(180), nullable=False), sa.Column("content", sa.Text(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    op.create_index("ix_clinical_notes_patient_id", "clinical_notes", ["patient_id"])
    op.create_index("ix_clinical_notes_doctor_id", "clinical_notes", ["doctor_id"])
    op.create_table("prescription_documents", sa.Column("id", sa.Uuid(), primary_key=True), sa.Column("patient_id", sa.Uuid(), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False), sa.Column("doctor_id", sa.Uuid(), sa.ForeignKey("doctors.id"), nullable=False), sa.Column("filename", sa.String(255), nullable=False), sa.Column("content_type", sa.String(100), nullable=False), sa.Column("file_data", sa.LargeBinary(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    op.create_index("ix_prescription_documents_patient_id", "prescription_documents", ["patient_id"])
    op.create_index("ix_prescription_documents_doctor_id", "prescription_documents", ["doctor_id"])
    op.create_table("vital_records", sa.Column("id", sa.Uuid(), primary_key=True), sa.Column("patient_id", sa.Uuid(), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False), sa.Column("systolic_bp", sa.Integer(), nullable=True), sa.Column("diastolic_bp", sa.Integer(), nullable=True), sa.Column("heart_rate", sa.Integer(), nullable=True), sa.Column("temperature_c", sa.Float(), nullable=True), sa.Column("oxygen_saturation", sa.Integer(), nullable=True), sa.Column("weight_kg", sa.Float(), nullable=True), sa.Column("notes", sa.String(500), nullable=True), sa.Column("recorded_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    op.create_index("ix_vital_records_patient_id", "vital_records", ["patient_id"])

def downgrade() -> None:
    op.drop_index("ix_vital_records_patient_id", table_name="vital_records"); op.drop_table("vital_records")
    op.drop_index("ix_prescription_documents_doctor_id", table_name="prescription_documents"); op.drop_index("ix_prescription_documents_patient_id", table_name="prescription_documents"); op.drop_table("prescription_documents")
    op.drop_index("ix_clinical_notes_doctor_id", table_name="clinical_notes"); op.drop_index("ix_clinical_notes_patient_id", table_name="clinical_notes"); op.drop_table("clinical_notes")
    op.drop_index("ix_patient_diagnoses_doctor_id", table_name="patient_diagnoses"); op.drop_index("ix_patient_diagnoses_patient_id", table_name="patient_diagnoses"); op.drop_table("patient_diagnoses")
