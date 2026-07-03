"""replace_filing_record_with_filing_task

Revision ID: c3d7a9e1b5f2
Revises: 756db2f7f3ff
Create Date: 2026-07-03 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'c3d7a9e1b5f2'
down_revision: Union[str, None] = '756db2f7f3ff'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Drop filing_record + sub_port FK, create filing_task table."""
    # Remove FK from sub_port referencing filing_record
    op.drop_constraint(
        'sub_port_filing_record_id_fkey', 'sub_port', type_='foreignkey'
    )
    op.drop_column('sub_port', 'filing_record_id')

    # Drop filing_record table
    op.drop_index('ix_filing_record_status', table_name='filing_record')
    op.drop_index('ix_filing_record_qualification_info_id', table_name='filing_record')
    op.drop_index('ix_filing_record_port_info_id', table_name='filing_record')
    op.drop_index('ix_filing_record_import_batch', table_name='filing_record')
    op.drop_index('ix_filing_record_created_at', table_name='filing_record')
    op.drop_table('filing_record')

    # Create filing_task table
    op.create_table('filing_task',
        sa.Column('task_name', sqlmodel.sql.sqltypes.AutoString(length=256), nullable=False),
        sa.Column('qualification_ids', sa.JSON(), nullable=False),
        sa.Column('port_ids', sa.JSON(), nullable=False),
        sa.Column('export_group_id', sa.Uuid(), nullable=False),
        sa.Column('group_by_field', sqlmodel.sql.sqltypes.AutoString(length=64), nullable=True),
        sa.Column('file_path', sqlmodel.sql.sqltypes.AutoString(length=512), nullable=True),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('qualification_count', sa.Integer(), nullable=False),
        sa.Column('port_count', sa.Integer(), nullable=False),
        sa.Column('operator_id', sa.Uuid(), nullable=False),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['export_group_id'], ['export_group.id'], ),
        sa.ForeignKeyConstraint(['operator_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    """Drop filing_task, recreate filing_record."""
    op.drop_table('filing_task')

    # Recreate filing_record table
    op.create_table('filing_record',
        sa.Column('record_number', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
        sa.Column('status', sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        sa.Column('source_file', sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True),
        sa.Column('import_batch', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('port_info_id', sa.Uuid(), nullable=False),
        sa.Column('qualification_info_id', sa.Uuid(), nullable=False),
        sa.Column('operator_id', sa.Uuid(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['operator_id'], ['user.id'], ),
        sa.ForeignKeyConstraint(['port_info_id'], ['port_info.id'], ),
        sa.ForeignKeyConstraint(['qualification_info_id'], ['qualification_info.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('record_number')
    )
    op.create_index('ix_filing_record_created_at', 'filing_record', ['created_at'], unique=False)
    op.create_index('ix_filing_record_import_batch', 'filing_record', ['import_batch'], unique=False)
    op.create_index('ix_filing_record_port_info_id', 'filing_record', ['port_info_id'], unique=False)
    op.create_index('ix_filing_record_qualification_info_id', 'filing_record', ['qualification_info_id'], unique=False)
    op.create_index('ix_filing_record_status', 'filing_record', ['status'], unique=False)

    # Re-add sub_port FK
    op.add_column('sub_port', sa.Column('filing_record_id', sa.Uuid(), nullable=True))
    op.create_foreign_key(
        'sub_port_filing_record_id_fkey', 'sub_port',
        'filing_record', ['filing_record_id'], ['id']
    )
