"""Tests for export groups API."""
from fastapi.testclient import TestClient

from app.core.config import settings


def test_registry_returns_all_fields(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.get(
        f"{settings.API_V1_STR}/export-groups/registry",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) > 30
    names = {item["name"] for item in data}
    assert "sms_signature" in names
    assert "signature_type" in names
    assert "cert_image" in names

    sig_field = next(item for item in data if item["name"] == "signature_type")
    assert sig_field["label"] == "签名类型/来源"
    assert sig_field["source"] == "qualification"
    assert sig_field["group"] == "签名与模板"
