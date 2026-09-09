"""add diversion short link

Revision ID: e5a7c2d9f4b1
Revises: d4a6b8c9e1f2
Create Date: 2026-09-09 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e5a7c2d9f4b1"
down_revision: str | None = "d4a6b8c9e1f2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "qualification_info",
        sa.Column(
            "diversion_short_link",
            sqlmodel.sql.sqltypes.AutoString(length=500),
            nullable=True,
        ),
    )
    op.execute(
        "UPDATE qualification_info "
        "SET diversion_short_link = link_address "
        "WHERE diversion_short_link IS NULL AND link_address IS NOT NULL"
    )
    op.execute(
        "UPDATE export_group_field "
        "SET field_name = 'diversion_short_link' "
        "WHERE field_name = 'link_address'"
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(
        "UPDATE qualification_info "
        "SET link_address = diversion_short_link "
        "WHERE link_address IS NULL AND diversion_short_link IS NOT NULL"
    )
    op.execute(
        "UPDATE export_group_field "
        "SET field_name = 'link_address' "
        "WHERE field_name = 'diversion_short_link'"
    )
    op.drop_column("qualification_info", "diversion_short_link")
