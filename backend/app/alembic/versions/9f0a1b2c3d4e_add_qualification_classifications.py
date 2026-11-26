"""资质签名多系列与多级别。"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "9f0a1b2c3d4e"
down_revision = "f2a4c6e8b055"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("qualification_info", sa.Column("signature_series_names", JSONB(), nullable=False, server_default="[]"))
    op.add_column("qualification_info", sa.Column("qualification_levels", JSONB(), nullable=False, server_default="[]"))
    op.execute("UPDATE qualification_info SET signature_series_names = jsonb_build_array(signature_series) WHERE signature_series IS NOT NULL")


def downgrade() -> None:
    op.drop_column("qualification_info", "qualification_levels")
    op.drop_column("qualification_info", "signature_series_names")
