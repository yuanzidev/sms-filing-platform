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


def _build_xlsx(headers: list[str], rows: list[list]) -> bytes:
    """构造一个最小 xlsx：第一行为表头，后续为数据行。"""
    from io import BytesIO
    from openpyxl import Workbook

    wb = Workbook()
    ws = wb.active
    ws.append(headers)
    for r in rows:
        ws.append(r)
    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()


def test_import_rejects_missing_signature(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    headers = ["企业名称", "签名"]
    rows = [["测试企业A", ""]]  # 签名为空
    data = _build_xlsx(headers, rows)

    files = {"file": ("test.xlsx", data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    r = client.post(
        f"{settings.API_V1_STR}/qualifications/import",
        headers=superuser_token_headers,
        files=files,
    )
    assert r.status_code == 400
    assert "签名" in r.json()["detail"]


def test_import_success_with_signature(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    headers = ["企业名称", "签名"]
    rows = [["测试企业B", "王五 法人"]]
    data = _build_xlsx(headers, rows)

    files = {"file": ("test.xlsx", data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    r = client.post(
        f"{settings.API_V1_STR}/qualifications/import",
        headers=superuser_token_headers,
        files=files,
    )
    assert r.status_code == 200
    assert r.json()["count"] == 1
