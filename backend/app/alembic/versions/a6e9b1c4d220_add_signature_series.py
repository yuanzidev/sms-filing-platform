"""增加签名系列规则与资质归类。

Revision ID: a6e9b1c4d220
Revises: 8f30a2c6d911
"""

from alembic import op
import sqlalchemy as sa

revision = "a6e9b1c4d220"
down_revision = "8f30a2c6d911"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("qualification_info", sa.Column("signature_series", sa.String(length=100), nullable=True))
    op.create_index("ix_qualification_info_signature_series", "qualification_info", ["signature_series"])
    op.create_table(
        "signature_series_rule",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("pattern", sa.String(length=200), nullable=False, unique=True),
        sa.Column("series_name", sa.String(length=100), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("signature_series_rule")
    op.drop_index("ix_qualification_info_signature_series", table_name="qualification_info")
    op.drop_column("qualification_info", "signature_series")
