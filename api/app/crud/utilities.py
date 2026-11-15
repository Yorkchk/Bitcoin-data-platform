import hashlib
from datetime import datetime, timedelta, timezone


def seconds_until_next_refresh(
    now: datetime | None = None,
    refresh_hour: int = 0,
    refresh_minute: int = 45,
    max_seconds: int = 6 * 3600,
    min_seconds: int = 300,
) -> int:
    """Cache lifetime for data that only changes once a day.

    The Databricks job starts at 00:10 UTC and has finished well before 00:45 UTC,
    so cached results expire at the next 00:45 UTC, but never live longer than
    `max_seconds` (in case a run is late) or shorter than `min_seconds`.
    """
    now = now or datetime.now(timezone.utc)
    refresh = now.replace(hour=refresh_hour, minute=refresh_minute, second=0, microsecond=0)
    if refresh <= now:
        refresh += timedelta(days=1)
    return int(max(min_seconds, min(max_seconds, (refresh - now).total_seconds())))



def verify_APIkey_hashedkey(stored_key: str, provided_key: str) -> bool:
        salt_hex, hashed_key = stored_key.split(':')
        salt = bytes.fromhex(salt_hex)
        provided_hashed = hashlib.sha256(salt + provided_key.encode()).hexdigest()
        return provided_hashed == hashed_key