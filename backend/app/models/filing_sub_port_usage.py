"""Filing sub port usage — permanently reserves generated sub port numbers per main port."""
import uuid
from datetime import datetime

from sqlalchemy import Column, ForeignKey, UniqueConstraint
from sqlmodel import Field, SQLModel

from app.core.timezone import utcnow


class FilingSubPortUsage(SQLModel, table=True):
    __tablename__ = "filing_sub_port_usage"
    __table_args__ = (
        UniqueConstraint(
            "main_port_number", "port_number",
            name="uq_main_port_sub_port",
        ),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    main_port_number: str = Field(max_length=100, index=True)
    port_number: str = Field(max_length=100, index=True)
    carrier: str | None = Field(default=None, max_length=10)
    filing_task_id: uuid.UUID | None = Field(
        default=None,
        sa_column=Column(
            "filing_task_id",
            ForeignKey("filing_task.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    qualification_id: uuid.UUID | None = Field(default=None, foreign_key="qualification_info.id")
    generated_at: datetime = Field(default_factory=utcnow)
    operator_id: uuid.UUID = Field(foreign_key="user.id")
