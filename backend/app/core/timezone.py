"""
Timezone helpers for log rendering and UI-facing timestamps.
"""
from __future__ import annotations

import logging
import os
import re
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo


def utcnow() -> datetime:
    """返回时区感知的 UTC 当前时间"""
    return datetime.now(timezone.utc)

from app.core.config import settings

logger = logging.getLogger(__name__)

_DEFAULT_TIMEZONE = "Asia/Shanghai"
_FALLBACK_OFFSETS = {
    "Asia/Shanghai": 8,
    "Asia/Chongqing": 8,
    "Asia/Chungking": 8,
    "Asia/Harbin": 8,
    "Asia/Hong_Kong": 8,
    "Asia/Macau": 8,
    "Asia/Taipei": 8,
    "Asia/Tokyo": 9,
    "UTC": 0,
    "Etc/UTC": 0,
}


def _fallback_timezone(tz_name: str):
    normalized = tz_name.strip()
    if normalized in _FALLBACK_OFFSETS:
        return timezone(timedelta(hours=_FALLBACK_OFFSETS[normalized]))

    match = re.match(r"^(?:UTC|GMT)([+-])(\d{1,2})(?::?(\d{2}))?$", normalized)
    if match:
        sign, hours, minutes = match.groups()
        offset_hours = int(hours)
        offset_minutes = int(minutes) if minutes else 0
        total_minutes = offset_hours * 60 + offset_minutes
        if sign == "-":
            total_minutes = -total_minutes
        return timezone(timedelta(minutes=total_minutes))

    return timezone.utc


def _get_timezone_name() -> str:
    tz_name = os.getenv("LOG_TIMEZONE")
    if tz_name:
        return tz_name
    tz_name = getattr(settings, "TIMEZONE", None)
    if tz_name:
        return tz_name
    tz_name = os.getenv("TZ")
    if tz_name:
        return tz_name
    return _DEFAULT_TIMEZONE


def get_timezone():
    tz_name = _get_timezone_name()
    try:
        return ZoneInfo(tz_name)
    except Exception:
        fallback = _fallback_timezone(tz_name)
        logger.warning("Invalid timezone '%s', falling back to %s", tz_name, fallback)
        return fallback


def now_in_timezone() -> datetime:
    return datetime.now(get_timezone())


def build_log_formatter(fmt: str, datefmt: str) -> logging.Formatter:
    formatter = logging.Formatter(fmt=fmt, datefmt=datefmt)
    tz = get_timezone()
    formatter.converter = lambda ts, tz=tz: datetime.fromtimestamp(ts, tz=tz).timetuple()
    return formatter
