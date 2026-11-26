"""报备导出模板仅填充空值选项。"""

from alembic import op
import sqlalchemy as sa

revision = "ab10cd20ef30"
down_revision = "9f0a1b2c3d4e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("filing_task", sa.Column("template_fill_empty_only", sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    op.drop_column("filing_task", "template_fill_empty_only")
