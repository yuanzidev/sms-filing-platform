"""Tests for sub port allocator."""
import uuid
from typing import Generator

import pytest
from fastapi import HTTPException
from sqlmodel import Session, delete

from app.core.db import engine
from app.core.security import get_password_hash
from app.models import (
    FilingSubPortUsage,
    QualificationInfo,
    User,
)
from app.services.sub_port_allocator import (
    MAX_RANGE_SIZE,
    AllocationMode,
    SubPortConflict,
    SubPortRangeExhausted,
    allocate_sub_ports,
)


@pytest.fixture(autouse=True)
def _cleanup() -> Generator[None, None, None]:
    yield
    with Session(engine) as session:
        session.execute(delete(FilingSubPortUsage))
        session.execute(delete(QualificationInfo))
        # 只清理本测试创建的 user（_make_user 的 email 前缀），
        # 避免误删 session 级 superuser 导致其他测试模块登录失败
        session.execute(delete(User).where(User.email.like("alloc-test-%")))
        session.commit()


def _make_qual(name: str) -> QualificationInfo:
    return QualificationInfo(
        enterprise_name=name,
        legal_representative_cert_type=None,
        legal_representative_cert_number=None,
        legal_representative_cert_address=None,
    )


def _make_user(session: Session) -> User:
    user = User(
        email=f"alloc-test-{uuid.uuid4()}@example.com",
        username=f"alloc-test-{uuid.uuid4()}",
        hashed_password=get_password_hash("test-password-not-used"),
        is_active=True,
        is_superuser=False,
    )
    session.add(user)
    session.flush()
    return user


def test_allocate_basic():
    """3 主端口 × 2 资质 → 6 个号码，每主端口下不重复"""
    quals = [_make_qual("企业A"), _make_qual("企业B")]
    with Session(engine) as session:
        for q in quals:
            session.add(q)
        user = _make_user(session)
        session.commit()
        for q in quals:
            session.refresh(q)

        result = allocate_sub_ports(
            session=session,
            main_port_numbers=["10698A", "10698B", "10698C"],
            range_start=100001,
            range_end=199999,
            qualifications=quals,
            operator_id=user.id,
            filing_task_id=None,
        )
        assert len(result) == 3
        for mpn, pairs in result.items():
            assert len(pairs) == 2
            numbers = [num for _, num in pairs]
            assert len(numbers) == len(set(numbers)), f"{mpn} 下分配重复"


def test_allocate_excludes_history():
    """已占用的号码不再分配"""
    quals = [_make_qual("企业A")]
    with Session(engine) as session:
        session.add(quals[0])
        user = _make_user(session)
        session.commit()
        session.refresh(quals[0])

        # 预占用 (10698X, 某号码)
        first = allocate_sub_ports(
            session=session,
            main_port_numbers=["10698X"],
            range_start=100001,
            range_end=100002,
            qualifications=quals,
            operator_id=user.id,
            filing_task_id=None,
        )
        first_number = first["10698X"][0][1]

        # 再分配一个，应该不是 first_number（只剩另一个）
        result = allocate_sub_ports(
            session=session,
            main_port_numbers=["10698X"],
            range_start=100001,
            range_end=100002,
            qualifications=quals,
            operator_id=user.id,
            filing_task_id=None,
        )
        second_number = result["10698X"][0][1]
        assert second_number != first_number, (
            f"已占用号码 {first_number} 又被分配: {second_number}"
        )
        assert second_number in {"100001", "100002"}


def test_allocate_range_exhausted():
    """范围耗尽抛 409"""
    quals = [_make_qual("企业A"), _make_qual("企业B"), _make_qual("企业C")]
    with Session(engine) as session:
        for q in quals:
            session.add(q)
        user = _make_user(session)
        session.commit()
        for q in quals:
            session.refresh(q)

        with pytest.raises(SubPortRangeExhausted) as exc_info:
            allocate_sub_ports(
                session=session,
                main_port_numbers=["10698Y"],
                range_start=100001,
                range_end=100002,  # 只 2 个，需要 3 个
                qualifications=quals,
                operator_id=user.id,
                filing_task_id=None,
            )
        assert exc_info.value.status_code == 409
        assert "10698Y" in exc_info.value.detail


def test_allocate_range_too_large():
    """范围超过 100 万 → 400，不进入分配"""
    quals = [_make_qual("企业A")]
    with Session(engine) as session:
        session.add(quals[0])
        session.commit()
        session.refresh(quals[0])

        with pytest.raises(HTTPException) as exc:
            allocate_sub_ports(
                session=session,
                main_port_numbers=["10698BIG"],
                range_start=1,
                range_end=MAX_RANGE_SIZE + 1,
                qualifications=quals,
                operator_id=uuid.uuid4(),
                filing_task_id=uuid.uuid4(),
            )
        assert exc.value.status_code == 400
        assert "范围过大" in exc.value.detail


def test_allocate_six_digit_padding():
    """短数字范围（如 1-2）也输出固定 6 位补零格式，避免跨宽度重复"""
    quals = [_make_qual("企业A")]
    with Session(engine) as session:
        session.add(quals[0])
        user = _make_user(session)
        session.commit()
        session.refresh(quals[0])

        result = allocate_sub_ports(
            session=session,
            main_port_numbers=["10698PAD"],
            range_start=1,
            range_end=2,
            qualifications=quals,
            operator_id=user.id,
            filing_task_id=None,
        )
        num = result["10698PAD"][0][1]
        assert num in {"000001", "000002"}


def test_allocate_sequential():
    """顺序模式从 range_start 依次分配"""
    quals = [_make_qual("企业A"), _make_qual("企业B")]
    with Session(engine) as session:
        for q in quals:
            session.add(q)
        user = _make_user(session)
        session.commit()
        for q in quals:
            session.refresh(q)

        result = allocate_sub_ports(
            session=session,
            main_port_numbers=["10698SEQ"],
            range_start=100001,
            range_end=199999,
            qualifications=quals,
            operator_id=user.id,
            filing_task_id=None,
            mode=AllocationMode.sequential,
        )
        numbers = [num for _, num in result["10698SEQ"]]
        assert numbers == ["100001", "100002"]


def test_allocate_sequential_skips_used():
    """顺序模式跳过已占用号码，从下一个空闲号继续"""
    quals = [_make_qual("企业A")]
    with Session(engine) as session:
        session.add(quals[0])
        user = _make_user(session)
        session.commit()
        session.refresh(quals[0])

        first = allocate_sub_ports(
            session=session,
            main_port_numbers=["10698SEQ2"],
            range_start=100001,
            range_end=199999,
            qualifications=quals,
            operator_id=user.id,
            filing_task_id=None,
            mode=AllocationMode.sequential,
        )
        assert first["10698SEQ2"][0][1] == "100001"

        second = allocate_sub_ports(
            session=session,
            main_port_numbers=["10698SEQ2"],
            range_start=100001,
            range_end=199999,
            qualifications=quals,
            operator_id=user.id,
            filing_task_id=None,
            mode=AllocationMode.sequential,
        )
        assert second["10698SEQ2"][0][1] == "100002"


def test_allocate_fixed_suffix():
    """固定后缀模式按 prefix + suffix 格式生成，prefix 从 0 递增"""
    quals = [_make_qual("企业A"), _make_qual("企业B")]
    with Session(engine) as session:
        for q in quals:
            session.add(q)
        user = _make_user(session)
        session.commit()
        for q in quals:
            session.refresh(q)

        result = allocate_sub_ports(
            session=session,
            main_port_numbers=["10698SFX"],
            range_start=100001,
            range_end=199999,
            qualifications=quals,
            operator_id=user.id,
            filing_task_id=None,
            mode=AllocationMode.fixed_suffix,
            fixed_suffix="95598",
        )
        numbers = [num for _, num in result["10698SFX"]]
        assert numbers == ["095598", "195598"]


def test_allocate_fixed_suffix_requires_suffix():
    """固定后缀模式缺少 fixed_suffix → 400"""
    quals = [_make_qual("企业A")]
    with Session(engine) as session:
        session.add(quals[0])
        user = _make_user(session)
        session.commit()
        session.refresh(quals[0])

        with pytest.raises(HTTPException) as exc_info:
            allocate_sub_ports(
                session=session,
                main_port_numbers=["10698SFX2"],
                range_start=100001,
                range_end=199999,
                qualifications=quals,
                operator_id=user.id,
                filing_task_id=None,
                mode=AllocationMode.fixed_suffix,
            )
        assert exc_info.value.status_code == 400
        assert "fixed_suffix" in exc_info.value.detail


def test_allocate_concurrent_safety():
    """并发分配：5 线程同一主端口，结果不重复"""
    import threading

    quals = [_make_qual("并发企业")]
    with Session(engine) as setup_session:
        setup_session.add(quals[0])
        user = _make_user(setup_session)
        setup_session.commit()
        setup_session.refresh(quals[0])
        qual_id = quals[0].id
        user_id = user.id


    results: list[str] = []
    lock = threading.Lock()

    def worker():
        with Session(engine) as session:
            qual = session.get(QualificationInfo, qual_id)
            try:
                result = allocate_sub_ports(
                    session=session,
                    main_port_numbers=["10698CON"],
                    range_start=200001,
                    range_end=200100,
                    qualifications=[qual],
                    operator_id=user_id,
                    filing_task_id=None,
                )
                with lock:
                    results.append(result["10698CON"][0][1])
            except SubPortConflict:
                pass  # 重试耗尽视为可接受

    threads = [threading.Thread(target=worker) for _ in range(5)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    # 5 个线程并发，results 收集成功分配的号码
    assert len(results) == len(set(results)), f"并发分配重复: {results}"
