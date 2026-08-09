"""Sub port allocator — multi-mode allocation, permanently unique per main port."""
import random
import uuid
from enum import Enum
from typing import Any

from fastapi import HTTPException
from sqlmodel import Session

from app.crud.filing_sub_port_usage import (
    bulk_create_usages,
    get_used_numbers,
)
from app.models import QualificationInfo

MAX_RETRY = 3

# 范围大小上限：随机模式需在内存中构造号码集合，超过即拒绝，防止 OOM。
# 顺序/固定后缀模式逐号递增分配，不受此限制。
MAX_RANGE_SIZE = 1_000_000


class AllocationMode(str, Enum):
    random = "random"
    sequential = "sequential"
    fixed_suffix = "fixed_suffix"


class SubPortRangeExhausted(HTTPException):
    def __init__(
        self,
        main_port_number: str,
        need: int,
        available: int,
        range_start: int,
        range_end: int,
    ):
        super().__init__(
            status_code=409,
            detail=(
                f"主端口 {main_port_number} 在范围 {range_start}-{range_end} 内"
                f"可用子端口号不足（需要 {need} 个，剩余 {available} 个），"
                f"请扩大范围或更换主端口"
            ),
        )


class SubPortConflict(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=409,
            detail="子端口分配冲突，请重试",
        )


def allocate_sub_ports(
    session: Session,
    main_port_numbers: list[str],
    range_start: int,
    range_end: int,
    qualifications: list[QualificationInfo],
    operator_id: uuid.UUID,
    filing_task_id: uuid.UUID,
    mode: AllocationMode = AllocationMode.random,
    fixed_suffix: str | None = None,
    width: int = 6,
) -> dict[str, list[tuple[QualificationInfo, str]]]:
    """按资质 × 主端口笛卡尔积分配子端口。

    mode: random 范围内随机 / sequential 从 range_start 顺序递增 /
          fixed_suffix 按 prefix + fixed_suffix 格式生成。

    Returns: {main_port_number: [(qualification, sub_port_number), ...]}
    """
    need_per_main = len(qualifications)
    if need_per_main == 0 or not main_port_numbers:
        return {}

    if mode == AllocationMode.random:
        return _allocate_random(session, main_port_numbers, range_start, range_end, qualifications, operator_id, filing_task_id, width)
    elif mode == AllocationMode.sequential:
        return _allocate_sequential(session, main_port_numbers, range_start, qualifications, operator_id, filing_task_id, width)
    elif mode == AllocationMode.fixed_suffix:
        return _allocate_fixed_suffix(session, main_port_numbers, fixed_suffix, qualifications, operator_id, filing_task_id, width)
    else:
        raise HTTPException(status_code=400, detail=f"不支持的分配模式: {mode}")


def _allocate_random(
    session: Session,
    main_port_numbers: list[str],
    range_start: int,
    range_end: int,
    qualifications: list[QualificationInfo],
    operator_id: uuid.UUID,
    filing_task_id: uuid.UUID,
    width: int,
) -> dict[str, list[tuple[QualificationInfo, str]]]:
    """范围内随机分配（默认模式）。"""
    need_per_main = len(qualifications)
    range_size = range_end - range_start + 1
    if range_size > MAX_RANGE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="子端口范围过大（最多 100 万个号码）",
        )
    if range_size < need_per_main:
        raise SubPortRangeExhausted(
            main_port_numbers[0],
            need_per_main,
            range_size,
            range_start,
            range_end,
        )

    for attempt in range(MAX_RETRY):
        try:
            result: dict[str, list[tuple[QualificationInfo, str]]] = {}
            records: list[dict[str, Any]] = []
            for mpn in main_port_numbers:
                used = get_used_numbers(session, mpn)
                all_in_range = {
                    str(n).zfill(width)
                    for n in range(range_start, range_end + 1)
                }
                available = list(all_in_range - used)
                if len(available) < need_per_main:
                    raise SubPortRangeExhausted(
                        mpn,
                        need_per_main,
                        len(available),
                        range_start,
                        range_end,
                    )
                chosen = random.sample(available, need_per_main)
                result[mpn] = []
                for qual, num in zip(qualifications, chosen, strict=False):
                    result[mpn].append((qual, num))
                    records.append(
                        {
                            "main_port_number": mpn,
                            "port_number": num,
                            "filing_task_id": filing_task_id,
                            "qualification_id": qual.id,
                            "operator_id": operator_id,
                        }
                    )
            bulk_create_usages(session, records)
            session.commit()
            return result
        except SubPortRangeExhausted:
            raise
        except Exception:
            session.rollback()
            if attempt == MAX_RETRY - 1:
                raise SubPortConflict()
            continue
    raise SubPortConflict()


def _allocate_sequential(
    session: Session,
    main_port_numbers: list[str],
    range_start: int,
    qualifications: list[QualificationInfo],
    operator_id: uuid.UUID,
    filing_task_id: uuid.UUID,
    width: int,
) -> dict[str, list[tuple[QualificationInfo, str]]]:
    """从 range_start 顺序递增分配，跳过已占用号码。"""
    need_per_main = len(qualifications)
    result: dict[str, list[tuple[QualificationInfo, str]]] = {}
    records: list[dict[str, Any]] = []
    for mpn in main_port_numbers:
        used = get_used_numbers(session, mpn)
        nums: list[str] = []
        current = range_start
        while len(nums) < need_per_main:
            candidate = str(current).zfill(width)
            if candidate not in used:
                nums.append(candidate)
                used.add(candidate)
            current += 1
        result[mpn] = []
        for qual, num in zip(qualifications, nums, strict=False):
            result[mpn].append((qual, num))
            records.append({
                "main_port_number": mpn, "port_number": num,
                "filing_task_id": filing_task_id, "qualification_id": qual.id,
                "operator_id": operator_id,
            })
    bulk_create_usages(session, records)
    session.commit()
    return result


def _allocate_fixed_suffix(
    session: Session,
    main_port_numbers: list[str],
    fixed_suffix: str | None,
    qualifications: list[QualificationInfo],
    operator_id: uuid.UUID,
    filing_task_id: uuid.UUID,
    width: int,
) -> dict[str, list[tuple[QualificationInfo, str]]]:
    """固定后缀模式：号码为 prefix + fixed_suffix，prefix 从 0 起顺序递增。"""
    if not fixed_suffix:
        raise HTTPException(status_code=400, detail="固定后缀模式必须提供 fixed_suffix")
    need_per_main = len(qualifications)
    result: dict[str, list[tuple[QualificationInfo, str]]] = {}
    records: list[dict[str, Any]] = []
    for mpn in main_port_numbers:
        used = get_used_numbers(session, mpn)
        nums: list[str] = []
        prefix = 0
        while len(nums) < need_per_main:
            candidate = f"{prefix}{fixed_suffix}".zfill(width) if len(f"{prefix}{fixed_suffix}") <= width else f"{prefix}{fixed_suffix}"
            if candidate not in used:
                nums.append(candidate)
                used.add(candidate)
            prefix += 1
            if prefix > 999999:
                raise SubPortRangeExhausted(mpn, need_per_main, len(nums), 0, prefix)
        result[mpn] = []
        for qual, num in zip(qualifications, nums, strict=False):
            result[mpn].append((qual, num))
            records.append({
                "main_port_number": mpn, "port_number": num,
                "filing_task_id": filing_task_id, "qualification_id": qual.id,
                "operator_id": operator_id,
            })
    bulk_create_usages(session, records)
    session.commit()
    return result
