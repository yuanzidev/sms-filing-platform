"""Tests for qualifications API: updated field schema."""
import uuid
from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.core.db import engine
from app.models import QualificationInfo


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


def test_signature_search_supports_exact_match(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    marker = uuid.uuid4().hex[:8]
    short = f"抖音{marker}"
    for signature in (short, f"{short}商城"):
        r = client.post(
            f"{settings.API_V1_STR}/qualifications",
            headers=superuser_token_headers,
            json={"enterprise_name": f"企业{signature}", "sms_signature": signature},
        )
        assert r.status_code == 200, r.text
    r = client.get(
        f"{settings.API_V1_STR}/qualifications",
        headers=superuser_token_headers,
        params={"sms_signature": short, "sms_signature_mode": "exact"},
    )
    assert r.status_code == 200, r.text
    assert [item["sms_signature"] for item in r.json()["data"]] == [short]


def test_diversion_search_matches_link_and_phone(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    marker = uuid.uuid4().hex[:8]
    link = f"https://example.com/path/{marker}/details"
    phone = f"138{int(marker[:6], 16):08d}"
    created = client.post(
        f"{settings.API_V1_STR}/qualifications",
        headers=superuser_token_headers,
        json={
            "enterprise_name": f"引流测试{marker}",
            "diversion_long_link": link,
            "diversion_number": phone,
        },
    )
    assert created.status_code == 200, created.text
    other = client.post(
        f"{settings.API_V1_STR}/qualifications",
        headers=superuser_token_headers,
        json={"enterprise_name": f"无引流测试{marker}"},
    )
    assert other.status_code == 200, other.text
    for keyword in (marker, phone):
        response = client.get(
            f"{settings.API_V1_STR}/qualifications",
            headers=superuser_token_headers,
            params={"diversion_info": keyword},
        )
        assert response.status_code == 200, response.text
        assert any(item["id"] == created.json()["id"] for item in response.json()["data"])
        assert all(item["id"] != other.json()["id"] for item in response.json()["data"])


def test_list_qualifications_filter_by_identity_cert_number(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    marker = "IDSEARCH001"
    legal_number = f"11010119900101{marker}"
    responsible_number = f"11010119900202{marker}"
    handler_number = f"11010119900303{marker}"

    for enterprise_name, field_name, value in (
        ("法人证件搜索企业", "legal_representative_cert_number", legal_number),
        ("责任人证件搜索企业", "responsible_cert_number", responsible_number),
        ("经办人证件搜索企业", "handler_cert_number", handler_number),
    ):
        payload = {
            "enterprise_name": enterprise_name,
            "cert_number": f"91330100{marker}{field_name}",
            field_name: value,
        }
        r = client.post(
            f"{settings.API_V1_STR}/qualifications",
            headers=superuser_token_headers,
            json=payload,
        )
        assert r.status_code == 200, r.text

    r = client.get(
        f"{settings.API_V1_STR}/qualifications",
        headers=superuser_token_headers,
        params={"identity_cert_number": marker},
    )
    assert r.status_code == 200
    names = {item["enterprise_name"] for item in r.json()["data"]}
    assert {
        "法人证件搜索企业",
        "责任人证件搜索企业",
        "经办人证件搜索企业",
    }.issubset(names)


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


def _unique_marker() -> str:
    return uuid.uuid4().hex[:8]


def test_batch_by_signatures_filters_by_import_date(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    marker = _unique_marker()
    signature = f"同签名日期筛选-{marker}"
    old_created_at = datetime(2026, 9, 13, 16, 30, tzinfo=timezone.utc)
    target_created_at = datetime(2026, 9, 14, 16, 30, tzinfo=timezone.utc)

    with Session(engine) as session:
        old_item = QualificationInfo(
            enterprise_name=f"旧资质-{marker}",
            sms_signature=signature,
            created_at=old_created_at,
            updated_at=old_created_at,
        )
        target_item = QualificationInfo(
            enterprise_name=f"目标资质-{marker}",
            sms_signature=signature,
            created_at=target_created_at,
            updated_at=target_created_at,
        )
        session.add(old_item)
        session.add(target_item)
        session.commit()

    r = client.post(
        f"{settings.API_V1_STR}/qualifications/batch-by-signatures",
        headers=superuser_token_headers,
        json={"signatures": [signature], "import_date": "2026-09-15"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["unmatched_signatures"] == []
    names = {item["enterprise_name"] for item in body["matched_qualifications"]}
    assert names == {f"目标资质-{marker}"}


def test_batch_by_signatures_filters_by_import_minute(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    marker = _unique_marker()
    signature = f"同日分时筛选-{marker}"
    with Session(engine) as session:
        for name, created_at in (
            ("早", datetime(2026, 9, 15, 2, 30, 10, tzinfo=timezone.utc)),
            ("晚", datetime(2026, 9, 15, 2, 30, 20, tzinfo=timezone.utc)),
        ):
            session.add(QualificationInfo(
                enterprise_name=f"{name}-{marker}",
                sms_signature=signature,
                created_at=created_at,
                updated_at=created_at,
            ))
        session.commit()

    r = client.post(
        f"{settings.API_V1_STR}/qualifications/batch-by-signatures",
        headers=superuser_token_headers,
        json={"signatures": [signature], "import_datetime": "2026-09-15T10:30:10"},
    )
    assert r.status_code == 200, r.text
    names = {item["enterprise_name"] for item in r.json()["matched_qualifications"]}
    assert names == {f"早-{marker}"}


def test_batch_by_signatures_preserves_duplicate_input_rows(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    marker = _unique_marker()
    signature = f"重复签名-{marker}"
    missing = f"无匹配签名-{marker}"
    with Session(engine) as session:
        item = QualificationInfo(enterprise_name=f"测试企业-{marker}", sms_signature=signature)
        session.add(item)
        session.commit()
        item_id = str(item.id)

    r = client.post(
        f"{settings.API_V1_STR}/qualifications/batch-by-signatures",
        headers=superuser_token_headers,
        json={"signatures": [signature, missing, signature, missing]},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert [q["id"] for q in body["matched_qualifications"]] == [item_id, item_id]
    assert body["unmatched_signatures"] == [missing, missing]


def test_import_rejects_missing_enterprise_name(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """缺少「企业名称」列视为模板不匹配，直接 400"""
    headers = ["法人证件类型", "法人证件号码"]
    rows = [["身份证", "110101199001011234"]]
    data = _build_xlsx(headers, rows)

    files = {"file": ("test.xlsx", data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    r = client.post(
        f"{settings.API_V1_STR}/qualifications/import",
        headers=superuser_token_headers,
        files=files,
    )
    assert r.status_code == 400
    assert "企业名称" in r.json()["detail"]


def test_import_succeeds_without_legal_rep_columns(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """法人证件列完全缺失时仍可导入（法人字段选填）"""
    marker = _unique_marker()
    headers = ["企业名称", "短信签名"]
    rows = [[f"测试企业C-{marker}", f"测试签名-{marker}"]]
    data = _build_xlsx(headers, rows)

    files = {"file": ("test.xlsx", data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    r = client.post(
        f"{settings.API_V1_STR}/qualifications/import",
        headers=superuser_token_headers,
        files=files,
    )
    assert r.status_code == 200
    assert r.json()["success_count"] == 1


def test_import_success_with_required_fields(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    marker = _unique_marker()
    headers = [
        "企业名称", "法人证件类型", "法人证件号码", "法人证件地址",
    ]
    rows = [[f"测试企业B-{marker}", "身份证", f"11010119900101{marker}", "北京市朝阳区XX路1号"]]
    data = _build_xlsx(headers, rows)

    files = {"file": ("test.xlsx", data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    r = client.post(
        f"{settings.API_V1_STR}/qualifications/import",
        headers=superuser_token_headers,
        files=files,
    )
    assert r.status_code == 200
    assert r.json()["success_count"] == 1


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
    # 经办人手机号由端口管理维护，资质模板中后续列前移一位。
    assert headers[11] == "经办人姓名", f"col12 应为「经办人姓名」，实际：{headers[11]}"
    assert "经办人手机号" not in headers
    assert headers[16] == "法人姓名"
    assert headers[20] == "法人身份证正面"
    assert headers[21] == "法人身份证反面"
    assert headers[35] == "引流短链"
    assert headers[36] == "引流长链"
    assert headers[37] == "商标唯一性举证"
    assert headers[38] == "其他证明图片"
    assert headers[43] == "签名举证附件"
    assert headers[44] == "引流号码举证附件"
    assert headers[45] == "引流链接举证"
    # 旧名不应存在
    assert "链接地址" not in headers
    assert "经办人身份证正面" not in headers
    assert "经办人身份证反面" not in headers
    assert "引流举证附件" not in headers
    # 总列数
    assert len([h for h in headers if h]) == 47


def test_import_accepts_renamed_link_address_header(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    marker = _unique_marker()
    enterprise_name = f"测试企业链接-{marker}"
    headers = [
        "企业名称", "法人证件类型", "法人证件号码", "法人证件地址", "引流链接", "短信签名",
    ]
    rows = [[enterprise_name, "身份证", f"11010119900101{marker}", "北京市朝阳区XX路1号", f"https://example.com/{marker}", f"【测试签名{marker}】"]]
    data = _build_xlsx(headers, rows)

    files = {"file": ("test.xlsx", data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    r = client.post(
        f"{settings.API_V1_STR}/qualifications/import",
        headers=superuser_token_headers,
        files=files,
    )
    assert r.status_code == 200
    assert r.json()["success_count"] == 1
    # 验证值确实落到新短链字段，并同步旧 link_address 兼容字段
    list_r = client.get(
        f"{settings.API_V1_STR}/qualifications",
        headers=superuser_token_headers,
        params={"enterprise_name": enterprise_name},
    )
    assert list_r.status_code == 200
    item = list_r.json()["data"][0]
    assert item["diversion_short_link"] == f"https://example.com/{marker}"
    assert item["link_address"] == f"https://example.com/{marker}"
    assert item["sms_signature"] == f"【测试签名{marker}】"


def test_import_accepts_short_and_long_link_headers(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    marker = _unique_marker()
    enterprise_name = f"测试企业短长链-{marker}"
    headers = ["企业名称", "引流短链", "引流长链", "短信签名"]
    rows = [[enterprise_name, f"https://t.example/{marker}", f"https://example.com/long/{marker}", f"签名短长链-{marker}"]]
    data = _build_xlsx(headers, rows)

    files = {"file": ("test.xlsx", data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    r = client.post(
        f"{settings.API_V1_STR}/qualifications/import",
        headers=superuser_token_headers,
        files=files,
    )
    assert r.status_code == 200, r.text
    assert r.json()["success_count"] == 1

    list_r = client.get(
        f"{settings.API_V1_STR}/qualifications",
        headers=superuser_token_headers,
        params={"enterprise_name": enterprise_name},
    )
    assert list_r.status_code == 200
    item = list_r.json()["data"][0]
    assert item["diversion_short_link"] == f"https://t.example/{marker}"
    assert item["link_address"] == f"https://t.example/{marker}"
    assert item["diversion_long_link"] == f"https://example.com/long/{marker}"


def test_import_qualifications_with_empty_legal_fields(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """法人证件类型/号码/地址为空可导入"""
    from io import BytesIO

    from openpyxl import Workbook

    marker = _unique_marker()
    wb = Workbook()
    ws = wb.active
    headers = ["企业名称", "法人证件类型", "法人证件号码", "法人证件地址", "短信签名"]
    for col_idx, h in enumerate(headers, 1):
        ws.cell(row=1, column=col_idx, value=h)
    # 法人字段留空
    ws.cell(row=2, column=1, value=f"测试企业-{marker}")
    ws.cell(row=2, column=5, value=f"测试签名-{marker}")

    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)

    r = client.post(
        f"{settings.API_V1_STR}/qualifications/import",
        headers=superuser_token_headers,
        files={"file": ("test.xlsx", buf, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["success_count"] >= 1


def test_qualification_template_notes_mention_optional_legal(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    from io import BytesIO

    from openpyxl import load_workbook

    r = client.get(
        f"{settings.API_V1_STR}/qualifications/template",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    wb = load_workbook(BytesIO(r.content))
    notes_ws = wb["填写说明"]
    all_text = "\n".join(str(c.value) for row in notes_ws.iter_rows() for c in row if c.value)
    assert "法人证件类型" in all_text
    assert "选填" in all_text


def test_template_signature_example_has_no_brackets(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    from io import BytesIO

    from openpyxl import load_workbook

    r = client.get(
        f"{settings.API_V1_STR}/qualifications/template",
        headers=superuser_token_headers,
    )
    wb = load_workbook(BytesIO(r.content))
    ws = wb.active
    sig_cell = ws.cell(row=2, column=24).value  # 短信签名列
    assert "【" not in str(sig_cell)
    assert "】" not in str(sig_cell)


def test_import_collects_all_errors_and_writes_valid_rows(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """混合文件：错误行收集所有错误，有效行批量写入"""
    marker = _unique_marker()
    valid_enterprise_name = f"测试企业有效行-{marker}"
    headers = ["企业名称", "是否签名校验", "短信签名"]
    rows = [
        ["", "是", "签名A"],            # 行2：企业名称为空
        ["测试企业错误行", "也许", "签名B"],  # 行3：布尔字段值无效
        [valid_enterprise_name, "是", f"签名C-{marker}"],    # 行4：有效
        ["", "", ""],                   # 行5：空行跳过
    ]
    data = _build_xlsx(headers, rows)

    files = {"file": ("test.xlsx", data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    r = client.post(
        f"{settings.API_V1_STR}/qualifications/import",
        headers=superuser_token_headers,
        files=files,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["success_count"] == 1
    assert body["error_count"] == 2
    assert body["total"] == 3
    err_fields = {e["field"] for e in body["errors"]}
    assert err_fields == {"企业名称", "是否签名校验"}
    # 有效行确实写入
    list_r = client.get(
        f"{settings.API_V1_STR}/qualifications",
        headers=superuser_token_headers,
        params={"enterprise_name": valid_enterprise_name},
    )
    assert list_r.status_code == 200
    assert list_r.json()["total"] >= 1


def test_import_returns_error_report_xlsx(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    from io import BytesIO

    from openpyxl import load_workbook

    errors = [
        {"row": 2, "field": "企业名称", "value": "", "reason": "企业名称不能为空", "suggestion": "请填写企业名称"},
        {"row": 3, "field": "是否签名校验", "value": "也许", "reason": "布尔字段值无效", "suggestion": "请填写「是」或「否」"},
    ]
    r = client.post(
        f"{settings.API_V1_STR}/qualifications/import/error-report",
        headers=superuser_token_headers,
        json={"errors": errors},
    )
    assert r.status_code == 200
    assert "spreadsheetml" in r.headers["content-type"]
    wb = load_workbook(BytesIO(r.content))
    ws = wb.active
    assert ws.title == "导入错误报告"
    assert ws.cell(row=1, column=1).value == "行号"
    assert ws.cell(row=2, column=2).value == "企业名称"
    assert ws.cell(row=3, column=5).value == "请填写「是」或「否」"


def test_batch_delete_qualifications(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    marker = _unique_marker()
    ids = []
    for idx in range(2):
        r = client.post(
            f"{settings.API_V1_STR}/qualifications",
            headers=superuser_token_headers,
            json={
                "enterprise_name": f"批量删除资质-{marker}-{idx}",
                "sms_signature": f"批量删除签名-{marker}-{idx}",
            },
        )
        assert r.status_code == 200, r.text
        ids.append(r.json()["id"])

    r = client.post(
        f"{settings.API_V1_STR}/qualifications/batch-delete",
        headers=superuser_token_headers,
        json={"ids": ids},
    )
    assert r.status_code == 200, r.text
    assert r.json()["deleted_count"] == 2

    for qualification_id in ids:
        get_r = client.get(
            f"{settings.API_V1_STR}/qualifications/{qualification_id}",
            headers=superuser_token_headers,
        )
        assert get_r.status_code == 404


def test_import_skips_duplicate_qualification_rows(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    marker = _unique_marker()
    headers = [
        "企业名称",
        "单位证件号码",
        "单位证件类型",
        "经办人姓名",
        "经办人证件类型",
        "经办人证件号码",
        "责任人姓名",
        "责任人证件类型",
        "责任人证件号码",
        "法人姓名",
        "法人证件类型",
        "法人证件号码",
        "短信签名",
        "签名类型/来源",
        "引流短链",
        "引流号码",
    ]
    row = [
        f"重复导入企业-{marker}",
        f"91330100DUP{marker}",
        "营业执照",
        "经办人A",
        "身份证",
        f"11010119900101{marker}1",
        "责任人A",
        "身份证",
        f"11010119900101{marker}2",
        "法人A",
        "身份证",
        f"11010119900101{marker}3",
        f"重复签名-{marker}",
        "自营签名",
        f"https://t.example/{marker}",
        f"138{marker}",
    ]
    data = _build_xlsx(headers, [row, row])
    files = {"file": ("test.xlsx", data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}

    r = client.post(
        f"{settings.API_V1_STR}/qualifications/import",
        headers=superuser_token_headers,
        files=files,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["success_count"] == 1
    assert body["skipped_count"] == 1
    assert body["skipped_rows"] == [3]

    r2 = client.post(
        f"{settings.API_V1_STR}/qualifications/import",
        headers=superuser_token_headers,
        files={"file": ("test.xlsx", data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert r2.status_code == 200, r2.text
    body2 = r2.json()
    assert body2["success_count"] == 0
    assert body2["skipped_count"] == 2



def test_preview_qualifications_import(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """预览接口返回前 5 行数据与未识别表头"""
    headers = ["企业名称", "短信签名", "未识别列X"]
    rows = [["测试企业A", "签名A", "忽略值A"]]
    data = _build_xlsx(headers, rows)

    files = {"file": ("test.xlsx", data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    r = client.post(
        f"{settings.API_V1_STR}/qualifications/import/preview",
        headers=superuser_token_headers,
        files=files,
    )
    assert r.status_code == 200
    body = r.json()
    assert "企业名称" in body["headers"]
    assert body["unrecognized_headers"] == ["未识别列X"]
    assert body["total_data_rows"] == 1
    assert body["rows"][0]["enterprise_name"] == "测试企业A"
    assert body["rows"][0]["sms_signature"] == "签名A"


def test_preview_qualification_import_recognizes_image_headers(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """图片列不进入未识别表头列表，避免导入前预览误报。"""
    headers = ["企业名称", "商标唯一性举证", "其他证明图片", "引流号码举证附件", "引流链接举证"]
    rows = [["测试企业图片列", "", "", "", ""]]
    data = _build_xlsx(headers, rows)

    files = {"file": ("test.xlsx", data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    r = client.post(
        f"{settings.API_V1_STR}/qualifications/import/preview",
        headers=superuser_token_headers,
        files=files,
    )
    assert r.status_code == 200
    assert r.json()["unrecognized_headers"] == []


def test_preview_qualifications_import_rejects_bad_extension(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """非 Excel 文件返回 400"""
    files = {"file": ("test.txt", b"not excel", "text/plain")}
    r = client.post(
        f"{settings.API_V1_STR}/qualifications/import/preview",
        headers=superuser_token_headers,
        files=files,
    )
    assert r.status_code == 400
