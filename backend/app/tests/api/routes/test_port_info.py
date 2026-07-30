"""Tests for port-info API: page_size upper bound."""
from fastapi.testclient import TestClient

from app.core.config import settings


def test_port_info_accepts_large_page_size(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.get(
        f"{settings.API_V1_STR}/port-info",
        headers=superuser_token_headers,
        params={"page_size": 500},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["page_size"] == 500


def test_port_info_rejects_too_large_page_size(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.get(
        f"{settings.API_V1_STR}/port-info",
        headers=superuser_token_headers,
        params={"page_size": 501},
    )
    assert r.status_code == 422
