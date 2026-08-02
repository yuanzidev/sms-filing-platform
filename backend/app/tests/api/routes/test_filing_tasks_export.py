"""Regression tests for filing task export — all selected fields must appear in Excel."""
from io import BytesIO
from typing import Generator

import pytest
from fastapi.testclient import TestClient
from openpyxl import load_workbook
from sqlmodel import Session, delete

from app.core.config import settings
from app.core.db import engine
from app.models import FilingSubPortUsage, FilingTask
from app.services.export_field_registry import REGISTRY


@pytest.fixture(scope="module", autouse=True)
def _cleanup_filing_tasks() -> Generator[None, None, None]:
    yield
    with Session(engine) as session:
        # 占用记录引用 user（operator_id），须先清理，否则 session 级 user 清理会违反外键
        session.execute(delete(FilingSubPortUsage))
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


def test_create_filing_task_with_auto_sub_ports(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """自动分配模式下，导出含随机生成的子端口号"""
    qual_id = _create_qualification(client, superuser_token_headers, "自动分配企业")
    # 主端口行（sub_port_number 为空）
    port_id = _create_port(client, superuser_token_headers, "10698AUTO")

    # 仅勾选主端口号、子端口号两列的字段组
    r = client.post(
        f"{settings.API_V1_STR}/export-groups",
        headers=superuser_token_headers,
        json={
            "name": "子端口导出组",
            "fields": [
                {"field_name": "main_port_number", "field_label": "主端口号", "sort_order": 1},
                {"field_name": "sub_port_number", "field_label": "子端口号", "sort_order": 2},
            ],
        },
    )
    group_id = r.json()["id"]

    r = client.post(
        f"{settings.API_V1_STR}/filing-tasks",
        headers=superuser_token_headers,
        json={
            "qualification_ids": [qual_id],
            "port_ids": [port_id],
            "export_group_id": group_id,
            "auto_allocate_sub_ports": True,
            "sub_port_range_start": 300001,
            "sub_port_range_end": 300100,
        },
    )
    assert r.status_code == 200, r.text
    task_id = r.json()["id"]

    r = client.get(
        f"{settings.API_V1_STR}/filing-tasks/{task_id}/download",
        headers=superuser_token_headers,
    )
    wb = load_workbook(BytesIO(r.content))
    ws = wb.active
    # 第 2 行第 2 列是子端口号
    sub_port_value = ws.cell(row=2, column=2).value
    assert sub_port_value is not None
    assert str(sub_port_value).startswith("3000")  # 在范围内


def test_create_filing_task_range_exhausted_409(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """范围耗尽时 409"""
    qual_id = _create_qualification(client, superuser_token_headers, "范围耗尽企业")
    # 创建 2 个资质，但范围只够 1 个
    qual_id_2 = _create_qualification(client, superuser_token_headers, "范围耗尽企业2")
    port_id = _create_port(client, superuser_token_headers, "10698EXH")

    r = client.post(
        f"{settings.API_V1_STR}/export-groups",
        headers=superuser_token_headers,
        json={
            "name": "耗尽组",
            "fields": [
                {"field_name": "main_port_number", "field_label": "主端口号", "sort_order": 1},
            ],
        },
    )
    group_id = r.json()["id"]

    r = client.post(
        f"{settings.API_V1_STR}/filing-tasks",
        headers=superuser_token_headers,
        json={
            "qualification_ids": [qual_id, qual_id_2],
            "port_ids": [port_id],
            "export_group_id": group_id,
            "auto_allocate_sub_ports": True,
            "sub_port_range_start": 400001,
            "sub_port_range_end": 400001,  # 只 1 个号码，需要 2 个
        },
    )
    assert r.status_code == 409
    assert "10698EXH" in r.json()["detail"]


def test_delete_filing_task_keeps_usage(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """删除报备任务后，占用记录仍存在"""
    from sqlmodel import Session, select

    from app.core.db import engine
    from app.models import FilingSubPortUsage

    qual_id = _create_qualification(client, superuser_token_headers, "保留占用企业")
    port_id = _create_port(client, superuser_token_headers, "10698KEEP")

    r = client.post(
        f"{settings.API_V1_STR}/export-groups",
        headers=superuser_token_headers,
        json={
            "name": "保留组",
            "fields": [
                {"field_name": "main_port_number", "field_label": "主端口号", "sort_order": 1},
                {"field_name": "sub_port_number", "field_label": "子端口号", "sort_order": 2},
            ],
        },
    )
    group_id = r.json()["id"]

    r = client.post(
        f"{settings.API_V1_STR}/filing-tasks",
        headers=superuser_token_headers,
        json={
            "qualification_ids": [qual_id],
            "port_ids": [port_id],
            "export_group_id": group_id,
            "auto_allocate_sub_ports": True,
            "sub_port_range_start": 500001,
            "sub_port_range_end": 500100,
        },
    )
    task_id = r.json()["id"]

    # 删除报备任务
    r = client.delete(
        f"{settings.API_V1_STR}/filing-tasks/{task_id}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200

    # 占用记录仍在，filing_task_id 变 None
    with Session(engine) as session:
        stmt = select(FilingSubPortUsage).where(
            FilingSubPortUsage.main_port_number == "10698KEEP"
        )
        usages = list(session.exec(stmt).all())
        assert len(usages) >= 1
        for u in usages:
            assert u.filing_task_id is None
