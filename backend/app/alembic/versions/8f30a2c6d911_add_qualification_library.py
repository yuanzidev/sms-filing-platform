"""为资质记录增加主库与备用库标记。

Revision ID: 8f30a2c6d911
Revises: d74e8f1c2a90
"""

from alembic import op
import sqlalchemy as sa

revision = "8f30a2c6d911"
down_revision = "d74e8f1c2a90"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "qualification_info",
        sa.Column("library", sa.String(length=20), nullable=False, server_default="primary"),
    )
    op.create_index("ix_qualification_info_library", "qualification_info", ["library"])


def downgrade() -> None:
    op.drop_index("ix_qualification_info_library", table_name="qualification_info")
    op.drop_column("qualification_info", "library")
