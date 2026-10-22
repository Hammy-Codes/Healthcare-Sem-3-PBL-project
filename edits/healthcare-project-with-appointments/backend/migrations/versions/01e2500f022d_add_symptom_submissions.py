"""add symptom submissions

Revision ID: 01e2500f022d
Revises: 9cca93118f4c
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "01e2500f022d"
down_revision: Union[str, Sequence[str], None] = "9cca93118f4c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "symptom_submissions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("patient_id", sa.Uuid(), nullable=False),
        sa.Column("symptoms", sa.Text(), nullable=False),
        sa.Column("duration", sa.String(length=100), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.String(length=20),
            server_default="submitted",
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('submitted', 'reviewed')",
            name="ck_symptom_submissions_status",
        ),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_symptom_submissions_patient_id",
        "symptom_submissions",
        ["patient_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_symptom_submissions_patient_id",
        table_name="symptom_submissions",
    )
    op.drop_table("symptom_submissions")