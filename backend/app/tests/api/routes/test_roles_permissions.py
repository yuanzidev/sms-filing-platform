"""
Author: yuanzi
Date: 2026-09-01
Description: 权限鉴权与角色接口测试。
"""
import json

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app import crud
from app.core.config import settings
from app.core.permissions import PERMISSION_CATALOG
from app.models import Role, UserCreate
from app.tests.utils.user import user_authentication_headers
from app.tests.utils.utils import random_email, random_lower_string


def _create_user_with_role(
    db: Session,
    *,
    client: TestClient,
    permissions: list[str],
) -> dict[str, str]:
    """创建持有指定权限点的角色及用户，返回该用户的登录 headers"""
    role = Role(
        name=f"test_role_{random_lower_string()[:10]}",
        permissions=json.dumps(permissions),
    )
    db.add(role)
    db.commit()
    db.refresh(role)

    password = random_lower_string()
    user = crud.create_user(
        session=db,
        user_create=UserCreate(
            email=random_email(),
            username=f"test_{random_lower_string()[:20]}",
            password=password,
        ),
    )
    user.role_id = role.id
    db.add(user)
    db.commit()
    db.refresh(user)

    return user_authentication_headers(
        client=client, email=user.email, password=password
    )


@pytest.fixture(scope="module")
def viewer_token_headers(
    client: TestClient, db: Session
) -> dict[str, str]:
    """仅持有 log:read 的普通角色用户"""
    return _create_user_with_role(
        db, client=client, permissions=["log:read"]
    )


def test_permission_catalog(superuser_token_headers: dict[str, str], client: TestClient) -> None:
    r = client.get(
        f"{settings.API_V1_STR}/roles/permissions/catalog",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    groups = r.json()
    modules = {g["module"] for g in groups}
    expected = {g.module for g in PERMISSION_CATALOG}
    assert modules == expected
    for g in groups:
        assert g["label"]
        for item in g["permissions"]:
            assert item["code"] and item["label"]


def test_role_crud(superuser_token_headers: dict[str, str], client: TestClient) -> None:
    # 创建
    name = f"test_crud_{random_lower_string()[:10]}"
    r = client.post(
        f"{settings.API_V1_STR}/roles",
        headers=superuser_token_headers,
        json={"name": name, "description": "临时角色", "permissions": ["log:read"]},
    )
    assert r.status_code == 200
    role = r.json()
    assert role["permissions"] == ["log:read"]
    assert role["user_count"] == 0

    # 名称重复
    r = client.post(
        f"{settings.API_V1_STR}/roles",
        headers=superuser_token_headers,
        json={"name": name, "permissions": []},
    )
    assert r.status_code == 400

    # 详情
    r = client.get(
        f"{settings.API_V1_STR}/roles/{role['id']}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    assert r.json()["permissions"] == ["log:read"]

    # 更新
    r = client.patch(
        f"{settings.API_V1_STR}/roles/{role['id']}",
        headers=superuser_token_headers,
        json={"permissions": ["log:read", "log:write"]},
    )
    assert r.status_code == 200
    assert r.json()["permissions"] == ["log:read", "log:write"]

    # 删除未被使用的角色
    r = client.delete(
        f"{settings.API_V1_STR}/roles/{role['id']}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200

    # 详情已删除
    r = client.get(
        f"{settings.API_V1_STR}/roles/{role['id']}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 404


def test_granted_permission_allows_access(
    viewer_token_headers: dict[str, str], client: TestClient
) -> None:
    r = client.get(
        f"{settings.API_V1_STR}/operation-logs", headers=viewer_token_headers
    )
    assert r.status_code == 200


def test_missing_permission_returns_403(
    viewer_token_headers: dict[str, str], client: TestClient
) -> None:
    # log:read 不应放行业务模块与写操作
    gated = [
        ("GET", "/users"),
        ("POST", "/roles"),
        ("GET", "/port-info"),
        ("GET", "/port-info/template"),
        ("GET", "/qualifications"),
        ("GET", "/qualifications/template"),
        ("GET", "/filing-tasks"),
        ("GET", "/export-groups"),
        ("DELETE", "/login-logs/00000000-0000-0000-0000-000000000000"),
    ]
    for method, path in gated:
        r = client.request(
            method, f"{settings.API_V1_STR}{path}", headers=viewer_token_headers
        )
        assert r.status_code == 403, f"{method} {path} 应返回 403，实际 {r.status_code}"


def test_import_and_export_gates(
    client: TestClient, db: Session
) -> None:
    """导入/导出类端点由独立权限点控制"""
    headers = _create_user_with_role(
        db, client=client, permissions=["qualification:import"]
    )
    # 有导入权限：模板可下载
    r = client.get(
        f"{settings.API_V1_STR}/qualifications/template", headers=headers
    )
    assert r.status_code == 200

    # 无导出权限：报备文件下载被拒
    r = client.get(
        f"{settings.API_V1_STR}/filing-tasks/00000000-0000-0000-0000-000000000000/download",
        headers=headers,
    )
    assert r.status_code == 403


def test_no_role_means_no_permissions(
    normal_user_token_headers: dict[str, str], client: TestClient
) -> None:
    """未分配角色的普通用户不应访问任何受控接口"""
    r = client.get(
        f"{settings.API_V1_STR}/port-info", headers=normal_user_token_headers
    )
    assert r.status_code == 403


def test_superuser_bypasses_permissions(
    superuser_token_headers: dict[str, str], client: TestClient
) -> None:
    r = client.get(f"{settings.API_V1_STR}/users", headers=superuser_token_headers)
    assert r.status_code == 200
    r = client.get(
        f"{settings.API_V1_STR}/sub-port-library", headers=superuser_token_headers
    )
    assert r.status_code == 200


def test_me_permissions_endpoint(
    viewer_token_headers: dict[str, str],
    superuser_token_headers: dict[str, str],
    client: TestClient,
) -> None:
    r = client.get(
        f"{settings.API_V1_STR}/users/me/permissions", headers=viewer_token_headers
    )
    assert r.status_code == 200
    body = r.json()
    assert body["permissions"] == ["log:read"]
    assert body["is_superuser"] is False

    r = client.get(
        f"{settings.API_V1_STR}/users/me/permissions",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    assert r.json()["is_superuser"] is True
