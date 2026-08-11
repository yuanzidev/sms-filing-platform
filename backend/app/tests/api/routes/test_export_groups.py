"""Tests for export groups API."""

import io

from fastapi.testclient import TestClient
from openpyxl import Workbook, load_workbook

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


def test_registry_template_download(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.get(
        f"{settings.API_V1_STR}/export-groups/registry/template",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    assert "spreadsheetml" in r.headers["content-type"]
    wb = load_workbook(io.BytesIO(r.content))
    ws = wb.active
    assert ws.cell(row=1, column=1).value == "字段编码"
    assert ws.cell(row=1, column=2).value == "字段名称"
    assert ws.cell(row=1, column=3).value == "所属分组"
    codes = [ws.cell(row=i, column=1).value for i in range(2, ws.max_row + 1)]
    assert "sms_signature" in codes


def _create_group(
    client: TestClient, headers: dict[str, str], name: str = "测试导出组"
) -> str:
    r = client.post(
        f"{settings.API_V1_STR}/export-groups",
        headers=headers,
        json={
            "name": name,
            "description": "测试用",
            "fields": [
                {
                    "field_name": "sms_signature",
                    "field_label": "短信签名",
                    "sort_order": 0,
                },
                {
                    "field_name": "main_port_number",
                    "field_label": "主端口号",
                    "sort_order": 1,
                },
            ],
        },
    )
    assert r.status_code == 200
    return r.json()["id"]


def test_export_group_download(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    gid = _create_group(client, superuser_token_headers)
    r = client.get(
        f"{settings.API_V1_STR}/export-groups/{gid}/export",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    assert "spreadsheetml" in r.headers["content-type"]
    wb = load_workbook(io.BytesIO(r.content))
    ws = wb.active
    assert ws.cell(row=1, column=1).value == "字段组名称"
    assert ws.cell(row=2, column=1).value == "测试导出组"
    assert ws.cell(row=2, column=2).value == "sms_signature"
    assert ws.cell(row=3, column=2).value == "main_port_number"
    assert ws.cell(row=2, column=5).value == "是"


def test_export_group_download_404(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.get(
        f"{settings.API_V1_STR}/export-groups/00000000-0000-0000-0000-000000000000/export",
        headers=superuser_token_headers,
    )
    assert r.status_code == 404


def _build_import_xlsx(rows: list[list]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "字段组"
    headers = ["字段组名称", "字段编码", "字段名称", "字段顺序", "是否启用"]
    ws.append(headers)
    for row in rows:
        ws.append(row)
    output = io.BytesIO()
    wb.save(output)
    return output.getvalue()


def test_import_export_group_success(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    content = _build_import_xlsx(
        [
            ["导入字段组A", "sms_signature", "短信签名", 0, "是"],
            ["导入字段组A", "main_port_number", "主端口号", 1, "是"],
        ]
    )
    r = client.post(
        f"{settings.API_V1_STR}/export-groups/import",
        headers=superuser_token_headers,
        files={
            "file": (
                "group.xlsx",
                content,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["success_count"] == 1
    assert data["group_name"] == "导入字段组A"
    assert data["field_count"] == 2

    groups = client.get(
        f"{settings.API_V1_STR}/export-groups", headers=superuser_token_headers
    ).json()
    g = next(g for g in groups["data"] if g["name"] == "导入字段组A")
    assert len(g["fields"]) == 2


def test_import_export_group_one_column_field_codes(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    wb = Workbook()
    ws = wb.active
    ws.title = "字段编码对照表"
    ws.append(["sms_signature"])
    ws.append(["main_port_number"])
    output = io.BytesIO()
    wb.save(output)

    r = client.post(
        f"{settings.API_V1_STR}/export-groups/import",
        headers=superuser_token_headers,
        files={
            "file": (
                "字段编码对照表.xlsx",
                output.getvalue(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        },
    )

    assert r.status_code == 200
    data = r.json()
    assert data["success_count"] == 1
    assert data["group_name"] == "字段编码对照表"
    assert data["field_count"] == 2


def test_import_export_group_registry_table_format(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    wb = Workbook()
    ws = wb.active
    ws.title = "字段编码对照表"
    ws.append(["字段编码", "字段名称", "所属分组"])
    ws.append(["sms_signature", "短信签名", "签名与模板"])
    ws.append(["main_port_number", "主端口号", "端口信息"])
    output = io.BytesIO()
    wb.save(output)

    r = client.post(
        f"{settings.API_V1_STR}/export-groups/import",
        headers=superuser_token_headers,
        files={
            "file": (
                "字段编码对照表.xlsx",
                output.getvalue(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        },
    )

    assert r.status_code == 200
    data = r.json()
    assert data["success_count"] == 1
    assert data["group_name"] == "字段编码对照表"
    assert data["field_count"] == 2


def test_import_export_group_invalid_field_code(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    content = _build_import_xlsx(
        [
            ["导入字段组B", "sms_signature", "短信签名", 0, "是"],
            ["导入字段组B", "not_a_real_field", "不存在", 1, "是"],
        ]
    )
    r = client.post(
        f"{settings.API_V1_STR}/export-groups/import",
        headers=superuser_token_headers,
        files={
            "file": (
                "group.xlsx",
                content,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["success_count"] == 0
    assert data["error_count"] == 1
    assert data["errors"][0]["value"] == "not_a_real_field"


def test_import_export_group_bad_extension(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.post(
        f"{settings.API_V1_STR}/export-groups/import",
        headers=superuser_token_headers,
        files={"file": ("group.txt", b"not excel", "text/plain")},
    )
    assert r.status_code == 400
    assert "仅支持" in r.json()["detail"]
