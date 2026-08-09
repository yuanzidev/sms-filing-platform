from fastapi import APIRouter

from app.api.routes import (
    api_access,
    dashboard,
    export_groups,
    files,
    filing_tasks,
    login,
    login_logs,
    operation_logs,
    port_info,
    ports,
    qualifications,
    roles,
    sub_port_generation_rules,
    users,
    utils,
)

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(roles.router)
api_router.include_router(login_logs.router)
api_router.include_router(operation_logs.router)
api_router.include_router(files.router)
api_router.include_router(ports.router)
api_router.include_router(filing_tasks.router)
api_router.include_router(dashboard.router)
api_router.include_router(export_groups.router)
api_router.include_router(api_access.router)
api_router.include_router(qualifications.router)
api_router.include_router(port_info.router)
api_router.include_router(sub_port_generation_rules.router)
api_router.include_router(utils.router)
