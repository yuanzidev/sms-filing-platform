"""add diversion long link

Revision ID: d4a6b8c9e1f2
Revises: c8e1f4a7b2d9
Create Date: 2026-09-06 18:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d4a6b8c9e1f2"
down_revision: str | None = "c8e1f4a7b2d9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "qualification_info",
        sa.Column(
            "diversion_long_link",
            sqlmodel.sql.sqltypes.AutoString(length=1000),
            nullable=True,
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("qualification_info", "diversion_long_link")
