from fastapi import APIRouter

from app.api.routes import (
    api_access,
    dashboard,
    export_groups,
    files,
    login,
    login_logs,
    operation_logs,
    port_info,
    ports,
    qualifications,
    records,
    roles,
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
api_router.include_router(records.router)
api_router.include_router(dashboard.router)
api_router.include_router(export_groups.router)
api_router.include_router(api_access.router)
api_router.include_router(qualifications.router)
api_router.include_router(port_info.router)
api_router.include_router(utils.router)
