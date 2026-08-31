"""
Author: yuanzi
Date: 2026-09-01
Description: 权限点注册表，格式为 module:action，是角色权限分配与接口鉴权的唯一事实来源。
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class PermissionItem:
    """单个权限点"""

    code: str
    label: str


@dataclass(frozen=True)
class PermissionGroup:
    """权限分组（对应一个业务模块）"""

    module: str
    label: str
    permissions: list[PermissionItem]


PERMISSION_CATALOG: list[PermissionGroup] = [
    PermissionGroup(
        module="filing",
        label="报备管理",
        permissions=[
            PermissionItem("filing:read", "查看报备任务"),
            PermissionItem("filing:write", "管理报备任务"),
            PermissionItem("filing:export", "导出报备文件"),
        ],
    ),
    PermissionGroup(
        module="qualification",
        label="资质管理",
        permissions=[
            PermissionItem("qualification:read", "查看资质"),
            PermissionItem("qualification:write", "管理资质"),
            PermissionItem("qualification:import", "导入资质"),
        ],
    ),
    PermissionGroup(
        module="port",
        label="端口管理",
        permissions=[
            PermissionItem("port:read", "查看端口"),
            PermissionItem("port:write", "管理端口"),
            PermissionItem("port:import", "导入端口"),
        ],
    ),
    PermissionGroup(
        module="sub_port",
        label="子端口库",
        permissions=[
            PermissionItem("sub_port:read", "查看子端口"),
            PermissionItem("sub_port:write", "管理子端口"),
            PermissionItem("sub_port:import", "导入子端口"),
        ],
    ),
    PermissionGroup(
        module="export_group",
        label="导出字段组",
        permissions=[
            PermissionItem("export_group:read", "查看导出字段组"),
            PermissionItem("export_group:write", "管理导出字段组"),
            PermissionItem("export_group:import", "导入导出字段组"),
            PermissionItem("export_group:export", "导出导出字段组"),
        ],
    ),
    PermissionGroup(
        module="api_access",
        label="API 接入管理",
        permissions=[
            PermissionItem("api_access:read", "查看 API 接入配置"),
            PermissionItem("api_access:write", "管理 API 接入配置"),
        ],
    ),
    PermissionGroup(
        module="user",
        label="用户管理",
        permissions=[
            PermissionItem("user:read", "查看用户"),
            PermissionItem("user:write", "管理用户"),
        ],
    ),
    PermissionGroup(
        module="role",
        label="角色管理",
        permissions=[
            PermissionItem("role:read", "查看角色"),
            PermissionItem("role:write", "管理角色"),
        ],
    ),
    PermissionGroup(
        module="log",
        label="日志管理",
        permissions=[
            PermissionItem("log:read", "查看日志"),
            PermissionItem("log:write", "清理日志"),
        ],
    ),
]

ALL_PERMISSIONS: frozenset[str] = frozenset(
    item.code for group in PERMISSION_CATALOG for item in group.permissions
)

PERMISSION_LABELS: dict[str, str] = {
    item.code: item.label
    for group in PERMISSION_CATALOG
    for item in group.permissions
}


def is_valid_permission(code: str) -> bool:
    return code in ALL_PERMISSIONS
