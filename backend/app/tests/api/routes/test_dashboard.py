"""Tests for dashboard API."""

import uuid

from fastapi.testclient import TestClient

from app.core.config import settings


def test_dashboard_port_counts_use_port_info(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    marker = uuid.uuid4().hex[:8]
    main_port_number = f"1069{marker}"

    for sub_port_number in (None, f"88{marker[:4]}"):
        payload = {
            "carrier": "中国移动",
            "main_port_number": main_port_number,
            "enterprise_name": f"统计测试企业{marker}",
            "port_type": "普通短信端口",
        }
        if sub_port_number:
            payload["sub_port_number"] = sub_port_number
        r = client.post(
            f"{settings.API_V1_STR}/port-info",
            headers=superuser_token_headers,
            json=payload,
        )
        assert r.status_code == 200, r.text

    r = client.get(
        f"{settings.API_V1_STR}/dashboard/stats",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["main_port_count"] >= 1
    assert body["sub_port_count"] >= 1
