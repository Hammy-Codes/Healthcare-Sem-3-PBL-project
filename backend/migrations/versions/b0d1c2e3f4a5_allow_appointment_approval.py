"""Allow doctors to approve appointments."""
from alembic import op
import sqlalchemy as sa

revision = "b0d1c2e3f4a5"
down_revision = "e61c90b2a3f1"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.drop_constraint("ck_appointments_status", "appointments", type_="check")
    op.create_check_constraint("ck_appointments_status", "appointments", "status IN ('booked', 'approved', 'cancelled', 'completed')")

def downgrade() -> None:
    op.execute("UPDATE appointments SET status = 'booked' WHERE status = 'approved'")
    op.drop_constraint("ck_appointments_status", "appointments", type_="check")
    op.create_check_constraint("ck_appointments_status", "appointments", "status IN ('booked', 'cancelled', 'completed')")
