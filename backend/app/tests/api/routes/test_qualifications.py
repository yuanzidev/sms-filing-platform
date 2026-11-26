"""Tests for qualifications API: updated field schema."""
import uuid
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.api.routes import qualifications as qualifications_routes
from app.core.config import settings
from app.core.db import engine
from app.core.timezone import get_timezone
from app.models import FilingSubPortUsage, QualificationInfo, User


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


def test_backup_create_auto_promotes_only_clear_company_names(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    marker = _unique_marker()
    for signature, source, expected in (
        (f"上海富友电子商务{marker}", "企业简称", "primary"),
        (f"上海富友{marker}", "企业简称", "backup"),
        (f"上海富友电子商务{marker}", "商标", "backup"),
    ):
        response = client.post(
            f"{settings.API_V1_STR}/qualifications",
            headers=superuser_token_headers,
            json={
                "library": "backup",
                "enterprise_name": f"上海富友电子商务{marker}有限公司",
                "sms_signature": signature,
                "signature_type": source,
            },
        )
        assert response.status_code == 200, response.text
        assert response.json()["library"] == expected


def test_backup_promotion_requires_explicit_ids_and_rechecks_eligibility(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    marker = _unique_marker()
    with Session(engine) as session:
        clear = QualificationInfo(
            library="backup",
            enterprise_name=f"上海富友电子商务{marker}有限公司",
            sms_signature=f"上海富友电子商务{marker}",
        )
        unclear = QualificationInfo(
            library="backup",
            enterprise_name=f"上海富友电子商务{marker}有限公司",
            sms_signature=f"上海富友{marker}",
        )
        session.add_all([clear, unclear])
        session.commit()
        clear_id, unclear_id = str(clear.id), str(unclear.id)

    url = f"{settings.API_V1_STR}/qualifications/backup-promote"
    preview = client.post(url, headers=superuser_token_headers, json={"dry_run": True})
    assert preview.status_code == 200, preview.text
    assert clear_id in preview.json()["ids"]
    assert unclear_id not in preview.json()["ids"]

    rejected = client.post(url, headers=superuser_token_headers, json={"dry_run": False})
    assert rejected.status_code == 400
    executed = client.post(
        url,
        headers=superuser_token_headers,
        json={"dry_run": False, "ids": [clear_id, unclear_id]},
    )
    assert executed.status_code == 200, executed.text
    assert executed.json()["ids"] == [clear_id]
    with Session(engine) as session:
        assert session.get(QualificationInfo, uuid.UUID(clear_id)).library == "primary"
        assert session.get(QualificationInfo, uuid.UUID(unclear_id)).library == "backup"


def test_manual_promotion_moves_selected_backup_record(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    marker = _unique_marker()
    response = client.post(
        f"{settings.API_V1_STR}/qualifications",
        headers=superuser_token_headers,
        json={"library": "backup", "enterprise_name": f"上海富友{marker}有限公司", "sms_signature": "富友"},
    )
    item_id = response.json()["id"]
    moved = client.post(
        f"{settings.API_V1_STR}/qualifications/backup-promote/manual",
        headers=superuser_token_headers,
        json={"ids": [item_id]},
    )
    assert moved.status_code == 200, moved.text
    assert moved.json()["ids"] == [item_id]
    assert client.get(f"{settings.API_V1_STR}/qualifications/{item_id}", headers=superuser_token_headers).json()["library"] == "primary"


def test_backup_import_promotes_clear_names_and_keeps_ambiguous_names(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    marker = _unique_marker()
    enterprise = f"上海富友电子商务{marker}有限公司"
    content = _build_xlsx(
        ["企业名称", "短信签名", "签名类型/来源"],
        [[enterprise, f"上海富友电子商务{marker}", "企业简称"], [enterprise, f"上海富友{marker}", "企业简称"]],
    )
    url = f"{settings.API_V1_STR}/qualifications/import"
    for expected_count in (2, 0):
        response = client.post(url, headers=superuser_token_headers, files={"file": ("资质.xlsx", content)}, data={"library": "backup"})
        assert response.status_code == 200, response.text
        assert response.json()["success_count"] == expected_count
        assert response.json()["auto_promoted_count"] == (1 if expected_count else 0)
    with Session(engine) as session:
        records = session.exec(select(QualificationInfo).where(QualificationInfo.enterprise_name == enterprise)).all()
        assert len(records) == 2
        assert {item.sms_signature: item.library for item in records} == {
            f"上海富友电子商务{marker}": "primary",
            f"上海富友{marker}": "backup",
        }


def test_backup_edit_promotes_when_signature_becomes_clear(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    marker = _unique_marker()
    created = client.post(
        f"{settings.API_V1_STR}/qualifications",
        headers=superuser_token_headers,
        json={"library": "backup", "enterprise_name": f"上海富友电子商务{marker}有限公司", "sms_signature": f"上海富友{marker}"},
    )
    item_id = created.json()["id"]
    updated = client.patch(
        f"{settings.API_V1_STR}/qualifications/{item_id}",
        headers=superuser_token_headers,
        json={"sms_signature": f"上海富友电子商务{marker}"},
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["library"] == "primary"


def test_auto_promotion_does_not_create_duplicate_primary_records(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    marker = _unique_marker()
    with Session(engine) as session:
        for _ in range(2):
            session.add(QualificationInfo(
                library="backup",
                enterprise_name=f"上海去重科技{marker}有限公司",
                sms_signature=f"上海去重科技{marker}",
            ))
        session.commit()
    response = client.post(
        f"{settings.API_V1_STR}/qualifications/backup-promote",
        headers=superuser_token_headers,
        json={"dry_run": True},
    )
    matching = [item_id for item_id in response.json()["ids"] if
                client.get(f"{settings.API_V1_STR}/qualifications/{item_id}", headers=superuser_token_headers).json()["enterprise_name"] == f"上海去重科技{marker}有限公司"]
    assert len(matching) == 1


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


def test_batch_by_signatures_deduplicates_matched_qualifications(
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
    assert [q["id"] for q in body["matched_qualifications"]] == [item_id]
    assert body["unmatched_signatures"] == [missing, missing]


def test_batch_by_signatures_filters_by_month_range(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    marker = _unique_marker()
    signature = f"月份范围-{marker}"
    with Session(engine) as session:
        for label, month in (("之前", 1), ("范围内", 2), ("之后", 4)):
            session.add(QualificationInfo(
                enterprise_name=f"{label}-{marker}", sms_signature=signature,
                created_at=datetime(2026, month, 15, tzinfo=timezone.utc),
            ))
        session.commit()
    r = client.post(
        f"{settings.API_V1_STR}/qualifications/batch-by-signatures",
        headers=superuser_token_headers,
        json={"signatures": [signature], "import_start": "2026-02", "import_end": "2026-03", "import_precision": "month"},
    )
    assert r.status_code == 200, r.text
    assert [item["enterprise_name"] for item in r.json()["matched_qualifications"]] == [f"范围内-{marker}"]


def test_batch_by_signatures_day_and_second_ranges_use_inclusive_end(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    marker = _unique_marker()
    signature = f"时间边界-{marker}"
    with Session(engine) as session:
        for label, second in (("命中", 10), ("超出", 11)):
            session.add(QualificationInfo(
                enterprise_name=f"{label}-{marker}", sms_signature=signature,
                created_at=datetime(2026, 9, 15, 2, 30, second, tzinfo=timezone.utc),
            ))
        session.commit()
    endpoint = f"{settings.API_V1_STR}/qualifications/batch-by-signatures"
    seconds = client.post(endpoint, headers=superuser_token_headers, json={
        "signatures": [signature], "import_start": "2026-09-15T10:30:10",
        "import_end": "2026-09-15T10:30:10", "import_precision": "second",
    })
    assert seconds.status_code == 200
    assert [item["enterprise_name"] for item in seconds.json()["matched_qualifications"]] == [f"命中-{marker}"]
    day = client.post(endpoint, headers=superuser_token_headers, json={
        "signatures": [signature], "import_start": "2026-09-15",
        "import_end": "2026-09-15", "import_precision": "day",
    })
    assert day.status_code == 200
    assert len(day.json()["matched_qualifications"]) == 2


def test_backup_qualifications_are_isolated_from_primary_search(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    marker = _unique_marker()
    signature = f"备用签名-{marker}"
    created = client.post(
        f"{settings.API_V1_STR}/qualifications",
        headers=superuser_token_headers,
        json={"enterprise_name": f"备用企业-{marker}", "sms_signature": signature, "library": "backup"},
    )
    assert created.status_code == 200, created.text
    assert created.json()["library"] == "backup"
    primary = client.get(
        f"{settings.API_V1_STR}/qualifications",
        headers=superuser_token_headers,
        params={"sms_signature": signature},
    )
    backup = client.get(
        f"{settings.API_V1_STR}/qualifications",
        headers=superuser_token_headers,
        params={"sms_signature": signature, "library": "backup"},
    )
    assert primary.json()["total"] == 0
    assert backup.json()["total"] == 1
    for library, expected in (("primary", 0), ("backup", 1)):
        matched = client.post(
            f"{settings.API_V1_STR}/qualifications/batch-by-signatures",
            headers=superuser_token_headers,
            json={"signatures": [signature], "library": library},
        )
        assert matched.status_code == 200
        assert len(matched.json()["matched_qualifications"]) == expected


def test_signature_series_rule_backfills_existing_qualifications(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    marker = _unique_marker()
    signature = f"京东快递{marker}"
    series_name = f"京东系-{marker}"
    created = client.post(
        f"{settings.API_V1_STR}/qualifications",
        headers=superuser_token_headers,
        json={"enterprise_name": f"系列企业-{marker}", "sms_signature": signature,
              "business_type": "通知", "business_attribute": "业务类"},
    )
    assert created.status_code == 200
    rule = client.post(
        f"{settings.API_V1_STR}/qualifications/series-rules",
        headers=superuser_token_headers,
        json={"pattern": f"京东快递{marker}", "series_name": series_name},
    )
    assert rule.status_code == 200, rule.text
    listed = client.get(
        f"{settings.API_V1_STR}/qualifications",
        headers=superuser_token_headers,
        params={"signature_series": series_name, "business_type": "通知", "business_attribute": "业务类"},
    )
    assert listed.status_code == 200
    assert [q["id"] for q in listed.json()["data"]] == [created.json()["id"]]
    assert listed.json()["data"][0]["signature_series"] == series_name
    rule_id = rule.json()["id"]
    renamed = client.patch(f"{settings.API_V1_STR}/qualifications/series-rules/{rule_id}",
                           headers=superuser_token_headers,
                           json={"pattern": signature, "series_name": f"物流系-{marker}"})
    assert renamed.status_code == 200
    after_update = client.get(f"{settings.API_V1_STR}/qualifications/{created.json()['id']}",
                              headers=superuser_token_headers)
    assert after_update.json()["signature_series"] == f"物流系-{marker}"
    removed = client.delete(f"{settings.API_V1_STR}/qualifications/series-rules/{rule_id}",
                            headers=superuser_token_headers)
    assert removed.status_code == 200
    after_delete = client.get(f"{settings.API_V1_STR}/qualifications/{created.json()['id']}",
                              headers=superuser_token_headers)
    assert after_delete.json()["signature_series"] is None


def test_signature_can_match_multiple_series_and_filter_by_either(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    marker = _unique_marker()
    signature = f"物流{marker}金融{marker}"
    created = client.post(
        f"{settings.API_V1_STR}/qualifications",
        headers=superuser_token_headers,
        json={"enterprise_name": f"多系列企业-{marker}", "sms_signature": signature},
    )
    assert created.status_code == 200
    for pattern, name in (("物流", f"物流系-{marker}"), ("金融", f"金融类-{marker}")):
        response = client.post(
            f"{settings.API_V1_STR}/qualifications/series-rules",
            headers=superuser_token_headers,
            json={"pattern": f"{pattern}{marker}", "series_name": name},
        )
        assert response.status_code == 200, response.text
    detail = client.get(
        f"{settings.API_V1_STR}/qualifications/{created.json()['id']}",
        headers=superuser_token_headers,
    )
    assert set(detail.json()["signature_series_names"]) == {f"物流系-{marker}", f"金融类-{marker}"}
    for name in detail.json()["signature_series_names"]:
        listed = client.get(
            f"{settings.API_V1_STR}/qualifications",
            headers=superuser_token_headers,
            params={"signature_series": name},
        )
        assert created.json()["id"] in [item["id"] for item in listed.json()["data"]]


def test_bulk_levels_can_be_replaced_cleared_and_filtered(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    created = client.post(
        f"{settings.API_V1_STR}/qualifications",
        headers=superuser_token_headers,
        json={"enterprise_name": f"级别企业-{_unique_marker()}"},
    )
    qualification_id = created.json()["id"]
    endpoint = f"{settings.API_V1_STR}/qualifications/batch-levels"
    response = client.patch(endpoint, headers=superuser_token_headers,
                            json={"ids": [qualification_id], "levels": ["P0", "P2"]})
    assert response.status_code == 200, response.text
    assert response.json()["updated_count"] == 1
    for level in ("P0", "P2"):
        listed = client.get(f"{settings.API_V1_STR}/qualifications",
                            headers=superuser_token_headers, params={"qualification_level": level})
        assert qualification_id in [item["id"] for item in listed.json()["data"]]
    replaced = client.patch(endpoint, headers=superuser_token_headers,
                            json={"ids": [qualification_id], "levels": ["P1"]})
    assert replaced.status_code == 200
    detail = client.get(f"{settings.API_V1_STR}/qualifications/{qualification_id}",
                        headers=superuser_token_headers)
    assert detail.json()["qualification_levels"] == ["P1"]
    cleared = client.patch(endpoint, headers=superuser_token_headers,
                           json={"ids": [qualification_id], "levels": []})
    assert cleared.status_code == 200
    detail = client.get(f"{settings.API_V1_STR}/qualifications/{qualification_id}",
                        headers=superuser_token_headers)
    assert detail.json()["qualification_levels"] == []


def test_batch_classify_imported_signatures_reports_unmatched(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    marker = _unique_marker()
    signature = f"快递{marker}"
    rule = client.post(
        f"{settings.API_V1_STR}/qualifications/series-rules",
        headers=superuser_token_headers,
        json={"pattern": f"快递{marker}", "series_name": f"物流系-{marker}"},
    )
    assert rule.status_code == 200
    created = client.post(
        f"{settings.API_V1_STR}/qualifications",
        headers=superuser_token_headers,
        json={"enterprise_name": f"批量签名企业-{marker}", "sms_signature": signature},
    )
    assert created.status_code == 200
    response = client.post(
        f"{settings.API_V1_STR}/qualifications/series-rules/classify-signatures",
        headers=superuser_token_headers,
        json={"signatures": [signature, f"不存在{marker}"], "library": "primary"},
    )
    assert response.status_code == 200, response.text
    assert response.json() == {"updated_count": 1, "unmatched_signatures": [f"不存在{marker}"]}
    detail = client.get(
        f"{settings.API_V1_STR}/qualifications/{created.json()['id']}",
        headers=superuser_token_headers,
    )
    assert detail.json()["signature_series_names"] == [f"物流系-{marker}"]


def test_series_accepts_multiple_keywords_in_one_request(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    marker = _unique_marker()
    response = client.post(
        f"{settings.API_V1_STR}/qualifications/series-rules/batch",
        headers=superuser_token_headers,
        json={"series_name": f"物流系-{marker}",
              "patterns": [f"物流{marker}", f"快递{marker}"]},
    )
    assert response.status_code == 200, response.text
    assert len(response.json()) == 2
    for keyword in ("物流", "快递"):
        created = client.post(
            f"{settings.API_V1_STR}/qualifications",
            headers=superuser_token_headers,
            json={"enterprise_name": f"企业-{keyword}-{marker}", "sms_signature": f"{keyword}{marker}"},
        )
        assert created.status_code == 200
        assert created.json()["signature_series_names"] == [f"物流系-{marker}"]


def test_signature_series_rule_rolls_back_when_backfill_fails(
    client: TestClient, superuser_token_headers: dict[str, str], monkeypatch: pytest.MonkeyPatch
) -> None:
    pattern = f"失败回填-{_unique_marker()}"
    def fail(_session: Session) -> None:
        raise RuntimeError("归类失败")
    monkeypatch.setattr(qualifications_routes, "reclassify_qualifications", fail)
    with pytest.raises(RuntimeError, match="归类失败"):
        client.post(f"{settings.API_V1_STR}/qualifications/series-rules",
                    headers=superuser_token_headers,
                    json={"pattern": pattern, "series_name": "失败系列"})
    rules = client.get(f"{settings.API_V1_STR}/qualifications/series-rules",
                       headers=superuser_token_headers)
    assert all(rule["pattern"] != pattern for rule in rules.json())


def test_backup_cleanup_requires_condition_and_supports_preview(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    marker = _unique_marker()
    created = client.post(
        f"{settings.API_V1_STR}/qualifications",
        headers=superuser_token_headers,
        json={"enterprise_name": f"待清理-{marker}", "library": "backup"},
    )
    assert created.status_code == 200
    endpoint = f"{settings.API_V1_STR}/qualifications/backup-cleanup"
    missing = client.post(endpoint, headers=superuser_token_headers, json={})
    assert missing.status_code == 400
    request = {"before": "2099-01-01", "reported": False}
    unsafe = client.post(endpoint, headers=superuser_token_headers,
                         json={**request, "dry_run": False})
    assert unsafe.status_code == 400
    preview = client.post(endpoint, headers=superuser_token_headers, json=request)
    assert preview.status_code == 200, preview.text
    assert created.json()["id"] in preview.json()["ids"]
    present = client.get(f"{settings.API_V1_STR}/qualifications", headers=superuser_token_headers,
                         params={"library": "backup", "enterprise_name": f"待清理-{marker}"})
    assert present.json()["total"] == 1
    later = client.post(f"{settings.API_V1_STR}/qualifications", headers=superuser_token_headers,
                        json={"enterprise_name": f"预览后新增-{marker}", "library": "backup"})
    assert later.status_code == 200
    deleted = client.post(endpoint, headers=superuser_token_headers,
                          json={**request, "dry_run": False, "ids": preview.json()["ids"]})
    assert deleted.status_code == 200
    assert created.json()["id"] in deleted.json()["ids"]
    hidden = client.get(f"{settings.API_V1_STR}/qualifications", headers=superuser_token_headers,
                        params={"library": "backup", "enterprise_name": f"待清理-{marker}"})
    assert hidden.json()["total"] == 0
    still_present = client.get(f"{settings.API_V1_STR}/qualifications", headers=superuser_token_headers,
                               params={"library": "backup", "enterprise_name": f"预览后新增-{marker}"})
    assert still_present.json()["total"] == 1


def test_archived_backup_qualification_can_be_imported_again(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    marker = _unique_marker()
    name, signature = f"重新导入-{marker}", f"归档签名-{marker}"
    content = _build_xlsx(["企业名称", "短信签名"], [[name, signature]])
    endpoint = f"{settings.API_V1_STR}/qualifications/import"
    files = {"file": ("backup.xlsx", content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    first = client.post(endpoint, headers=superuser_token_headers, files=files, data={"library": "backup"})
    assert first.status_code == 200
    assert first.json()["success_count"] == 1
    preview = client.post(f"{settings.API_V1_STR}/qualifications/backup-cleanup",
                          headers=superuser_token_headers,
                          json={"before": "2099-01-01", "reported": False})
    archived = client.post(f"{settings.API_V1_STR}/qualifications/backup-cleanup",
                           headers=superuser_token_headers,
                           json={"before": "2099-01-01", "reported": False,
                                 "dry_run": False, "ids": preview.json()["ids"]})
    assert archived.status_code == 200
    second = client.post(endpoint, headers=superuser_token_headers, files=files, data={"library": "backup"})
    assert second.status_code == 200
    assert second.json()["success_count"] == 1


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


def test_batch_delete_qualification_keeps_historical_sub_port_usage(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    created = client.post(
        f"{settings.API_V1_STR}/qualifications",
        headers=superuser_token_headers,
        json={"enterprise_name": f"历史报备资质-{_unique_marker()}"},
    )
    assert created.status_code == 200
    qualification_id = uuid.UUID(created.json()["id"])
    with Session(engine) as session:
        user = session.exec(select(User).where(User.is_superuser == True)).first()  # noqa: E712
        assert user is not None
        usage = FilingSubPortUsage(
            main_port_number="10690000",
            port_number=uuid.uuid4().hex[:6],
            qualification_id=qualification_id,
            operator_id=user.id,
        )
        session.add(usage)
        session.commit()
        usage_id = usage.id

    try:
        response = client.post(
            f"{settings.API_V1_STR}/qualifications/batch-delete",
            headers=superuser_token_headers,
            json={"ids": [str(qualification_id)]},
        )
        assert response.status_code == 200, response.text
        assert response.json()["deleted_count"] == 1
        assert client.get(
            f"{settings.API_V1_STR}/qualifications/{qualification_id}",
            headers=superuser_token_headers,
        ).status_code == 404
        with Session(engine) as session:
            assert session.get(FilingSubPortUsage, usage_id) is not None
    finally:
        with Session(engine) as session:
            stored_usage = session.get(FilingSubPortUsage, usage_id)
            if stored_usage is not None:
                session.delete(stored_usage)
                session.commit()


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

    with Session(engine) as session:
        original = session.exec(select(QualificationInfo).where(QualificationInfo.sms_signature == f"重复签名-{marker}")).one()
        original_id = original.id
        original.created_at = datetime(2020, 1, 1, tzinfo=timezone.utc)
        original.updated_at = original.created_at
        session.add(original)
        session.commit()

    r2 = client.post(
        f"{settings.API_V1_STR}/qualifications/import",
        headers=superuser_token_headers,
        files={"file": ("test.xlsx", data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert r2.status_code == 200, r2.text
    body2 = r2.json()
    assert body2["success_count"] == 0
    assert body2["updated_count"] == 1
    assert body2["skipped_count"] == 1
    with Session(engine) as session:
        same = session.exec(select(QualificationInfo).where(QualificationInfo.sms_signature == f"重复签名-{marker}")).one()
        assert same.id == original_id
        assert same.created_at.year > 2020
        assert abs((same.updated_at - same.created_at).total_seconds()) < 1
        import_date = same.created_at.replace(tzinfo=timezone.utc).astimezone(get_timezone()).date().isoformat()
    matched = client.post(
        f"{settings.API_V1_STR}/qualifications/batch-by-signatures",
        headers=superuser_token_headers,
        json={"signatures": [f"重复签名-{marker}"], "import_date": import_date},
    )
    assert matched.status_code == 200
    assert [item["id"] for item in matched.json()["matched_qualifications"]] == [str(original_id)]



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
