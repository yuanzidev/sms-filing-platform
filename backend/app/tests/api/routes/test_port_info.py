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


def test_import_port_info_with_empty_operation_and_group(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """操作类型/集团编码为空可导入"""
    from io import BytesIO
    from openpyxl import Workbook

    wb = Workbook()
    ws = wb.active
    headers = [
        "运营商", "主端口号", "企业名称", "端口类型",
        "运营商接入机房及设备", "企业接入机房及设备", "授权书",
    ]
    for col_idx, h in enumerate(headers, 1):
        ws.cell(row=1, column=col_idx, value=h)
    ws.cell(row=2, column=1, value="中国移动")
    ws.cell(row=2, column=2, value="10698999")
    ws.cell(row=2, column=3, value="测试企业")
    ws.cell(row=2, column=4, value="短信")
    ws.cell(row=2, column=5, value="机房A")
    ws.cell(row=2, column=6, value="机房B")
    ws.cell(row=2, column=7, value="授字001")

    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)

    r = client.post(
        f"{settings.API_V1_STR}/port-info/import",
        headers=superuser_token_headers,
        files={"file": ("test.xlsx", buf, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["count"] >= 1
