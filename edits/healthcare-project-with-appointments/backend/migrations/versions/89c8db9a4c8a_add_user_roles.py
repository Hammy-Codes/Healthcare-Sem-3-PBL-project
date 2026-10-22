"""add user roles

Revision ID: 89c8db9a4c8a
Revises: 98abd5fe8474
Create Date: 2026-10-14 12:45:19.001401

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '89c8db9a4c8a'
down_revision: Union[str, Sequence[str], None] = '98abd5fe8474'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None



def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "role",
            sa.String(length=20),
            server_default="patient",
            nullable=False,
        ),
    )

    op.create_check_constraint(
        "ck_users_role",
        "users",
        "role IN ('patient', 'doctor')",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_users_role",
        "users",
        type_="check",
    )
    op.drop_column("users", "role")

