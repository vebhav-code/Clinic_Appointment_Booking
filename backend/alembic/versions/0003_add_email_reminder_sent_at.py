"""Add email_reminder_sent_at column to appointments table.

Revision ID: 0003_add_email_reminder_sent_at
Revises: 0002_profile_expansion
Create Date: 2026-11-02 18:55:00.000000

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0003_add_email_reminder_sent_at"
down_revision: str | None = "0002_profile_expansion"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE appointments ADD COLUMN IF NOT EXISTS email_reminder_sent_at TIMESTAMP WITH TIME ZONE;")


def downgrade() -> None:
    op.execute("ALTER TABLE appointments DROP COLUMN IF EXISTS email_reminder_sent_at;")
