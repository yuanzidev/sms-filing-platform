"""create filing_sub_port_usage

Revision ID: 5de910419873
Revises: e79f8c670332
Create Date: 2026-08-02 11:14:50.419231

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '5de910419873'
down_revision: Union[str, None] = 'e79f8c670332'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "filing_sub_port_usage",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("main_port_number", sqlmodel.sql.sqltypes.AutoString(length=100), nullable=False),
        sa.Column("port_number", sqlmodel.sql.sqltypes.AutoString(length=100), nullable=False),
        sa.Column("carrier", sqlmodel.sql.sqltypes.AutoString(length=10), nullable=True),
        sa.Column("filing_task_id", sa.Uuid(),
                  sa.ForeignKey("filing_task.id", ondelete="SET NULL"),
                  nullable=True),
        sa.Column("qualification_id", sa.Uuid(),
                  sa.ForeignKey("qualification_info.id"), nullable=True),
        sa.Column("generated_at", sa.DateTime(), nullable=False),
        sa.Column("operator_id", sa.Uuid(), sa.ForeignKey("user.id"), nullable=False),
        sa.UniqueConstraint("main_port_number", "port_number",
                            name="uq_main_port_sub_port"),
    )
    op.create_index(op.f('ix_filing_sub_port_usage_main_port_number'), 'filing_sub_port_usage', ['main_port_number'], unique=False)
    op.create_index(op.f('ix_filing_sub_port_usage_port_number'), 'filing_sub_port_usage', ['port_number'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_filing_sub_port_usage_port_number'), table_name='filing_sub_port_usage')
    op.drop_index(op.f('ix_filing_sub_port_usage_main_port_number'), table_name='filing_sub_port_usage')
    op.drop_table('filing_sub_port_usage')
