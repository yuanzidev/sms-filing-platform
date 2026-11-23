"""增加可维护的报备填充选项。

Revision ID: c7d2e4f6b188
Revises: b8c1e3f5a077
"""

from alembic import op
import sqlalchemy as sa

revision = "c7d2e4f6b188"
down_revision = "b8c1e3f5a077"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "filing_fill_option",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("field_name", sa.String(length=50), nullable=False),
        sa.Column("value", sa.String(length=1000), nullable=False),
    )
    op.create_index("ix_filing_fill_option_field_name", "filing_fill_option", ["field_name"])


def downgrade() -> None:
    op.drop_index("ix_filing_fill_option_field_name", table_name="filing_fill_option")
    op.drop_table("filing_fill_option")
