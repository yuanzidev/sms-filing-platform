"""Tests for qualifications API: updated field schema."""
from fastapi.testclient import TestClient

from app.core.config import settings


def test_list_qualifications_filter_by_sms_signature(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    for sig in ("平台A签名", "平台B签名"):
        client.post(
            f"{settings.API_V1_STR}/qualifications",
            headers=superuser_token_headers,
            json={
                "enterprise_name": f"测试企业 {sig}",
                "sms_signature": sig,
                "legal_representative_cert_type": "身份证",
                "legal_representative_cert_number": "110101199001011234",
                "legal_representative_cert_address": "北京市朝阳区XX路1号",
            },
        )
    r = client.get(
        f"{settings.API_V1_STR}/qualifications",
        headers=superuser_token_headers,
        params={"sms_signature": "平台A"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["total"] >= 1
    assert all("平台A" in item["sms_signature"] for item in body["data"])


def test_template_has_required_headers(
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
    assert "企业名称" in headers
    assert "法人证件类型" in headers
    assert "法人证件号码" in headers
    assert "法人证件地址" in headers
    assert "单位证件图片" in headers
    assert "签名" not in headers


def _build_xlsx(headers: list[str], rows: list[list]) -> bytes:
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


def test_import_rejects_missing_required_fields(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    headers = ["企业名称", "法人证件类型", "法人证件号码"]
    rows = [["测试企业A", "", ""]]
    data = _build_xlsx(headers, rows)

    files = {"file": ("test.xlsx", data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    r = client.post(
        f"{settings.API_V1_STR}/qualifications/import",
        headers=superuser_token_headers,
        files=files,
    )
    assert r.status_code == 400
    assert "法人证件" in r.json()["detail"]


def test_import_success_with_required_fields(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    headers = [
        "企业名称", "法人证件类型", "法人证件号码", "法人证件地址",
    ]
    rows = [["测试企业B", "身份证", "110101199001011234", "北京市朝阳区XX路1号"]]
    data = _build_xlsx(headers, rows)

    files = {"file": ("test.xlsx", data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    r = client.post(
        f"{settings.API_V1_STR}/qualifications/import",
        headers=superuser_token_headers,
        files=files,
    )
    assert r.status_code == 200
    assert r.json()["count"] == 1


def test_template_column_order_matches_new_spec(
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
    # 新模板 45 列关键位置断言
    assert headers[13] == "引流链接", f"col14 应为「引流链接」，实际：{headers[13]}"
    assert headers[15] == "引流号码举证附件", f"col16 应为「引流号码举证附件」，实际：{headers[15]}"
    assert headers[16] == "引流链接举证", f"col17 应为「引流链接举证」，实际：{headers[16]}"
    assert headers[20] == "法人身份证正面", f"col21 应为「法人身份证正面」，实际：{headers[20]}"
    assert headers[21] == "法人身份证反面", f"col22 应为「法人身份证反面」，实际：{headers[21]}"
    # 旧名不应存在
    assert "链接地址" not in headers
    assert "经办人身份证正面" not in headers
    assert "经办人身份证反面" not in headers
    assert "引流举证附件" not in headers
    # 总列数
    assert len([h for h in headers if h]) == 45


def test_import_accepts_renamed_link_address_header(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    headers = [
        "企业名称", "法人证件类型", "法人证件号码", "法人证件地址", "引流链接", "短信签名",
    ]
    rows = [["测试企业链接", "身份证", "110101199001011234", "北京市朝阳区XX路1号", "https://example.com", "【测试签名】"]]
    data = _build_xlsx(headers, rows)

    files = {"file": ("test.xlsx", data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    r = client.post(
        f"{settings.API_V1_STR}/qualifications/import",
        headers=superuser_token_headers,
        files=files,
    )
    assert r.status_code == 200
    assert r.json()["count"] == 1
    # 验证值确实落到 link_address 和 sms_signature 字段
    list_r = client.get(
        f"{settings.API_V1_STR}/qualifications",
        headers=superuser_token_headers,
        params={"enterprise_name": "测试企业链接"},
    )
    assert list_r.status_code == 200
    item = list_r.json()["data"][0]
    assert item["link_address"] == "https://example.com"
    assert item["sms_signature"] == "【测试签名】"

