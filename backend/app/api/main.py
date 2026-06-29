from fastapi import APIRouter

from app.api.routes import (
    login,
    login_logs,
    operation_logs,
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
api_router.include_router(utils.router)
