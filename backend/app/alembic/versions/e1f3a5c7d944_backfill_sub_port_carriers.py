"""按主端口记录补齐旧子端口的运营商。

Revision ID: e1f3a5c7d944
Revises: d9e4f6a8b322
"""

from alembic import op

revision = "e1f3a5c7d944"
down_revision = "d9e4f6a8b322"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 一个主端口若对应多个运营商，无法安全推断，留给页面“未归类”筛选人工处理。
    op.execute("""
        UPDATE sub_port_record AS record
        SET field_values = jsonb_set(
            COALESCE(record.field_values::jsonb, '{}'::jsonb),
            '{carrier}', to_jsonb(port.carrier)
        )::json
        FROM (
            SELECT main_port_number, min(carrier) AS carrier
            FROM port_info
            WHERE carrier IS NOT NULL AND carrier <> ''
            GROUP BY main_port_number
            HAVING count(DISTINCT carrier) = 1
        ) AS port
        WHERE record.main_port_number = port.main_port_number
          AND COALESCE(record.field_values->>'carrier', '') = ''
    """)


def downgrade() -> None:
    # 无法区分迁移前已有的运营商值，不自动清除。
    pass
