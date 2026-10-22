"""add structured symptom catalog

Revision ID: d54e03995f3b
Revises: 01e2500f022d
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "d54e03995f3b"
down_revision: Union[str, Sequence[str], None] = "01e2500f022d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "symptom_catalog",
        sa.Column("id", sa.String(100), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column(
            "aliases",
            sa.JSON(),
            nullable=False,
            server_default=sa.text("'[]'"),
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
        sa.UniqueConstraint("name", name="uq_symptom_catalog_name"),
    )

    op.create_table(
        "symptom_submission_items",
        sa.Column("submission_id", sa.Uuid(), nullable=False),
        sa.Column("symptom_id", sa.String(100), nullable=False),
        sa.ForeignKeyConstraint(
            ["submission_id"],
            ["symptom_submissions.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["symptom_id"],
            ["symptom_catalog.id"],
        ),
        sa.PrimaryKeyConstraint("submission_id", "symptom_id"),
    )

    op.create_index(
        "ix_symptom_submission_items_symptom_id",
        "symptom_submission_items",
        ["symptom_id"],
    )

    op.add_column(
        "symptom_submissions",
        sa.Column("severity", sa.String(20), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("symptom_submissions", "severity")

    op.drop_index(
        "ix_symptom_submission_items_symptom_id",
        table_name="symptom_submission_items",
    )
    op.drop_table("symptom_submission_items")
    op.drop_table("symptom_catalog")