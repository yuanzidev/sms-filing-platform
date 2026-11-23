"""记录报备任务使用的资质库。

Revision ID: f2a4c6e8b055
Revises: e1f3a5c7d944
"""

from alembic import op
import sqlalchemy as sa

revision = "f2a4c6e8b055"
down_revision = "e1f3a5c7d944"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("filing_task", sa.Column("library", sa.String(length=20), nullable=False, server_default="primary"))


def downgrade() -> None:
    op.drop_column("filing_task", "library")
