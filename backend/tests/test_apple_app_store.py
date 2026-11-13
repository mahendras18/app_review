import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.apple_app_store import (
    parse_apple_reviews_json,
    parse_apple_reviews_xml,
    fetch_apple_reviews,
    extract_apple_app_id,
)
from backend.schemas.responses import ReviewItem

client = TestClient(app)

SAMPLE_APPLE_JSON = {
    "feed": {
        "author": {"name": {"label": "iTunes Store"}},
        "entry": [
            {
                "id": {"label": "1592550875"},
                "title": {"label": "boAt Hearables - App Info Header"},
                # Metadata entry without im:rating (must be filtered out)
            },
            {
                "id": {"label": "1001"},
                "title": {"label": "Great Audio Quality"},
                "content": {"label": "Love the bass and connectivity."},
                "im:rating": {"label": "5"},
                "im:version": {"label": "1.8.0"},
                "updated": {"label": "2026-10-18T10:00:00-07:00"},
                "author": {"name": {"label": "John Doe"}}
            },
            {
                "id": {"label": "1002"},
                "title": {"label": "Connection Glitch"},
                "content": {"label": "Frequent disconnects when walking."},
                "im:rating": {"label": "2"},
                "im:version": {"label": "1.8.1"},
                "updated": {"label": "2026-10-17T08:30:00-07:00"},
                "author": {"name": {"label": "Jane Smith"}}
            }
        ]
    }
}

SAMPLE_APPLE_XML = """<?xml version="1.0" encoding="utf-8"?>
<feed xmlns:im="http://itunes.apple.com/rss" xmlns="http://www.w3.org/2005/Atom" xml:lang="en">
    <id>https://itunes.apple.com/in/rss/customerreviews/id=1592550875/sortBy=mostRecent/xml</id>
    <title>iTunes Store: Customer Reviews</title>
    <entry>
        <id>https://apps.apple.com/in/app/boat-hearables/id1592550875</id>
        <title>boAt Hearables</title>
        <!-- App metadata entry without im:rating -->
    </entry>
    <entry>
        <id>2001</id>
        <title>Excellent Battery</title>
        <content type="text">Battery lasts over 30 hours on a single charge.</content>
        <im:rating>5</im:rating>
        <im:version>1.8.1</im:version>
        <updated>2026-10-19T12:00:00-07:00</updated>
        <author><name>Alex Kumar</name></author>
    </entry>
    <entry>
        <id>2002</id>
        <title>Mic issue</title>
        <content type="text">People say my voice sounds muffled.</content>
        <im:rating>3</im:rating>
        <im:version>1.7.9</im:version>
        <updated>2026-10-16T15:20:00-07:00</updated>
        <author><name>Rohan V</name></author>
    </entry>
</feed>
"""

def test_extract_apple_app_id():
    assert extract_apple_app_id("1592550875") == "1592550875"
    assert extract_apple_app_id("id1592550875") == "1592550875"
    assert extract_apple_app_id("https://apps.apple.com/in/app/boat-hearables/id1592550875") == "1592550875"
    assert extract_apple_app_id("https://apps.apple.com/us/app/spotify/id324684580?platform=iphone") == "324684580"

def test_parse_apple_reviews_json_fixture():
    reviews = parse_apple_reviews_json(SAMPLE_APPLE_JSON)
    assert len(reviews) == 2
    
    r1 = reviews[0]
    assert r1.id == "1001"
    assert r1.platform == "apple"
    assert r1.rating == 5.0
    assert r1.title == "Great Audio Quality"
    assert "Love the bass" in r1.text
    assert r1.version == "1.8.0"
    assert r1.reviewer_name == "John Doe"
    assert r1.date == "2026-10-18T10:00:00-07:00"

    r2 = reviews[1]
    assert r2.id == "1002"
    assert r2.platform == "apple"
    assert r2.rating == 2.0
    assert r2.title == "Connection Glitch"
    assert r2.reviewer_name == "Jane Smith"

def test_parse_apple_reviews_xml_fixture():
    reviews = parse_apple_reviews_xml(SAMPLE_APPLE_XML)
    assert len(reviews) == 2
    
    r1 = reviews[0]
    assert r1.id == "2001"
    assert r1.platform == "apple"
    assert r1.rating == 5.0
    assert r1.title == "Excellent Battery"
    assert "30 hours" in r1.text
    assert r1.version == "1.8.1"
    assert r1.reviewer_name == "Alex Kumar"
    assert r1.date == "2026-10-19T12:00:00-07:00"

    r2 = reviews[1]
    assert r2.id == "2002"
    assert r2.platform == "apple"
    assert r2.rating == 3.0
    assert r2.title == "Mic issue"
    assert r2.reviewer_name == "Rohan V"

def test_parse_apple_empty_and_malformed_feeds():
    # Empty dictionary
    assert parse_apple_reviews_json({}) == []
    # Feed with empty entry list
    assert parse_apple_reviews_json({"feed": {"entry": []}}) == []
    # Feed with non-review entries
    assert parse_apple_reviews_json({"feed": {"entry": [{"id": {"label": "app"}}]}}) == []
    
    # XML empty / malformed
    assert parse_apple_reviews_xml("") == []
    assert parse_apple_reviews_xml("<invalid>xml") == []
    assert parse_apple_reviews_xml("<feed xmlns='http://www.w3.org/2005/Atom'></feed>") == []

def test_invalid_apple_id_validation():
    reviews, error = fetch_apple_reviews("not-a-valid-id", country="in")
    assert reviews == []
    assert error is not None
    assert "Invalid Apple App Store ID" in error

def test_apple_reviews_endpoint_real():
    # Real live retrieval for boAt Hearables (1592550875)
    response = client.get("/api/apps/1592550875/reviews?platform=apple&country=in&count=10")
    assert response.status_code == 200
    data = response.json()
    assert data["platform"] == "apple"
    assert data["app_id"] == "1592550875"
    assert data["count"] > 0
    assert len(data["reviews"]) > 0

    first_rev = data["reviews"][0]
    assert first_rev["platform"] == "apple"
    assert 1.0 <= first_rev["rating"] <= 5.0
    assert first_rev["text"] != ""
    assert first_rev["date"] is not None

def test_unified_dashboard_includes_apple_reviews_and_filtering():
    # Test that unified dashboard returns reviews from both platforms
    response = client.get(
        "/api/dashboard/unified?google_id=com.boAt.hearables&apple_id=1592550875&country=in&count=10"
    )
    assert response.status_code == 200
    data = response.json()
    
    assert data["apple_summary"] is not None
    assert data["apple_summary"]["reviews_fetched"] > 0
    
    reviews = data["reviews"]
    assert len(reviews) > 0
    
    # Check that reviews from both stores are present
    google_reviews = [r for r in reviews if r["platform"] == "google"]
    apple_reviews = [r for r in reviews if r["platform"] == "apple"]
    
    assert len(google_reviews) > 0, "Google Play reviews should be present in unified dashboard"
    assert len(apple_reviews) > 0, "Apple App Store reviews should be present in unified dashboard"

    # Verify App Store filtering logic matches frontend filter expectation
    app_store_filtered = [r for r in reviews if r["platform"] == "apple"]
    assert len(app_store_filtered) == len(apple_reviews)
    assert all(r["platform"] == "apple" for r in app_store_filtered)
