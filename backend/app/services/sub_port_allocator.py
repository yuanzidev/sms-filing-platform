"""Sub port allocator — random allocation within range, permanently unique per main port."""
import random
import uuid

from fastapi import HTTPException
from sqlmodel import Session

from app.crud.filing_sub_port_usage import (
    bulk_create_usages,
    get_used_numbers,
)
from app.models import QualificationInfo

MAX_RETRY = 3


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
) -> dict[str, list[tuple[QualificationInfo, str]]]:
    """按资质 × 主端口笛卡尔积分配子端口。

    Returns: {main_port_number: [(qualification, sub_port_number), ...]}
    """
    need_per_main = len(qualifications)
    if need_per_main == 0 or not main_port_numbers:
        return {}

    range_size = range_end - range_start + 1
    if range_size < need_per_main:
        raise SubPortRangeExhausted(
            main_port_numbers[0],
            need_per_main,
            range_size,
            range_start,
            range_end,
        )

    width = len(str(range_end))

    for attempt in range(MAX_RETRY):
        try:
            result: dict[str, list[tuple[QualificationInfo, str]]] = {}
            records: list[dict] = []
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
                for qual, num in zip(qualifications, chosen):
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
