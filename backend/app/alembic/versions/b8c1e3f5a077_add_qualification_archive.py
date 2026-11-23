"""为备用资质定期归档增加状态。

Revision ID: b8c1e3f5a077
Revises: a6e9b1c4d220
"""

from alembic import op
import sqlalchemy as sa

revision = "b8c1e3f5a077"
down_revision = "a6e9b1c4d220"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("qualification_info", sa.Column("archived", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.create_index("ix_qualification_info_archived", "qualification_info", ["archived"])


def downgrade() -> None:
    op.drop_index("ix_qualification_info_archived", table_name="qualification_info")
    op.drop_column("qualification_info", "archived")
