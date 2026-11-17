"""add handler phone to port info

Revision ID: cb657f70548d
Revises: e5a7c2d9f4b1
Create Date: 2026-10-30 15:40:06.082836

"""
from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "cb657f70548d"
down_revision: str | None = "e5a7c2d9f4b1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "port_info",
        sa.Column("handler_phone", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("port_info", "handler_phone")
