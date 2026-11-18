import io
import json
import os
import shutil
import urllib.parse
from datetime import datetime, timezone, timedelta
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.schemas.responses import ReviewItem
from backend.services.temp_report_service import (
    DATA_DIR,
    DEFAULT_DATA_DIR,
    get_report_storage_dir,
    save_temp_report,
    get_report_file,
    cleanup_expired_reports,
    list_active_reports,
)
from backend.services.excel_export import generate_platform_reviews_excel

client = TestClient(app)

MOCK_REVIEWS = [
    ReviewItem(
        id="gp_101",
        platform="google",
        rating=5.0,
        title="Bass is punchy",
        text="Loved the audio profile and ANC on my boAt earbuds.",
        date="2026-11-16T10:00:00Z",
        version="2.4.1",
        reviewer_name="Karan Verma"
    ),
    ReviewItem(
        id="ap_201",
        platform="apple",
        rating=4.0,
        title="Nice app update",
        text="Connects quickly on iOS.",
        date="2026-11-15T09:00:00Z",
        version="1.8.0",
        reviewer_name="Neha Joshi"
    ),
]

@pytest.fixture(autouse=True)
def cleanup_temp_dir():
    data_dir = get_report_storage_dir()
    if os.path.exists(data_dir):
        try:
            shutil.rmtree(data_dir, ignore_errors=True)
        except Exception:
            pass
    yield
    data_dir = get_report_storage_dir()
    if os.path.exists(data_dir):
        try:
            shutil.rmtree(data_dir, ignore_errors=True)
        except Exception:
            pass

def test_configurable_report_storage_dir(tmp_path):
    """Verify REPORT_STORAGE_DIR env var changes the report storage path and creates it automatically."""
    custom_storage = str(tmp_path / "var" / "data" / "reports")
    with patch.dict(os.environ, {"REPORT_STORAGE_DIR": custom_storage}):
        assert get_report_storage_dir() == custom_storage

        # Directory does not exist initially
        assert not os.path.exists(custom_storage)

        stream = io.BytesIO(b"custom_storage_excel_content")
        meta = save_temp_report(
            excel_stream=stream,
            filename="boAt_custom_storage.xlsx",
            app_name="boAt Hearables",
            platform="both",
            date_range="7",
            total_count=10,
            android_count=5,
            ios_count=5,
            base_url="https://sentiment-analyser.onrender.com"
        )

        # Directory must be automatically created
        assert os.path.exists(custom_storage)
        assert meta["storage_dir"] == custom_storage
        assert meta["file_path"].startswith(custom_storage)
        assert os.path.isfile(meta["file_path"])

        # Retrieval works from custom storage
        result = get_report_file(meta["token"], "boAt_custom_storage.xlsx")
        assert result is not None
        assert result[0] == meta["file_path"]

def test_default_report_storage_dir_when_unset():
    """Verify that omitting REPORT_STORAGE_DIR falls back to default local directory."""
    with patch.dict(os.environ, {}, clear=True):
        if "REPORT_STORAGE_DIR" in os.environ:
            del os.environ["REPORT_STORAGE_DIR"]
        assert get_report_storage_dir() == DEFAULT_DATA_DIR

def test_save_temp_report_creates_file_and_metadata():
    """Verify temporary report creation, unpredictable token, and viewer URL encoding."""
    stream = generate_platform_reviews_excel(
        ios_reviews=[MOCK_REVIEWS[1]],
        android_reviews=[MOCK_REVIEWS[0]],
        app_name="boAt Hearables",
        platform="both"
    )
    meta = save_temp_report(
        excel_stream=stream,
        filename="boAt_Hearables_Both_Last7Days_test.xlsx",
        app_name="boAt Hearables",
        platform="both",
        date_range="7",
        total_count=2,
        android_count=1,
        ios_count=1,
        base_url="https://api.sentiment-analyser.example.com"
    )

    token = meta["token"]
    assert len(token) >= 32
    assert meta["filename"] == "boAt_Hearables_Both_Last7Days_test.xlsx"
    assert meta["total_count"] == 2
    assert meta["is_public"] is True

    # Check that file exists on disk
    data_dir = get_report_storage_dir()
    file_path = os.path.join(data_dir, token, "boAt_Hearables_Both_Last7Days_test.xlsx")
    assert os.path.isfile(file_path)

    # Check Microsoft Office Online Viewer URL formatting
    expected_file_url = f"https://api.sentiment-analyser.example.com/api/reports/view/{token}/boAt_Hearables_Both_Last7Days_test.xlsx"
    assert meta["file_url"] == expected_file_url

    encoded_src = urllib.parse.quote(expected_file_url, safe="")
    assert meta["viewer_url"] == f"https://view.officeapps.live.com/op/view.aspx?src={encoded_src}"

def test_get_report_file_success_and_invalid():
    """Verify file retrieval by token and rejection of path traversal."""
    stream = io.BytesIO(b"PK\x03\x04fake_excel_content")
    meta = save_temp_report(
        excel_stream=stream,
        filename="test_report.xlsx",
        app_name="boAt Hearables",
        platform="android",
        date_range="7",
        total_count=1,
        android_count=1,
        ios_count=0,
        base_url="http://localhost:8000"
    )

    token = meta["token"]

    # Valid token
    result = get_report_file(token, "test_report.xlsx")
    assert result is not None
    path, fname = result
    assert fname == "test_report.xlsx"
    assert os.path.isfile(path)

    # Invalid token
    assert get_report_file("nonexistent_token_12345", "test_report.xlsx") is None

    # Path traversal token
    assert get_report_file("../../../etc/passwd", "test_report.xlsx") is None

def test_cleanup_preserves_valid_reports_and_purges_expired():
    """Verify that expired reports are purged while valid reports are preserved intact."""
    stream1 = io.BytesIO(b"valid_report_content")
    valid_meta = save_temp_report(
        excel_stream=stream1,
        filename="valid_report.xlsx",
        app_name="boAt Hearables",
        platform="both",
        date_range="7",
        total_count=5,
        android_count=3,
        ios_count=2,
        base_url="http://localhost:8000"
    )

    stream2 = io.BytesIO(b"expired_report_content")
    expired_meta = save_temp_report(
        excel_stream=stream2,
        filename="expired_report.xlsx",
        app_name="boAt Hearables",
        platform="both",
        date_range="7",
        total_count=5,
        android_count=3,
        ios_count=2,
        base_url="http://localhost:8000"
    )

    data_dir = get_report_storage_dir()
    expired_token = expired_meta["token"]
    expired_dir = os.path.join(data_dir, expired_token)
    expired_metadata_path = os.path.join(expired_dir, "metadata.json")

    # Manually backdate the expiration on expired_meta to 2 hours ago
    with open(expired_metadata_path, "r", encoding="utf-8") as f:
        meta_data = json.load(f)
    meta_data["expires_at"] = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
    with open(expired_metadata_path, "w", encoding="utf-8") as f:
        json.dump(meta_data, f)

    # Run cleanup
    purged = cleanup_expired_reports()
    assert purged >= 1

    # Valid report must still exist and be readable
    valid_result = get_report_file(valid_meta["token"], "valid_report.xlsx")
    assert valid_result is not None
    assert os.path.isfile(valid_result[0])

    # Expired report must be gone
    assert not os.path.exists(expired_dir)
    assert get_report_file(expired_token, "expired_report.xlsx") is None

def test_public_view_report_endpoint():
    """Verify the public report-viewing endpoint used by Microsoft Office Online Viewer."""
    stream = generate_platform_reviews_excel(
        ios_reviews=[MOCK_REVIEWS[1]],
        android_reviews=[MOCK_REVIEWS[0]],
        app_name="boAt Hearables",
        platform="both"
    )
    meta = save_temp_report(
        excel_stream=stream,
        filename="boAt_Hearables_Both_2026.xlsx",
        app_name="boAt Hearables",
        platform="both",
        date_range="7",
        total_count=2,
        android_count=1,
        ios_count=1,
        base_url="http://testserver"
    )

    token = meta["token"]
    url = f"/api/reports/view/{token}/boAt_Hearables_Both_2026.xlsx"
    response = client.get(url)

    assert response.status_code == 200
    assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in response.headers["Content-Type"]
    assert 'inline; filename="boAt_Hearables_Both_2026.xlsx"' in response.headers["Content-Disposition"]
    assert "public" in response.headers["Cache-Control"]

def test_public_view_report_404_expired():
    """Verify 404 response when a report does not exist or has expired."""
    response = client.get("/api/reports/view/missing_token_9999/test.xlsx")
    assert response.status_code == 404
    assert "expired" in response.json()["detail"].lower()

@patch("backend.services.dashboard.fetch_google_play_reviews_by_date")
@patch("backend.services.dashboard.fetch_apple_reviews_by_date")
def test_create_report_endpoint(mock_apple, mock_google):
    """Verify POST /api/reports/generate creates a report without any Microsoft credentials or OAuth."""
    mock_google.return_value = ([MOCK_REVIEWS[0]], None)
    mock_apple.return_value = ([MOCK_REVIEWS[1]], None)

    payload = {
        "platform": "both",
        "date_range": "7",
        "country": "in",
        "google_id": "com.boAt.hearables",
        "apple_id": "1592550875",
        "app_name": "boAt Hearables"
    }

    response = client.post("/api/reports/generate", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["platform"] == "both"
    assert data["total_count"] == 2
    assert data["android_count"] == 1
    assert data["ios_count"] == 1
    assert "boAt_Hearables" in data["filename"]
    assert data["viewer_url"].startswith("https://view.officeapps.live.com/op/view.aspx?src=")
    assert data["file_url"] in urllib.parse.unquote(data["viewer_url"])

    # Verify report is accessible via the generated file_url
    token = data["id"]
    filename = data["filename"]
    view_resp = client.get(f"/api/reports/view/{token}/{filename}")
    assert view_resp.status_code == 200

@patch("backend.services.dashboard.fetch_google_play_reviews_by_date")
@patch("backend.services.dashboard.fetch_apple_reviews_by_date")
def test_create_report_with_custom_public_base_url(mock_apple, mock_google):
    """Verify PUBLIC_BASE_URL env var is used for Microsoft's viewer URL when provided."""
    mock_google.return_value = ([MOCK_REVIEWS[0]], None)
    mock_apple.return_value = ([], None)

    with patch.dict(os.environ, {"PUBLIC_BASE_URL": "https://reviews.myboatdomain.com"}):
        payload = {
            "platform": "android",
            "date_range": "15",
            "country": "in",
            "google_id": "com.boAt.hearables",
            "app_name": "boAt Hearables"
        }
        response = client.post("/api/reports/generate", json=payload)
        assert response.status_code == 200

        data = response.json()
        assert data["file_url"].startswith("https://reviews.myboatdomain.com/api/reports/view/")
        assert data["is_public"] is True
        assert data["is_localhost"] is False
        assert "https%3A%2F%2Freviews.myboatdomain.com" in data["viewer_url"]

def test_list_reports_endpoint():
    """Verify GET /api/reports returns active reports."""
    stream = io.BytesIO(b"fake_content")
    save_temp_report(
        excel_stream=stream,
        filename="active_report.xlsx",
        app_name="boAt Hearables",
        platform="ios",
        date_range="30",
        total_count=5,
        android_count=0,
        ios_count=5,
        base_url="http://localhost:8000"
    )

    response = client.get("/api/reports")
    assert response.status_code == 200
    reports = response.json()
    assert len(reports) >= 1
    assert any(r["filename"] == "active_report.xlsx" for r in reports)
