"""子端口生成规则路由。"""
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import SessionDep, require_permission
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

router = APIRouter(prefix="/sub-port-generation-rules", tags=["sub-port-generation-rules"])

read_perm = Depends(require_permission("sub_port:read"))
write_perm = Depends(require_permission("sub_port:write"))


@router.get("", dependencies=[read_perm], response_model=SubPortGenerationRulesPublic)
@router.get("/", dependencies=[read_perm], include_in_schema=False, response_model=SubPortGenerationRulesPublic)
def read_sub_port_generation_rules(session: SessionDep) -> Any:
    rules = list_sub_port_generation_rules(session=session)
    return SubPortGenerationRulesPublic(data=rules, count=len(rules))


@router.post("", dependencies=[write_perm], response_model=SubPortGenerationRulePublic)
@router.post("/", dependencies=[write_perm], include_in_schema=False, response_model=SubPortGenerationRulePublic)
def create_sub_port_rule_endpoint(
    *, session: SessionDep, create: SubPortGenerationRuleCreate
) -> Any:
    return create_sub_port_generation_rule(session=session, create=create)


@router.get("/{id}", dependencies=[read_perm], response_model=SubPortGenerationRulePublic)
def read_sub_port_generation_rule(*, session: SessionDep, id: uuid.UUID) -> Any:
    db_obj = get_sub_port_generation_rule(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="子端口生成规则不存在")
    return db_obj


@router.patch("/{id}", dependencies=[write_perm], response_model=SubPortGenerationRulePublic)
def update_sub_port_rule_endpoint(
    *, session: SessionDep, id: uuid.UUID, update: SubPortGenerationRuleUpdate
) -> Any:
    db_obj = get_sub_port_generation_rule(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="子端口生成规则不存在")
    return update_sub_port_generation_rule(session=session, db_obj=db_obj, update=update)


@router.delete("/{id}", dependencies=[write_perm])
def delete_sub_port_rule_endpoint(*, session: SessionDep, id: uuid.UUID) -> Message:
    db_obj = get_sub_port_generation_rule(session=session, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="子端口生成规则不存在")
    delete_sub_port_generation_rule(session=session, db_obj=db_obj)
    return Message(message="子端口生成规则删除成功")
