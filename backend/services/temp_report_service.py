import os
import json
import time
import shutil
import urllib.parse
import logging
import secrets
import io
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List, Tuple

logger = logging.getLogger(__name__)

# Base directory for temporary Excel report storage
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_DATA_DIR = os.path.join(BASE_DIR, "data", "temp_reports")

def get_report_storage_dir() -> str:
    """
    Returns the root directory where temporary Excel reports are stored:
    - If REPORT_STORAGE_DIR is set in the environment, uses that directory
      (e.g., /var/data/reports on Render).
    - Otherwise, falls back to backend/data/temp_reports for local development.
    """
    configured = os.getenv("REPORT_STORAGE_DIR", "").strip()
    if configured:
        return configured
    return DEFAULT_DATA_DIR

# Backward compatibility alias
DATA_DIR = get_report_storage_dir()

# Default expiration retention (24 hours = 86400 seconds)
DEFAULT_RETENTION_HOURS = int(os.getenv("REPORT_RETENTION_HOURS", "24"))

def _ensure_data_dir() -> str:
    """
    Ensures the target report storage directory exists on disk,
    creating it (including parent directories) automatically if needed.
    """
    data_dir = get_report_storage_dir()
    if not os.path.exists(data_dir):
        os.makedirs(data_dir, exist_ok=True)
    return data_dir

def cleanup_expired_reports() -> int:
    """
    Scans the temporary reports folder and permanently deletes any reports
    that have passed their expiration timestamp (or 24 hours), without
    deleting valid reports.
    Returns the count of purged reports.
    """
    data_dir = _ensure_data_dir()
    now_utc = datetime.now(timezone.utc)
    purged_count = 0

    try:
        for entry in os.listdir(data_dir):
            entry_path = os.path.join(data_dir, entry)
            if not os.path.isdir(entry_path):
                continue

            metadata_path = os.path.join(entry_path, "metadata.json")
            should_delete = False

            if os.path.exists(metadata_path):
                try:
                    with open(metadata_path, "r", encoding="utf-8") as f:
                        meta = json.load(f)
                    expires_at_str = meta.get("expires_at")
                    if expires_at_str:
                        expires_at = datetime.fromisoformat(expires_at_str)
                        if now_utc >= expires_at:
                            should_delete = True
                except Exception as e:
                    logger.warning(f"[TempReport] Failed to read metadata in {entry}: {e}")
                    should_delete = True
            else:
                # Fallback: check folder modification time
                mtime = os.path.getmtime(entry_path)
                age_hours = (time.time() - mtime) / 3600.0
                if age_hours >= DEFAULT_RETENTION_HOURS:
                    should_delete = True

            if should_delete:
                try:
                    shutil.rmtree(entry_path, ignore_errors=True)
                    purged_count += 1
                    logger.info(f"[TempReport] Purged expired report: {entry}")
                except Exception as e:
                    logger.error(f"[TempReport] Failed to purge {entry_path}: {e}")

    except Exception as e:
        logger.error(f"[TempReport] Error during cleanup scan: {e}")

    return purged_count

def save_temp_report(
    excel_stream: io.BytesIO,
    filename: str,
    app_name: str,
    platform: str,
    date_range: str,
    total_count: int,
    android_count: int,
    ios_count: int,
    base_url: str = "http://localhost:8000"
) -> Dict[str, Any]:
    """
    Saves a genuine Excel report to unpredictable temporary storage on the server,
    assigns an unguessable URL token, and calculates the Microsoft Office Online Viewer URL.
    """
    data_dir = _ensure_data_dir()
    cleanup_expired_reports()

    # Generate a cryptographically random, unguessable token
    token = secrets.token_urlsafe(32)
    report_dir = os.path.join(data_dir, token)
    os.makedirs(report_dir, exist_ok=True)

    # Sanitize and write workbook to disk
    safe_filename = os.path.basename(filename)
    file_path = os.path.join(report_dir, safe_filename)

    excel_stream.seek(0)
    with open(file_path, "wb") as f:
        f.write(excel_stream.read())

    now_utc = datetime.now(timezone.utc)
    expires_utc = now_utc + timedelta(hours=DEFAULT_RETENTION_HOURS)

    # Determine public URL
    configured_public_base = os.getenv("PUBLIC_BASE_URL", "").strip().rstrip("/")
    effective_base = configured_public_base if configured_public_base else base_url.rstrip("/")

    file_url = f"{effective_base}/api/reports/view/{token}/{safe_filename}"

    # URL-encode the file URL for Microsoft's Office Online Viewer
    # https://view.officeapps.live.com/op/view.aspx?src=ENCODED_PUBLIC_FILE_URL
    encoded_file_url = urllib.parse.quote(file_url, safe="")
    viewer_url = f"https://view.officeapps.live.com/op/view.aspx?src={encoded_file_url}"

    is_localhost = bool(
        "localhost" in file_url
        or "127.0.0.1" in file_url
        or not file_url.startswith("https://")
    )

    plat_display = (
        "Both iOS & Android"
        if platform == "both"
        else ("Android" if platform == "android" else "iOS")
    )
    range_display = (
        "Last 7 Days"
        if date_range in ("7", "7d")
        else (
            "Last 15 Days"
            if date_range in ("15", "15d")
            else ("Last 30 Days" if date_range in ("30", "30d") else "All Reviews")
        )
    )
    friendly_name = f"{app_name} - {plat_display} ({range_display})"

    metadata = {
        "id": token,
        "token": token,
        "filename": safe_filename,
        "name": friendly_name,
        "platform": platform,
        "date_range": date_range,
        "app_name": app_name,
        "total_count": total_count,
        "android_count": android_count,
        "ios_count": ios_count,
        "created_at": now_utc.isoformat(),
        "generated_at": now_utc.isoformat(),
        "expires_at": expires_utc.isoformat(),
        "retention_hours": DEFAULT_RETENTION_HOURS,
        "file_url": file_url,
        "viewer_url": viewer_url,
        "web_url": viewer_url,
        "is_public": not is_localhost,
        "is_localhost": is_localhost,
        "file_path": file_path,
        "storage_dir": data_dir,
    }

    metadata_path = os.path.join(report_dir, "metadata.json")
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    logger.info(
        f"[TempReport] Created temporary Excel report in {report_dir}: {safe_filename} (token: {token[:8]}..., expires: {expires_utc.isoformat()})"
    )
    return metadata

def get_report_file(token: str, filename: str) -> Optional[Tuple[str, str]]:
    """
    Retrieves the local path and filename for a temporary report token if valid and unexpired.
    Returns None if the report is not found or has expired.
    """
    data_dir = _ensure_data_dir()

    # Reject path traversal attempts
    if not token or not token.replace("-", "").replace("_", "").isalnum():
        return None

    safe_filename = os.path.basename(filename)
    report_dir = os.path.join(data_dir, token)
    file_path = os.path.join(report_dir, safe_filename)
    metadata_path = os.path.join(report_dir, "metadata.json")

    if not os.path.isfile(file_path):
        return None

    # Check expiration
    if os.path.exists(metadata_path):
        try:
            with open(metadata_path, "r", encoding="utf-8") as f:
                meta = json.load(f)
            expires_at_str = meta.get("expires_at")
            if expires_at_str:
                expires_at = datetime.fromisoformat(expires_at_str)
                if datetime.now(timezone.utc) >= expires_at:
                    logger.info(f"[TempReport] Report {token} has expired; deleting.")
                    shutil.rmtree(report_dir, ignore_errors=True)
                    return None
        except Exception as e:
            logger.warning(f"[TempReport] Failed to parse metadata for {token}: {e}")

    return (file_path, safe_filename)

def list_active_reports(base_url: str = "http://localhost:8000") -> List[Dict[str, Any]]:
    """
    Lists all active, unexpired temporary reports.
    """
    data_dir = _ensure_data_dir()
    cleanup_expired_reports()
    active_reports = []

    try:
        for entry in os.listdir(data_dir):
            entry_path = os.path.join(data_dir, entry)
            if not os.path.isdir(entry_path):
                continue
            metadata_path = os.path.join(entry_path, "metadata.json")
            if os.path.isfile(metadata_path):
                try:
                    with open(metadata_path, "r", encoding="utf-8") as f:
                        meta = json.load(f)
                    active_reports.append(meta)
                except Exception:
                    pass
    except Exception as e:
        logger.error(f"[TempReport] Error listing active reports: {e}")

    # Sort newest first
    active_reports.sort(key=lambda x: x.get("generated_at", ""), reverse=True)
    return active_reports
