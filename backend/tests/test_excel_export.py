import io
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient
import openpyxl

from backend.main import app
from backend.schemas.responses import ReviewItem
from backend.services.date_utils import (
    normalize_to_utc,
    parse_date_range,
    is_within_cutoff,
)
from backend.services.excel_export import (
    EXCEL_COLUMNS,
    build_excel_filename,
    format_platform_name,
    generate_platform_reviews_excel,
    generate_reviews_excel,
)

client = TestClient(app)

def test_date_utils_normalize_to_utc():
    # Naive datetime
    naive_dt = datetime(2026, 11, 15, 12, 0, 0)
    utc_dt = normalize_to_utc(naive_dt)
    assert utc_dt.tzinfo == timezone.utc
    assert utc_dt.year == 2026 and utc_dt.day == 15

    # ISO string with Z
    iso_z = "2026-11-15T12:00:00Z"
    utc_dt = normalize_to_utc(iso_z)
    assert utc_dt.tzinfo == timezone.utc
    assert utc_dt.hour == 12

    # ISO string with offset
    iso_offset = "2026-11-15T12:00:00-05:00"
    utc_dt = normalize_to_utc(iso_offset)
    assert utc_dt.tzinfo == timezone.utc
    assert utc_dt.hour == 17  # 12 - (-5) = 17 UTC

    # None and invalid
    assert normalize_to_utc(None) is None
    assert normalize_to_utc("invalid-date") is None

def test_parse_date_range():
    days, cutoff = parse_date_range("7")
    assert days == 7
    assert cutoff is not None
    now = datetime.now(timezone.utc)
    diff = now - cutoff
    assert 6.9 < diff.total_seconds() / 86400 < 7.1

    days, cutoff = parse_date_range("15")
    assert days == 15

    days, cutoff = parse_date_range("30")
    assert days == 30

    days, cutoff = parse_date_range("all")
    assert days is None
    assert cutoff is None

    days, cutoff = parse_date_range("all_available")
    assert days is None
    assert cutoff is None

    with pytest.raises(ValueError):
        parse_date_range("invalid_range")

def test_excel_export_both_platforms_worksheets():
    ios_reviews = [
        ReviewItem(
            id="rev-apple-1",
            platform="apple",
            rating=4.0,
            title="Great app",
            text="Works smoothly with my earbuds, highly recommended.",
            date="2026-11-15T14:30:00Z",
            version="2.0.9",
            reviewer_name="Jane Smith"
        )
    ]
    android_reviews = [
        ReviewItem(
            id="rev-gp-1",
            platform="google",
            rating=5.0,
            title=None,
            text="Excellent sound quality and battery life!",
            date="2026-11-16T10:00:00Z",
            version="2.1.0",
            reviewer_name="John Doe"
        )
    ]

    excel_io = generate_platform_reviews_excel(
        ios_reviews=ios_reviews,
        android_reviews=android_reviews,
        app_name="boAt Hearables",
        platform="both"
    )

    wb = openpyxl.load_workbook(excel_io)
    # Check that there are two separate worksheets: Sheet 1: iOS Reviews, Sheet 2: Android Reviews
    assert wb.sheetnames == ["iOS Reviews", "Android Reviews"]

    # Verify Sheet 1: iOS Reviews
    ws_ios = wb["iOS Reviews"]
    assert [cell.value for cell in ws_ios[1]] == EXCEL_COLUMNS
    assert ws_ios.freeze_panes == "A2"
    assert ws_ios.auto_filter.ref is not None
    assert ws_ios.max_row == 2
    row_ios = [cell.value for cell in ws_ios[2]]
    assert row_ios[0] == "Apple App Store"
    assert row_ios[1] == "boAt Hearables"
    assert row_ios[2] == "rev-apple-1"
    assert row_ios[3] == "Jane Smith"
    assert row_ios[4] == 4.0
    assert row_ios[5] == "Great app"
    assert row_ios[6] == "Works smoothly with my earbuds, highly recommended."

    # Verify Sheet 2: Android Reviews
    ws_android = wb["Android Reviews"]
    assert [cell.value for cell in ws_android[1]] == EXCEL_COLUMNS
    assert ws_android.freeze_panes == "A2"
    assert ws_android.auto_filter.ref is not None
    assert ws_android.max_row == 2
    row_android = [cell.value for cell in ws_android[2]]
    assert row_android[0] == "Google Play"
    assert row_android[1] == "boAt Hearables"
    assert row_android[2] == "rev-gp-1"
    assert row_android[3] == "John Doe"
    assert row_android[4] == 5.0
    assert row_android[5] in ("", None)
    assert row_android[6] == "Excellent sound quality and battery life!"

def test_excel_export_ios_only_worksheet():
    ios_reviews = [
        ReviewItem(
            id="rev-apple-1",
            platform="apple",
            rating=5.0,
            title="Superb",
            text="Loved it",
            date="2026-11-15T10:00:00Z"
        )
    ]
    excel_io = generate_platform_reviews_excel(
        ios_reviews=ios_reviews,
        android_reviews=None,
        app_name="boAt Hearables",
        platform="ios"
    )

    wb = openpyxl.load_workbook(excel_io)
    assert wb.sheetnames == ["iOS Reviews"]
    ws = wb["iOS Reviews"]
    assert ws.max_row == 2
    assert ws.cell(row=2, column=1).value == "Apple App Store"
    assert ws.cell(row=2, column=6).value == "Superb"

def test_excel_export_android_only_worksheet():
    android_reviews = [
        ReviewItem(
            id="rev-gp-1",
            platform="google",
            rating=5.0,
            text="Awesome app",
            date="2026-11-16T10:00:00Z"
        )
    ]
    excel_io = generate_platform_reviews_excel(
        ios_reviews=None,
        android_reviews=android_reviews,
        app_name="boAt Hearables",
        platform="android"
    )

    wb = openpyxl.load_workbook(excel_io)
    assert wb.sheetnames == ["Android Reviews"]
    ws = wb["Android Reviews"]
    assert ws.max_row == 2
    assert ws.cell(row=2, column=1).value == "Google Play"
    assert ws.cell(row=2, column=7).value == "Awesome app"

def test_build_excel_filename():
    fn_7 = build_excel_filename("7", app_name="App", current_date_str="2026-11-17")
    assert fn_7 == "App_Reviews_Last_7_Days_2026-11-17.xlsx"

    fn_15 = build_excel_filename("15", app_name="App", current_date_str="2026-11-17")
    assert fn_15 == "App_Reviews_Last_15_Days_2026-11-17.xlsx"

    fn_30 = build_excel_filename("30", app_name="App", current_date_str="2026-11-17")
    assert fn_30 == "App_Reviews_Last_30_Days_2026-11-17.xlsx"

    fn_all = build_excel_filename("all", app_name="App", current_date_str="2026-11-17")
    assert fn_all == "App_Reviews_All_Available_2026-11-17.xlsx"

    fn_boat = build_excel_filename("7", app_name="boAt Hearables", current_date_str="2026-11-17")
    assert fn_boat == "boAt_Hearables_Reviews_Last_7_Days_2026-11-17.xlsx"

def test_api_export_endpoint_validation():
    # No IDs provided -> 400
    res = client.get("/api/reviews/export?date_range=7")
    assert res.status_code == 400

    # Invalid date range -> 400
    res = client.get("/api/reviews/export?google_id=com.test&date_range=invalid")
    assert res.status_code == 400
    assert "Invalid date_range" in res.json()["detail"]

    # Invalid platform -> 400
    res = client.get("/api/reviews/export?google_id=com.test&platform=invalid_platform")
    assert res.status_code == 400
    assert "Invalid platform" in res.json()["detail"]

    # Platform ios requested without apple_id -> 400
    res = client.get("/api/reviews/export?google_id=com.test&platform=ios")
    assert res.status_code == 400
    assert "Apple App Store Track ID ('apple_id') must be provided" in res.json()["detail"]

    # Platform android requested without google_id -> 400
    res = client.get("/api/reviews/export?apple_id=123&platform=android")
    assert res.status_code == 400
    assert "Google Play Store package ID ('google_id') must be provided" in res.json()["detail"]

@patch("backend.api.routes.export_app_reviews")
def test_api_export_both_success(mock_export):
    ios_rev = ReviewItem(id="1", platform="apple", rating=4.0, text="Nice", date="2026-11-15T10:00:00Z")
    gp_rev = ReviewItem(id="2", platform="google", rating=5.0, text="Good", date="2026-11-16T10:00:00Z")
    excel_io = generate_platform_reviews_excel([ios_rev], [gp_rev], app_name="boAt Hearables", platform="both")
    stats = {
        "platform": "both",
        "total_count": 2,
        "google_count": 1,
        "apple_count": 1,
        "google_error": None,
        "apple_error": None,
        "google_failed": False,
        "apple_failed": False,
        "all_failed": False,
        "app_name": "boAt Hearables",
        "filename": "App_Reviews_Last_7_Days_2026-11-17.xlsx"
    }
    mock_export.return_value = (excel_io, "App_Reviews_Last_7_Days_2026-11-17.xlsx", stats)

    res = client.get("/api/reviews/export?google_id=com.boAt.hearables&apple_id=1592550875&date_range=7&platform=both")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert res.headers["x-total-reviews"] == "2"
    assert res.headers["x-google-reviews"] == "1"
    assert res.headers["x-apple-reviews"] == "1"
    assert res.headers["x-platform"] == "both"

    wb = openpyxl.load_workbook(io.BytesIO(res.content))
    assert wb.sheetnames == ["iOS Reviews", "Android Reviews"]

@patch("backend.api.routes.export_app_reviews")
def test_api_export_ios_only_success(mock_export):
    ios_rev = ReviewItem(id="1", platform="apple", rating=4.0, text="Nice", date="2026-11-15T10:00:00Z")
    excel_io = generate_platform_reviews_excel([ios_rev], None, app_name="boAt Hearables", platform="ios")
    stats = {
        "platform": "ios",
        "total_count": 1,
        "google_count": 0,
        "apple_count": 1,
        "google_error": None,
        "apple_error": None,
        "google_failed": False,
        "apple_failed": False,
        "all_failed": False,
        "app_name": "boAt Hearables",
        "filename": "App_Reviews_Last_7_Days_2026-11-17.xlsx"
    }
    mock_export.return_value = (excel_io, "App_Reviews_Last_7_Days_2026-11-17.xlsx", stats)

    res = client.get("/api/reviews/export?apple_id=1592550875&date_range=7&platform=ios")
    assert res.status_code == 200
    assert res.headers["x-total-reviews"] == "1"
    assert res.headers["x-apple-reviews"] == "1"
    assert res.headers["x-google-reviews"] == "0"
    assert res.headers["x-platform"] == "ios"

    wb = openpyxl.load_workbook(io.BytesIO(res.content))
    assert wb.sheetnames == ["iOS Reviews"]

@patch("backend.api.routes.export_app_reviews")
def test_api_export_android_only_success(mock_export):
    gp_rev = ReviewItem(id="2", platform="google", rating=5.0, text="Good", date="2026-11-16T10:00:00Z")
    excel_io = generate_platform_reviews_excel(None, [gp_rev], app_name="boAt Hearables", platform="android")
    stats = {
        "platform": "android",
        "total_count": 1,
        "google_count": 1,
        "apple_count": 0,
        "google_error": None,
        "apple_error": None,
        "google_failed": False,
        "apple_failed": False,
        "all_failed": False,
        "app_name": "boAt Hearables",
        "filename": "App_Reviews_Last_7_Days_2026-11-17.xlsx"
    }
    mock_export.return_value = (excel_io, "App_Reviews_Last_7_Days_2026-11-17.xlsx", stats)

    res = client.get("/api/reviews/export?google_id=com.boAt.hearables&date_range=7&platform=android")
    assert res.status_code == 200
    assert res.headers["x-total-reviews"] == "1"
    assert res.headers["x-google-reviews"] == "1"
    assert res.headers["x-apple-reviews"] == "0"
    assert res.headers["x-platform"] == "android"

    wb = openpyxl.load_workbook(io.BytesIO(res.content))
    assert wb.sheetnames == ["Android Reviews"]

@patch("backend.api.routes.export_app_reviews")
def test_api_export_no_reviews_found(mock_export):
    stats = {
        "platform": "both",
        "total_count": 0,
        "google_count": 0,
        "apple_count": 0,
        "google_error": None,
        "apple_error": None,
        "google_failed": False,
        "apple_failed": False,
        "all_failed": False,
        "app_name": "Test App",
        "filename": "App_Reviews_Last_7_Days_2026-11-17.xlsx"
    }
    mock_export.return_value = (None, "App_Reviews_Last_7_Days_2026-11-17.xlsx", stats)

    res = client.get("/api/reviews/export?google_id=com.empty&apple_id=123&date_range=7&platform=both")
    assert res.status_code == 404
    assert res.json()["detail"] == "No reviews found for the selected date range."

@patch("backend.api.routes.export_app_reviews")
def test_api_export_complete_failure(mock_export):
    stats = {
        "platform": "both",
        "total_count": 0,
        "google_count": 0,
        "apple_count": 0,
        "google_error": "Connection error",
        "apple_error": "Timeout",
        "google_failed": True,
        "apple_failed": True,
        "all_failed": True,
        "app_name": "Test App",
        "filename": "App_Reviews_Last_7_Days_2026-11-17.xlsx"
    }
    mock_export.return_value = (None, "App_Reviews_Last_7_Days_2026-11-17.xlsx", stats)

    res = client.get("/api/reviews/export?google_id=com.fail&apple_id=123&date_range=7&platform=both")
    assert res.status_code == 502
    assert res.json()["detail"] == "Unable to fetch reviews. Please try again."

@patch("backend.api.routes.export_app_reviews")
def test_api_export_partial_success(mock_export):
    reviews = [
        ReviewItem(id=f"g-{i}", platform="google", rating=4.0, text=f"Review {i}", date="2026-11-16T10:00:00Z")
        for i in range(5)
    ]
    excel_io = generate_platform_reviews_excel(None, reviews, app_name="Test App", platform="both")
    stats = {
        "platform": "both",
        "total_count": 5,
        "google_count": 5,
        "apple_count": 0,
        "google_error": None,
        "apple_error": "Apple App Store data could not be retrieved.",
        "google_failed": False,
        "apple_failed": True,
        "all_failed": False,
        "app_name": "Test App",
        "filename": "App_Reviews_Last_7_Days_2026-11-17.xlsx"
    }
    mock_export.return_value = (excel_io, "App_Reviews_Last_7_Days_2026-11-17.xlsx", stats)

    res = client.get("/api/reviews/export?google_id=com.success&apple_id=999&date_range=7&platform=both")
    assert res.status_code == 200
    assert res.headers["x-total-reviews"] == "5"
    assert res.headers["x-google-reviews"] == "5"
    assert res.headers["x-apple-reviews"] == "0"
    assert res.headers["x-apple-status"] == "failed"
