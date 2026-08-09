"""子端口生成规则 CRUD 操作。"""
import uuid

from sqlmodel import Session, select

from app.models import (
    SubPortGenerationRule,
    SubPortGenerationRuleCreate,
    SubPortGenerationRuleUpdate,
)


def create_sub_port_generation_rule(
    *, session: Session, create: SubPortGenerationRuleCreate
) -> SubPortGenerationRule:
    db_obj = SubPortGenerationRule.model_validate(create)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def get_sub_port_generation_rule(
    *, session: Session, id: uuid.UUID
) -> SubPortGenerationRule | None:
    return session.get(SubPortGenerationRule, id)


def list_sub_port_generation_rules(
    *, session: Session
) -> list[SubPortGenerationRule]:
    return list(
        session.exec(
            select(SubPortGenerationRule).order_by(
                SubPortGenerationRule.created_at.desc()
            )
        ).all()
    )


def update_sub_port_generation_rule(
    *, session: Session, db_obj: SubPortGenerationRule, update: SubPortGenerationRuleUpdate
) -> SubPortGenerationRule:
    data = update.model_dump(exclude_unset=True)
    db_obj.sqlmodel_update(data)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def delete_sub_port_generation_rule(
    *, session: Session, db_obj: SubPortGenerationRule
) -> None:
    session.delete(db_obj)
    session.commit()
