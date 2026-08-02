"""Tests for filing_sub_port_usage CRUD."""
import uuid
from typing import Generator

import pytest
from sqlmodel import Session, delete

from app.core.db import engine
from app.core.security import get_password_hash
from app.crud.filing_sub_port_usage import (
    bulk_create_usages,
    count_used_in_range,
    get_used_numbers,
    list_usages_by_task,
)
from app.models import FilingSubPortUsage, FilingTask, User


@pytest.fixture(autouse=True)
def _cleanup_usages() -> Generator[None, None, None]:
    yield
    with Session(engine) as session:
        session.execute(delete(FilingSubPortUsage))
        session.execute(delete(FilingTask))
        session.commit()


def _make_user(session: Session) -> User:
    user = User(
        email=f"usage-test-{uuid.uuid4()}@example.com",
        username=f"usage-test-{uuid.uuid4()}",
        hashed_password=get_password_hash("test-password-not-used"),
        is_active=True,
        is_superuser=False,
    )
    session.add(user)
    session.flush()
    return user


def _make_record(main_port_number, port_number, operator_id, **kwargs):
    return {
        "main_port_number": main_port_number,
        "port_number": port_number,
        "operator_id": operator_id,
        **kwargs,
    }


def test_get_used_numbers_returns_set():
    with Session(engine) as session:
        user = _make_user(session)
        bulk_create_usages(session, [
            _make_record("10698X", "100001", user.id),
            _make_record("10698X", "100002", user.id),
            _make_record("10698Y", "200001", user.id),
        ])
        session.commit()
        used_x = get_used_numbers(session, "10698X")
        assert used_x == {"100001", "100002"}


def test_count_used_in_range():
    with Session(engine) as session:
        user = _make_user(session)
        bulk_create_usages(session, [
            _make_record("10698Z", "100001", user.id),
            _make_record("10698Z", "100005", user.id),
            _make_record("10698Z", "100010", user.id),
        ])
        session.commit()
        # 范围 100000-100005 内有 2 个
        assert count_used_in_range(session, "10698Z", 100000, 100005) == 2


def test_count_used_in_range_six_digit_padding():
    """占用按固定 6 位格式匹配：短数字范围也能命中 6 位补零的占用记录"""
    with Session(engine) as session:
        user = _make_user(session)
        bulk_create_usages(session, [
            _make_record("10698PAD", "000123", user.id),
            _make_record("10698PAD", "000456", user.id),
        ])
        session.commit()
        # 范围 123-456（非 6 位输入）按 6 位补零匹配
        assert count_used_in_range(session, "10698PAD", 123, 456) == 2
        # 范围 100000-200000 不含上述占用
        assert count_used_in_range(session, "10698PAD", 100000, 200000) == 0


def test_list_usages_by_task():
    with Session(engine) as session:
        user = _make_user(session)
        # FilingTask requires export_group FK; create a minimal one
        from app.models import ExportGroup
        group = ExportGroup(name=f"usage-test-{uuid.uuid4()}")
        session.add(group)
        session.flush()
        task = FilingTask(
            task_name=f"BEI-TEST-{uuid.uuid4()}",
            qualification_ids=[],
            port_ids=[],
            export_group_id=group.id,
            qualification_count=0,
            port_count=0,
            operator_id=user.id,
        )
        session.add(task)
        session.flush()

        bulk_create_usages(session, [
            _make_record("10698T", "100001", user.id, filing_task_id=task.id),
            _make_record("10698T", "100002", user.id, filing_task_id=task.id),
        ])
        session.commit()
        usages = list_usages_by_task(session, task.id)
        assert len(usages) == 2
