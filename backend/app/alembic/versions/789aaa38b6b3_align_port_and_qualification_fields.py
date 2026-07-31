"""Align port_info and qualification_info fields — add required columns, remove signature.

Revision ID: 789aaa38b6b3
Revises: f208b26cd64d
Create Date: 2026-07-19
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = "789aaa38b6b3"
down_revision: Union[str, None] = "f208b26cd64d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── port_info changes ──────────────────────────────────────────
    # Add new required columns
    op.add_column("port_info", sa.Column("enterprise_name", sa.String(length=200), nullable=True))
    op.add_column("port_info", sa.Column("operation_type", sa.String(length=100), nullable=True))
    op.add_column("port_info", sa.Column("authorization_letter", sa.String(length=500), nullable=True))

    # Fill existing rows with defaults before setting NOT NULL
    op.execute("UPDATE port_info SET enterprise_name = '' WHERE enterprise_name IS NULL")
    op.execute("UPDATE port_info SET operation_type = '' WHERE operation_type IS NULL")
    op.execute("UPDATE port_info SET authorization_letter = '' WHERE authorization_letter IS NULL")
    op.execute("UPDATE port_info SET main_port_number = '' WHERE main_port_number IS NULL")
    op.execute("UPDATE port_info SET group_code = '' WHERE group_code IS NULL")
    op.execute("UPDATE port_info SET carrier_room = '' WHERE carrier_room IS NULL")
    op.execute("UPDATE port_info SET enterprise_room = '' WHERE enterprise_room IS NULL")
    op.execute("UPDATE port_info SET port_type = '' WHERE port_type IS NULL")

    # Set NOT NULL on new and existing required columns
    op.alter_column("port_info", "enterprise_name", nullable=False)
    op.alter_column("port_info", "operation_type", nullable=False)
    op.alter_column("port_info", "authorization_letter", nullable=False)
    op.alter_column("port_info", "main_port_number", nullable=False)
    op.alter_column("port_info", "group_code", nullable=False)
    op.alter_column("port_info", "carrier_room", nullable=False)
    op.alter_column("port_info", "enterprise_room", nullable=False)
    op.alter_column("port_info", "port_type", nullable=False)

    # ── qualification_info changes ─────────────────────────────────
    # Add new legal representative cert columns
    op.add_column("qualification_info", sa.Column("legal_representative_cert_type", sa.String(length=50), nullable=True))
    op.add_column("qualification_info", sa.Column("legal_representative_cert_number", sa.String(length=100), nullable=True))
    op.add_column("qualification_info", sa.Column("legal_representative_cert_address", sa.String(length=500), nullable=True))

    # Fill existing rows with defaults
    op.execute("UPDATE qualification_info SET legal_representative_cert_type = '' WHERE legal_representative_cert_type IS NULL")
    op.execute("UPDATE qualification_info SET legal_representative_cert_number = '' WHERE legal_representative_cert_number IS NULL")
    op.execute("UPDATE qualification_info SET legal_representative_cert_address = '' WHERE legal_representative_cert_address IS NULL")

    # Set NOT NULL on new columns
    op.alter_column("qualification_info", "legal_representative_cert_type", nullable=False)
    op.alter_column("qualification_info", "legal_representative_cert_number", nullable=False)
    op.alter_column("qualification_info", "legal_representative_cert_address", nullable=False)

    # Drop signature column
    op.drop_column("qualification_info", "signature")


def downgrade() -> None:
    # ── port_info rollback ─────────────────────────────────────────
    op.alter_column("port_info", "port_type", nullable=True)
    op.alter_column("port_info", "enterprise_room", nullable=True)
    op.alter_column("port_info", "carrier_room", nullable=True)
    op.alter_column("port_info", "group_code", nullable=True)
    op.alter_column("port_info", "main_port_number", nullable=True)
    op.drop_column("port_info", "authorization_letter")
    op.drop_column("port_info", "operation_type")
    op.drop_column("port_info", "enterprise_name")

    # ── qualification_info rollback ────────────────────────────────
    op.add_column("qualification_info", sa.Column("signature", sa.String(length=200), nullable=True))
    op.execute("UPDATE qualification_info SET signature = sms_signature WHERE signature IS NULL")
    op.alter_column("qualification_info", "signature", nullable=False)

    op.drop_column("qualification_info", "legal_representative_cert_address")
    op.drop_column("qualification_info", "legal_representative_cert_number")
    op.drop_column("qualification_info", "legal_representative_cert_type")
