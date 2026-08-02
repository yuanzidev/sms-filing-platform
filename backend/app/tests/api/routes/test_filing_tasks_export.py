"""Regression tests for filing task export — all selected fields must appear in Excel."""
from io import BytesIO
from typing import Generator

import pytest
from fastapi.testclient import TestClient
from openpyxl import load_workbook
from sqlmodel import Session, delete

from app.core.config import settings
from app.core.db import engine
from app.models import FilingTask
from app.services.export_field_registry import REGISTRY


@pytest.fixture(scope="module", autouse=True)
def _cleanup_filing_tasks() -> Generator[None, None, None]:
    yield
    with Session(engine) as session:
        session.execute(delete(FilingTask))
        session.commit()


def _create_qualification(client, headers, name):
    r = client.post(
        f"{settings.API_V1_STR}/qualifications",
        headers=headers,
        json={
            "enterprise_name": name,
            "sms_signature": "签名X",
            "signature_type": "自营签名",
            "specific_usage": "用户登录",
            "diversion_number": "13800000000",
            "link_address": "https://example.com",
            "legal_representative_cert_type": "身份证",
            "legal_representative_cert_number": "110101199001011234",
            "legal_representative_cert_address": "北京市朝阳区",
        },
    )
    assert r.status_code == 200, r.text
    return r.json()["id"]


def _create_port(client, headers, main_port_number):
    r = client.post(
        f"{settings.API_V1_STR}/port-info",
        headers=headers,
        json={
            "carrier": "中国移动",
            "main_port_number": main_port_number,
            "enterprise_name": "测试企业",
            "group_code": "G001",
            "carrier_room": "机房A",
            "enterprise_room": "机房B",
            "port_type": "短信",
            "operation_type": "新增",
            "authorization_letter": "授字001",
        },
    )
    assert r.status_code == 200, r.text
    return r.json()["id"]


def _create_export_group_all_fields(client, headers, name):
    fields = [
        {"field_name": f.name, "field_label": f.label, "sort_order": i}
        for i, f in enumerate(REGISTRY, 1)
    ]
    r = client.post(
        f"{settings.API_V1_STR}/export-groups",
        headers=headers,
        json={"name": name, "fields": fields},
    )
    assert r.status_code == 200, r.text
    return r.json()["id"]


def test_export_includes_all_registry_fields(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    qual_id = _create_qualification(client, superuser_token_headers, "全字段企业")
    port_id = _create_port(client, superuser_token_headers, "10698全部")
    group_id = _create_export_group_all_fields(client, superuser_token_headers, "全字段组")

    r = client.post(
        f"{settings.API_V1_STR}/filing-tasks",
        headers=superuser_token_headers,
        json={
            "qualification_ids": [qual_id],
            "port_ids": [port_id],
            "export_group_id": group_id,
        },
    )
    assert r.status_code == 200, r.text
    task_id = r.json()["id"]

    r = client.get(
        f"{settings.API_V1_STR}/filing-tasks/{task_id}/download",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200

    wb = load_workbook(BytesIO(r.content))
    ws = wb.active
    header_row = [c.value for c in ws[1]]

    expected_labels = {f.label for f in REGISTRY}
    actual_labels = set(header_row)
    missing = expected_labels - actual_labels
    assert not missing, f"导出缺失列: {missing}"
