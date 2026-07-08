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


def test_template_has_signature_header(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    from io import BytesIO
    from openpyxl import load_workbook

    r = client.get(
        f"{settings.API_V1_STR}/qualifications/template", headers=superuser_token_headers
    )
    assert r.status_code == 200
    wb = load_workbook(BytesIO(r.content))
    ws = wb.active
    headers = [c.value for c in ws[1]]
    # 第 16 列（1-based）应为 "签名"，第 17 列应为 "单位证件图片"
    assert headers[15] == "签名"
    assert headers[16] == "单位证件图片"
