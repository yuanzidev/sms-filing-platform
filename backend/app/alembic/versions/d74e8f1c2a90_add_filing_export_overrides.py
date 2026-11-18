"""store operator-specific filing export overrides

Revision ID: d74e8f1c2a90
Revises: cb657f70548d
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d74e8f1c2a90"
down_revision: str | None = "cb657f70548d"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "filing_task",
        sa.Column("export_overrides", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
    )


def downgrade() -> None:
    op.drop_column("filing_task", "export_overrides")
