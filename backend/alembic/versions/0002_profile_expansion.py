"""User and DoctorProfile model expansion for friendly patient experience.

Revision ID: 0002_profile_expansion
Revises: 0001_initial_schema
Create Date: 2026-10-27 18:15:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0002_profile_expansion"
down_revision: str | None = "0001_initial_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Expand users table
    op.add_column("users", sa.Column("date_of_birth", sa.Date(), nullable=True))
    op.add_column("users", sa.Column("gender", sa.String(length=30), nullable=True))
    op.add_column("users", sa.Column("emergency_contact_name", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("emergency_contact_phone", sa.String(length=50), nullable=True))
    op.add_column("users", sa.Column("patient_notes", sa.String(length=2000), nullable=True))
    op.add_column("users", sa.Column("avatar_color", sa.String(length=30), nullable=True, server_default="#0E9AA7"))

    # 2. Expand doctor_profiles table
    op.add_column("doctor_profiles", sa.Column("qualifications", sa.String(length=255), nullable=True))
    op.add_column("doctor_profiles", sa.Column("years_of_experience", sa.Integer(), nullable=True))
    op.add_column("doctor_profiles", sa.Column("languages", sa.JSON(), nullable=True))
    op.create_check_constraint(
        "check_years_of_experience",
        "doctor_profiles",
        "years_of_experience IS NULL OR (years_of_experience >= 0 AND years_of_experience <= 70)",
    )


def downgrade() -> None:
    op.drop_constraint("check_years_of_experience", "doctor_profiles", type_="check")
    op.drop_column("doctor_profiles", "languages")
    op.drop_column("doctor_profiles", "years_of_experience")
    op.drop_column("doctor_profiles", "qualifications")

    op.drop_column("users", "avatar_color")
    op.drop_column("users", "patient_notes")
    op.drop_column("users", "emergency_contact_phone")
    op.drop_column("users", "emergency_contact_name")
    op.drop_column("users", "gender")
    op.drop_column("users", "date_of_birth")
