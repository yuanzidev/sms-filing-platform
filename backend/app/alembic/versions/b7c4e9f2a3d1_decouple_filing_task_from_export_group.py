"""decouple filing_task from export_group: nullable FK with SET NULL + name snapshot

Revision ID: b7c4e9f2a3d1
Revises: a1c2d3e4f5b6
Create Date: 2026-08-15 12:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b7c4e9f2a3d1"
down_revision: Union[str, None] = "a1c2d3e4f5b6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Drop the old FK (no ondelete rule) so the column can be altered
    op.drop_constraint(
        "filing_task_export_group_id_fkey", "filing_task", type_="foreignkey"
    )
    # 2. Make export_group_id nullable
    op.alter_column(
        "filing_task", "export_group_id", existing_type=sa.Uuid(), nullable=True
    )
    # 3. Add snapshot column for the group name at task creation time
    op.add_column(
        "filing_task",
        sa.Column(
            "export_group_name",
            sqlmodel.sql.sqltypes.AutoString(length=100),
            nullable=True,
        ),
    )
    # 4. Backfill existing tasks with their current group name (best effort)
    op.execute(
        "UPDATE filing_task SET export_group_name = export_group.name "
        "FROM export_group WHERE export_group.id = filing_task.export_group_id"
    )
    # 5. Recreate FK with SET NULL so group deletion clears task references
    op.create_foreign_key(
        "filing_task_export_group_id_fkey",
        "filing_task",
        "export_group",
        ["export_group_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "filing_task_export_group_id_fkey", "filing_task", type_="foreignkey"
    )
    op.drop_column("filing_task", "export_group_name")
    op.alter_column(
        "filing_task", "export_group_id", existing_type=sa.Uuid(), nullable=False
    )
    op.create_foreign_key(
        "filing_task_export_group_id_fkey",
        "filing_task",
        "export_group",
        ["export_group_id"],
        ["id"],
    )
