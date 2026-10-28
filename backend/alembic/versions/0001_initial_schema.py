"""Initial schema with btree_gist and appointment exclusion constraints.

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-10-27 12:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0001_initial_schema"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Enable btree_gist extension for combining scalar and range types in gist indexes
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist;")

    # 2. Users table
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=20), server_default="patient", nullable=False),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("role IN ('patient', 'doctor')", name="check_user_role"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # 3. Doctor profiles table
    op.create_table(
        "doctor_profiles",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("speciality", sa.String(length=100), nullable=False),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("slot_minutes", sa.Integer(), server_default="30", nullable=False),
        sa.Column("consultation_fee", sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.CheckConstraint("slot_minutes IN (15, 30)", name="check_slot_minutes"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id"),
    )
    op.create_index("ix_doctor_profiles_speciality", "doctor_profiles", ["speciality"])

    # 4. Availability rules table
    op.create_table(
        "availability_rules",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("doctor_id", sa.Integer(), nullable=False),
        sa.Column("weekday", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.CheckConstraint("weekday >= 0 AND weekday <= 6", name="check_weekday_range"),
        sa.CheckConstraint("start_time < end_time", name="check_availability_start_before_end"),
        sa.ForeignKeyConstraint(["doctor_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_availability_rules_doctor_id", "availability_rules", ["doctor_id"])

    # 5. Doctor leaves table
    op.create_table(
        "doctor_leaves",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("doctor_id", sa.Integer(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["doctor_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("doctor_id", "date", name="uq_doctor_leave_date"),
    )
    op.create_index("ix_doctor_leaves_date", "doctor_leaves", ["date"])
    op.create_index("ix_doctor_leaves_doctor_id", "doctor_leaves", ["doctor_id"])

    # 6. Appointments table
    op.create_table(
        "appointments",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("patient_id", sa.Integer(), nullable=False),
        sa.Column("doctor_id", sa.Integer(), nullable=False),
        sa.Column("start_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="booked", nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_by", sa.Integer(), nullable=True),
        sa.Column("email_reminder_sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "status IN ('booked', 'completed', 'no_show', 'cancelled')",
            name="check_appointment_status",
        ),
        sa.CheckConstraint("start_at < end_at", name="check_appointment_start_before_end"),
        sa.ForeignKeyConstraint(["cancelled_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["doctor_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["patient_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_appointments_doctor_start", "appointments", ["doctor_id", "start_at"])
    op.create_index("ix_appointments_patient_start", "appointments", ["patient_id", "start_at"])
    op.create_index("ix_appointments_status", "appointments", ["status"])

    # Add PostgreSQL EXCLUDE constraint using gist for active appointments (doctor)
    op.execute(
        """
        ALTER TABLE appointments
        ADD CONSTRAINT exclude_doctor_overlapping_appointments
        EXCLUDE USING gist (
            doctor_id WITH =,
            tstzrange(start_at, end_at) WITH &&
        )
        WHERE (status IN ('booked', 'completed', 'no_show'));
        """
    )

    # Add PostgreSQL EXCLUDE constraint using gist for active appointments (patient)
    op.execute(
        """
        ALTER TABLE appointments
        ADD CONSTRAINT exclude_patient_overlapping_appointments
        EXCLUDE USING gist (
            patient_id WITH =,
            tstzrange(start_at, end_at) WITH &&
        )
        WHERE (status IN ('booked', 'completed', 'no_show'));
        """
    )

    # 7. Reminders table
    op.create_table(
        "reminders",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("appointment_id", sa.Integer(), nullable=False),
        sa.Column("remind_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["appointment_id"], ["appointments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("appointment_id", "user_id", name="uq_appointment_user_reminder"),
    )
    op.create_index(
        "ix_reminders_user_remind_read",
        "reminders",
        ["user_id", "remind_at", "read_at"],
    )


def downgrade() -> None:
    op.drop_table("reminders")
    op.drop_table("appointments")
    op.drop_table("doctor_leaves")
    op.drop_table("availability_rules")
    op.drop_table("doctor_profiles")
    op.drop_table("users")
