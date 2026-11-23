"""初始化联通用途类别和报备填充选项。

Revision ID: d9e4f6a8b322
Revises: c7d2e4f6b188
"""

import uuid

from alembic import op
import sqlalchemy as sa

revision = "d9e4f6a8b322"
down_revision = "c7d2e4f6b188"
branch_labels = None
depends_on = None

USAGE_CATEGORIES = [
    "A01-金融推销（包含贷款理财和保险推销）", "A02-零售业推销", "A03-电信业务宣传",
    "A04-网络游戏推广", "A05-教育培训推销", "A06-房产中介推销", "A07-股票证券推销",
    "A08-医疗卫生推销", "A09-猎头招聘推广", "A10-旅游推广", "A11-其它营销类别",
    "B01-操作验证", "B02-民生服务", "B03-业务提醒（非金融类）", "B04-业务提醒（金融类）",
    "B05-还款通知", "B06-其他业务管理服务类", "C01-非应急公益性", "C02-应急公益性",
]


def upgrade() -> None:
    table = sa.table("filing_fill_option", sa.column("id", sa.Uuid()), sa.column("field_name", sa.String()), sa.column("value", sa.String()))
    values = [("usage_category", value) for value in USAGE_CATEGORIES] + [
        ("specific_usage", "验证码、通知、订单信息"),
        ("specific_usage", "会员通知、订单信息"),
        ("sms_template_content", "验证码***。尊敬的用户，您正在使用短信验证码登录，5分钟内有效，请勿泄露或转发他人。"),
        ("sms_template_content", "您的订单号***已受理，拒收请回复R"),
    ]
    op.bulk_insert(table, [{"id": uuid.uuid4(), "field_name": field, "value": value} for field, value in values])


def downgrade() -> None:
    op.execute("DELETE FROM filing_fill_option")
