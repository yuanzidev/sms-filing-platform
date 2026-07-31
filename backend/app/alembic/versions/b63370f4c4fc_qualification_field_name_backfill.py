"""qualification field_name backfill

Revision ID: b63370f4c4fc
Revises: 789aaa38b6b3
Create Date: 2026-07-31 08:15:31.678638

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'b63370f4c4fc'
down_revision: Union[str, None] = '789aaa38b6b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "UPDATE file_attachment SET field_name = '法人身份证正面' "
        "WHERE entity_type = 'qualification_info' AND field_name = '经办人身份证正面'"
    )
    op.execute(
        "UPDATE file_attachment SET field_name = '法人身份证反面' "
        "WHERE entity_type = 'qualification_info' AND field_name = '经办人身份证反面'"
    )
    op.execute(
        "UPDATE file_attachment SET field_name = '引流号码举证附件' "
        "WHERE entity_type = 'qualification_info' AND field_name = '引流举证附件'"
    )


def downgrade() -> None:
    op.execute(
        "UPDATE file_attachment SET field_name = '经办人身份证正面' "
        "WHERE entity_type = 'qualification_info' AND field_name = '法人身份证正面'"
    )
    op.execute(
        "UPDATE file_attachment SET field_name = '经办人身份证反面' "
        "WHERE entity_type = 'qualification_info' AND field_name = '法人身份证反面'"
    )
    op.execute(
        "UPDATE file_attachment SET field_name = '引流举证附件' "
        "WHERE entity_type = 'qualification_info' AND field_name = '引流号码举证附件'"
    )
