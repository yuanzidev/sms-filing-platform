"""子端口生成规则路由 — 仅超级管理员可用。"""
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import SessionDep, get_current_active_superuser
from app.crud.sub_port_generation_rule import (
    create_sub_port_generation_rule,
    delete_sub_port_generation_rule,
    get_sub_port_generation_rule,
    list_sub_port_generation_rules,
    update_sub_port_generation_rule,
)
from app.models import (
    Message,
    SubPortGenerationRuleCreate,
    SubPortGenerationRulePublic,
    SubPortGenerationRulesPublic,
    SubPortGenerationRuleUpdate,
)

router = APIRouter(
    prefix="/sub-port-generation-rules",
    tags=["sub-port-generation-rules"],
    dependencies=[Depends(get_current_active_superuser)],
)


@router.get("", response_model=SubPortGenerationRulesPublic)
@router.get("/", include_in_schema=False, response_model=SubPortGenerationRulesPublic)
def read_sub_port_generation_rules(session: SessionDep) -> Any:
    rules = list_sub_port_generation_rules(session=session)
    return SubPortGenerationRulesPublic(data=rules, count=len(rules))


@router.post("", response_model=SubPortGenerationRulePublic)
@router.post("/", include_in_schema=False, response_model=SubPortGenerationRulePublic)
def create_sub_port_rule_endpoint(
    *, session: SessionDep, create: SubPortGenerationRuleCreate
) -> Any:
    return create_sub_port_generation_rule(session=session, create=create)


@router.get("/{id}", response_model=SubPortGenerationRulePublic)
def read_sub_port_generation_rule(*, session: SessionDep, id: uuid.UUID) -> Any:
    db_obj = get_sub_port_generation_rule(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="子端口生成规则不存在")
    return db_obj


@router.patch("/{id}", response_model=SubPortGenerationRulePublic)
def update_sub_port_rule_endpoint(
    *, session: SessionDep, id: uuid.UUID, update: SubPortGenerationRuleUpdate
) -> Any:
    db_obj = get_sub_port_generation_rule(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="子端口生成规则不存在")
    return update_sub_port_generation_rule(session=session, db_obj=db_obj, update=update)


@router.delete("/{id}")
def delete_sub_port_rule_endpoint(*, session: SessionDep, id: uuid.UUID) -> Message:
    db_obj = get_sub_port_generation_rule(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="子端口生成规则不存在")
    delete_sub_port_generation_rule(session=session, db_obj=db_obj)
    return Message(message="子端口生成规则删除成功")
