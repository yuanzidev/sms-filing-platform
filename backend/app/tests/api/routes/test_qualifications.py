"""Tests for qualifications API: signature field support."""
from fastapi.testclient import TestClient

from app.core.config import settings


def test_list_qualifications_filter_by_signature(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    # 创建两条记录，签名分别为张三、李四
    for sig in ("张三 经办", "李四 法人"):
        client.post(
            f"{settings.API_V1_STR}/qualifications",
            headers=superuser_token_headers,
            json={"enterprise_name": f"测试企业 {sig}", "signature": sig},
        )
    # 用 signature 过滤
    r = client.get(
        f"{settings.API_V1_STR}/qualifications",
        headers=superuser_token_headers,
        params={"signature": "张三"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["total"] >= 1
    assert all("张三" in item["signature"] for item in body["data"])
