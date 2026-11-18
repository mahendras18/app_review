import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

from backend.main import app
from backend.schemas.responses import ReviewItem, ReviewsReportResponse
from backend.services.dashboard import generate_reviews_report, _REPORT_CACHE

client = TestClient(app)

MOCK_GOOGLE_REVIEWS = [
    ReviewItem(
        id="gp_1",
        platform="google",
        rating=5.0,
        title="Excellent earbuds",
        text="Battery life and bass are amazing on boAt Hearables.",
        date="2026-11-16T10:00:00Z",
        version="2.4.1",
        reviewer_name="Rahul Sharma"
    ),
    ReviewItem(
        id="gp_2",
        platform="google",
        rating=3.0,
        title="Average connectivity",
        text="Bluetooth drops occasionally but sound is fine.",
        date="2026-11-15T08:30:00Z",
        version="2.4.0",
        reviewer_name="Pooja Patel"
    ),
    ReviewItem(
        id="gp_3",
        platform="google",
        rating=1.0,
        title="Stopped working",
        text="Left earbud stopped charging after 2 days.",
        date="2026-11-14T14:15:00Z",
        version="2.3.9",
        reviewer_name="Amit Kumar"
    ),
]

MOCK_APPLE_REVIEWS = [
    ReviewItem(
        id="ap_1",
        platform="apple",
        rating=4.0,
        title="Good app companion",
        text="EQ settings work well with Rockerz.",
        date="2026-11-16T12:00:00Z",
        version="1.8.0",
        reviewer_name="Deepak V"
    ),
    ReviewItem(
        id="ap_2",
        platform="apple",
        rating=2.0,
        title="App crashes on iOS 18",
        text="Keeps closing when connecting to Airdopes.",
        date="2026-11-13T09:20:00Z",
        version="1.7.9",
        reviewer_name="Sanjay M"
    ),
]

@pytest.fixture(autouse=True)
def clear_report_cache():
    _REPORT_CACHE.clear()
    yield
    _REPORT_CACHE.clear()

@patch("backend.services.dashboard.fetch_apple_reviews_by_date")
@patch("backend.services.dashboard.fetch_google_play_reviews_by_date")
def test_reviews_report_both_platforms(mock_gp, mock_ap):
    mock_gp.return_value = (MOCK_GOOGLE_REVIEWS, None)
    mock_ap.return_value = (MOCK_APPLE_REVIEWS, None)

    response = client.get("/api/reviews/report?google_id=com.boAt.hearables&apple_id=1592550875&platform=both&date_range=7")
    assert response.status_code == 200
    data = response.json()

    assert data["platform"] == "both"
    assert data["app_name"] == "boAt Hearables"
    assert data["date_range"] == "7"
    assert data["total_count"] == 5
    assert data["android_count"] == 3
    assert data["ios_count"] == 2

    # Check Android reviews structure and sentiment
    android_revs = data["android_reviews"]
    assert len(android_revs) == 3
    assert android_revs[0]["platform"] == "Google Play"
    assert android_revs[0]["sentiment"] == "Positive"
    assert android_revs[1]["sentiment"] == "Neutral"
    assert android_revs[2]["sentiment"] == "Negative"

    # Check iOS reviews structure and sentiment
    ios_revs = data["ios_reviews"]
    assert len(ios_revs) == 2
    assert ios_revs[0]["platform"] == "Apple App Store"
    assert ios_revs[0]["sentiment"] == "Positive"
    assert ios_revs[1]["sentiment"] == "Negative"

@patch("backend.services.dashboard.fetch_apple_reviews_by_date")
@patch("backend.services.dashboard.fetch_google_play_reviews_by_date")
def test_reviews_report_android_only(mock_gp, mock_ap):
    mock_gp.return_value = (MOCK_GOOGLE_REVIEWS, None)

    response = client.get("/api/reviews/report?google_id=com.boAt.hearables&platform=android&date_range=15")
    assert response.status_code == 200
    data = response.json()

    assert data["platform"] == "android"
    assert data["android_count"] == 3
    assert data["ios_count"] == 0
    assert data["total_count"] == 3
    assert len(data["android_reviews"]) == 3
    assert len(data["ios_reviews"]) == 0
    mock_ap.assert_not_called()

@patch("backend.services.dashboard.fetch_apple_reviews_by_date")
@patch("backend.services.dashboard.fetch_google_play_reviews_by_date")
def test_reviews_report_ios_only(mock_gp, mock_ap):
    mock_ap.return_value = (MOCK_APPLE_REVIEWS, None)

    response = client.get("/api/reviews/report?apple_id=1592550875&platform=ios&date_range=30")
    assert response.status_code == 200
    data = response.json()

    assert data["platform"] == "ios"
    assert data["android_count"] == 0
    assert data["ios_count"] == 2
    assert data["total_count"] == 2
    assert len(data["android_reviews"]) == 0
    assert len(data["ios_reviews"]) == 2
    mock_gp.assert_not_called()

def test_reviews_report_invalid_platform():
    response = client.get("/api/reviews/report?platform=invalid_platform")
    assert response.status_code == 400
    assert "Invalid platform" in response.json()["detail"]

def test_reviews_report_invalid_date_range():
    response = client.get("/api/reviews/report?platform=both&date_range=999")
    assert response.status_code == 400
    assert "Invalid date_range" in response.json()["detail"]

@patch("backend.services.dashboard.fetch_apple_reviews_by_date")
@patch("backend.services.dashboard.fetch_google_play_reviews_by_date")
def test_reviews_report_defaults_to_boat_hearables(mock_gp, mock_ap):
    mock_gp.return_value = ([], None)
    mock_ap.return_value = ([], None)

    # Calling without explicit google_id or apple_id
    response = client.get("/api/reviews/report?platform=both&date_range=all")
    assert response.status_code == 200
    data = response.json()

    assert data["app_name"] == "boAt Hearables"
    mock_gp.assert_called_once_with("com.boAt.hearables", country="in", days=None)
    mock_ap.assert_called_once_with("1592550875", country="in", days=None)

@patch("backend.services.dashboard.fetch_apple_reviews_by_date")
@patch("backend.services.dashboard.fetch_google_play_reviews_by_date")
def test_reviews_report_caching_behavior(mock_gp, mock_ap):
    mock_gp.return_value = (MOCK_GOOGLE_REVIEWS, None)
    mock_ap.return_value = (MOCK_APPLE_REVIEWS, None)

    # First call: populates cache
    resp1 = client.get("/api/reviews/report?google_id=com.boAt.hearables&apple_id=1592550875&platform=both&date_range=7")
    assert resp1.status_code == 200
    assert mock_gp.call_count == 1
    assert mock_ap.call_count == 1

    # Second call with same params: should serve from cache without calling fetch functions again
    resp2 = client.get("/api/reviews/report?google_id=com.boAt.hearables&apple_id=1592550875&platform=both&date_range=7")
    assert resp2.status_code == 200
    assert mock_gp.call_count == 1
    assert mock_ap.call_count == 1
    assert resp1.json() == resp2.json()
