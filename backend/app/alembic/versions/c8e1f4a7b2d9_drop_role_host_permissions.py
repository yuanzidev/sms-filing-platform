"""drop role host_permissions column

Revision ID: c8e1f4a7b2d9
Revises: a9f2c6d4e8b1
Create Date: 2026-09-01 10:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'c8e1f4a7b2d9'
down_revision: str | None = 'a9f2c6d4e8b1'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_column('role', 'host_permissions')


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column(
        'role',
        sa.Column('host_permissions', sqlmodel.sql.sqltypes.AutoString(), nullable=False,
                  server_default='[]'),
    )
