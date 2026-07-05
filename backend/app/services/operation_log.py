"""Operation logging helper — write audit entries from route handlers."""
from __future__ import annotations

from typing import TYPE_CHECKING

from app.models import OperationLog, OperationResult

if TYPE_CHECKING:
    from sqlmodel import Session

    from app.models import User


def log_operation(
    *,
    session: Session,
    user: User,
    user_ip: str = "0.0.0.0",
    module: str,
    action: str,
    target: str = "",
    detail: str | None = None,
    result: OperationResult = OperationResult.SUCCESS,
) -> None:
    """Write an operation log entry."""
    log = OperationLog(
        username=user.username or user.email,
        user_ip=user_ip,
        module=module,
        action=action,
        target=target,
        detail=detail,
        result=result,
    )
    session.add(log)
    session.commit()
