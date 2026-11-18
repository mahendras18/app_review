import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple, Union

logger = logging.getLogger(__name__)

def normalize_to_utc(dt: Union[datetime, str, None]) -> Optional[datetime]:
    """
    Normalizes any datetime or ISO date string into a timezone-aware UTC datetime.
    """
    if dt is None:
        return None

    if isinstance(dt, datetime):
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)

    if isinstance(dt, str):
        cleaned = dt.strip()
        if not cleaned:
            return None
        try:
            # Handle standard ISO formats, including trailing Z
            if cleaned.endswith("Z"):
                cleaned = cleaned[:-1] + "+00:00"
            parsed = datetime.fromisoformat(cleaned)
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            return parsed.astimezone(timezone.utc)
        except Exception as e:
            logger.debug(f"Failed to parse date string '{dt}': {e}")
            return None

    return None

def parse_date_range(date_range: Optional[str]) -> Tuple[Optional[int], Optional[datetime]]:
    """
    Parses a date range string ('7', '15', '30', 'all') into:
    (days, cutoff_utc_datetime)
    
    If 'all', returns (None, None).
    """
    if not date_range:
        days = 7
    else:
        raw = str(date_range).lower().strip().replace("last_", "").replace("_days", "").replace("d", "")
        if raw in ("all", "all_available", "none", ""):
            return None, None
        try:
            days = int(raw)
        except ValueError:
            raise ValueError(f"Invalid date_range '{date_range}'. Must be '7', '15', '30', or 'all'.")

    if days not in (7, 15, 30):
        # Allow any positive integer of days, but standard values are 7, 15, 30
        pass

    now_utc = datetime.now(timezone.utc)
    cutoff = now_utc - timedelta(days=days)
    return days, cutoff

def is_within_cutoff(date_val: Union[datetime, str, None], cutoff: Optional[datetime]) -> bool:
    """
    Checks if date_val is greater than or equal to cutoff in UTC.
    If cutoff is None, returns True for any valid date.
    """
    if cutoff is None:
        return True

    utc_dt = normalize_to_utc(date_val)
    if utc_dt is None:
        return False

    return utc_dt >= cutoff
