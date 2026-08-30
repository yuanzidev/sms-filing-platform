"""create sub_port_record table

Revision ID: a9f2c6d4e8b1
Revises: b7c4e9f2a3d1
Create Date: 2026-08-30 10:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a9f2c6d4e8b1'
down_revision: str | None = 'b7c4e9f2a3d1'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('sub_port_record',
    sa.Column('main_port_number', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=False),
    sa.Column('sub_port_number', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=False),
    sa.Column('status', sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
    sa.Column('field_values', sa.JSON(), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('main_port_number', 'sub_port_number', name='uq_sub_port_record_main_sub')
    )
    op.create_index(op.f('ix_sub_port_record_main_port_number'), 'sub_port_record', ['main_port_number'], unique=False)
    op.create_index(op.f('ix_sub_port_record_sub_port_number'), 'sub_port_record', ['sub_port_number'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_sub_port_record_sub_port_number'), table_name='sub_port_record')
    op.drop_index(op.f('ix_sub_port_record_main_port_number'), table_name='sub_port_record')
    op.drop_table('sub_port_record')
