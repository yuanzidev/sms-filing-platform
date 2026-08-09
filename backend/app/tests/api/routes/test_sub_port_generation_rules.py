"""子端口生成规则 API 测试。"""
from fastapi.testclient import TestClient

from app.core.config import settings

URL = f"{settings.API_V1_STR}/sub-port-generation-rules"


def _create_rule(
    client: TestClient,
    headers: dict[str, str],
    name: str = "测试规则",
    mode: str = "fixed_suffix",
    config: dict | None = None,
) -> dict:
    r = client.post(
        URL,
        headers=headers,
        json={
            "name": name,
            "mode": mode,
            "config": config or {"suffix": "95598"},
            "carrier": "移动",
        },
    )
    assert r.status_code == 200
    return r.json()


def test_create_and_list_rule(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    rule = _create_rule(client, superuser_token_headers)
    assert rule["name"] == "测试规则"
    assert rule["mode"] == "fixed_suffix"
    assert rule["config"] == {"suffix": "95598"}
    assert rule["carrier"] == "移动"
    assert rule["is_active"] is True
    assert rule["id"]

    r = client.get(URL, headers=superuser_token_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["count"] >= 1
    assert any(item["id"] == rule["id"] for item in data["data"])


def test_get_update_delete_rule(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    rule = _create_rule(client, superuser_token_headers, name="待更新规则", mode="sequential")

    r = client.get(f"{URL}/{rule['id']}", headers=superuser_token_headers)
    assert r.status_code == 200
    assert r.json()["name"] == "待更新规则"

    r = client.patch(
        f"{URL}/{rule['id']}",
        headers=superuser_token_headers,
        json={"name": "已更新规则", "is_active": False},
    )
    assert r.status_code == 200
    assert r.json()["name"] == "已更新规则"
    assert r.json()["is_active"] is False

    r = client.delete(f"{URL}/{rule['id']}", headers=superuser_token_headers)
    assert r.status_code == 200

    r = client.get(f"{URL}/{rule['id']}", headers=superuser_token_headers)
    assert r.status_code == 404


def test_rules_404_on_unknown_id(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.get(f"{URL}/00000000-0000-0000-0000-000000000000", headers=superuser_token_headers)
    assert r.status_code == 404


def test_rules_require_superuser(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    r = client.get(URL, headers=normal_user_token_headers)
    assert r.status_code == 403

    r = client.post(URL, headers=normal_user_token_headers, json={"name": "x", "mode": "random"})
    assert r.status_code == 403
