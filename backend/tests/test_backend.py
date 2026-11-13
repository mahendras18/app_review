import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "timestamp" in data
    assert data["version"] == "1.0.0"

def test_search_validation():
    # Missing query
    response = client.get("/api/apps/search")
    assert response.status_code == 422

def test_search_real_query():
    # Search for boAt hearables on both platforms
    response = client.get("/api/apps/search?query=boAt+hearables&platform=both&country=in")
    assert response.status_code == 200
    data = response.json()
    assert data["query"] == "boAt hearables"
    assert len(data["results"]) > 0
    # Check that platforms are returned
    platforms = [r["platform"] for r in data["results"]]
    assert "google" in platforms or "apple" in platforms

def test_google_play_summary_boat():
    # Real test with boAt Hearables
    response = client.get("/api/apps/com.boAt.hearables/summary?platform=google&country=in")
    assert response.status_code == 200
    data = response.json()
    assert data["platform"] == "google"
    assert data["app_id"] == "com.boAt.hearables"
    assert data["title"] == "boAt Hearables"
    assert data["score"] is not None
    assert data["score"] > 3.0
    assert data["ratings_count"] is not None

def test_apple_summary_boat():
    # Real test with boAt Hearables (1592550875)
    response = client.get("/api/apps/1592550875/summary?platform=apple&country=in")
    assert response.status_code == 200
    data = response.json()
    assert data["platform"] == "apple"
    assert data["app_id"] == "1592550875"
    assert "boAt" in data["title"]
    assert data["score"] is not None
    assert data["score"] > 3.0

def test_invalid_platform():
    response = client.get("/api/apps/123/summary?platform=windows&country=in")
    assert response.status_code == 400

def test_invalid_app_id_graceful_handling():
    # Google Play non-existent app
    response = client.get("/api/apps/com.nonexistent.fakeapp99999/summary?platform=google&country=in")
    assert response.status_code == 200
    data = response.json()
    assert data["error"] is not None

    # Apple App Store non-existent app
    response = client.get("/api/apps/9999999999999999/summary?platform=apple&country=in")
    assert response.status_code == 200
    data = response.json()
    assert data["error"] is not None

def test_unified_dashboard_real():
    response = client.get(
        "/api/dashboard/unified?google_id=com.boAt.hearables&apple_id=1592550875&country=in&count=5"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["google_summary"] is not None
    assert data["apple_summary"] is not None
    assert data["rating_comparison"] is not None
    assert data["rating_comparison"]["has_both"] is True
    assert len(data["reviews"]) > 0
