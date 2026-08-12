"""normalize port_main_number export field

Revision ID: a1c2d3e4f5b6
Revises: f4477b0bab18
Create Date: 2026-08-12 16:10:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "a1c2d3e4f5b6"
down_revision: Union[str, None] = "f4477b0bab18"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Replace deprecated export field alias with the canonical field name."""
    op.execute(
        "UPDATE export_group_field "
        "SET field_name = 'main_port_number' "
        "WHERE field_name = 'port_main_number'"
    )


def downgrade() -> None:
    """Keep canonical field names on downgrade; the alias is deprecated."""
    pass
