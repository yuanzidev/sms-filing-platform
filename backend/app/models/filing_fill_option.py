"""报备导出填充选项。"""

import uuid

from sqlmodel import Field, SQLModel


class FilingFillOption(SQLModel, table=True):
    __tablename__ = "filing_fill_option"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    field_name: str = Field(max_length=50, index=True)
    value: str = Field(max_length=1000)


class FilingFillOptionInput(SQLModel):
    field_name: str
    value: str
