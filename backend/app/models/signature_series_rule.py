"""签名系列匹配规则。"""

import uuid

from sqlmodel import Field, SQLModel


class SignatureSeriesRule(SQLModel, table=True):
    __tablename__ = "signature_series_rule"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    pattern: str = Field(max_length=200, unique=True)
    series_name: str = Field(max_length=100)


class SignatureSeriesRuleInput(SQLModel):
    pattern: str
    series_name: str
