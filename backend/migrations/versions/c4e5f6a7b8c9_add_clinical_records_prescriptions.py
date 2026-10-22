"""Add clinical records and prescription documents."""
from alembic import op
import sqlalchemy as sa
revision = "c4e5f6a7b8c9"
down_revision = "b0d1c2e3f4a5"
branch_labels = None
depends_on = None
def upgrade():
    op.create_table("clinical_records", sa.Column("id", sa.Uuid(), primary_key=True), sa.Column("patient_id", sa.Uuid(), sa.ForeignKey("patients.id"), nullable=False), sa.Column("doctor_id", sa.Uuid(), sa.ForeignKey("doctors.id"), nullable=False), sa.Column("record_type", sa.String(30), nullable=False), sa.Column("title", sa.String(200), nullable=False), sa.Column("content", sa.Text(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    op.create_index("ix_clinical_records_patient_id", "clinical_records", ["patient_id"])
    op.create_index("ix_clinical_records_doctor_id", "clinical_records", ["doctor_id"])
    op.create_table("prescription_documents", sa.Column("id", sa.Uuid(), primary_key=True), sa.Column("patient_id", sa.Uuid(), sa.ForeignKey("patients.id"), nullable=False), sa.Column("doctor_id", sa.Uuid(), sa.ForeignKey("doctors.id"), nullable=False), sa.Column("filename", sa.String(255), nullable=False), sa.Column("content_type", sa.String(100), nullable=False), sa.Column("file_base64", sa.Text(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    op.create_index("ix_prescription_documents_patient_id", "prescription_documents", ["patient_id"])
    op.create_index("ix_prescription_documents_doctor_id", "prescription_documents", ["doctor_id"])
def downgrade():
    op.drop_table("prescription_documents")
    op.drop_table("clinical_records")
