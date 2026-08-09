"""子端口生成规则模型 — 保存随机/顺序/固定后缀等生成模式的持久化配置。"""
import uuid
from datetime import datetime

from sqlalchemy import JSON
from sqlmodel import Field, SQLModel

from app.core.timezone import utcnow


class SubPortGenerationRuleBase(SQLModel):
    name: str = Field(max_length=200)
    mode: str = Field(max_length=20)  # random / sequential / fixed_suffix
    config: dict = Field(default={}, sa_type=JSON)
    carrier: str | None = Field(default=None, max_length=50)
    is_active: bool = Field(default=True)


class SubPortGenerationRule(SubPortGenerationRuleBase, table=True):
    __tablename__ = "sub_port_generation_rule"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class SubPortGenerationRuleCreate(SubPortGenerationRuleBase):
    pass


class SubPortGenerationRuleUpdate(SQLModel):
    name: str | None = None
    mode: str | None = None
    config: dict | None = None
    carrier: str | None = None
    is_active: bool | None = None


class SubPortGenerationRulePublic(SubPortGenerationRuleBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class SubPortGenerationRulesPublic(SQLModel):
    data: list[SubPortGenerationRulePublic]
    count: int
