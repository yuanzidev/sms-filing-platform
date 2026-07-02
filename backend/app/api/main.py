from fastapi import APIRouter

from app.api.routes import (
    export_groups,
    files,
    login,
    login_logs,
    operation_logs,
    ports,
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
api_router.include_router(export_groups.router)
api_router.include_router(utils.router)
