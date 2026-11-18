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
    assert extract_apple_app_id("https://apps.apple.com/in/app/boat-hearables/id1592550875?platform=iphone") == "1592550875"

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


from unittest.mock import patch, MagicMock
from backend.services.apple_app_store import (
    parse_apple_user_reviews_row,
    fetch_apple_reviews_by_date,
    APPLE_STOREFRONT_IDS
)
from datetime import datetime, timezone, timedelta

SAMPLE_USER_REVIEWS_ROW = {
    "userReviewList": [
        {
            "userReviewId": "9001",
            "rating": 5,
            "title": "Super Sound Quality",
            "body": "Really happy with the bass response.",
            "date": "2026-11-15T10:00:00Z",
            "name": "Audiophile99"
        },
        {
            "userReviewId": "9002",
            "rating": 1,
            "title": "Latency is high",
            "body": "Audio lags in gaming mode.",
            "date": "2026-11-14T08:30:00Z",
            "name": "GamerX"
        }
    ]
}

def test_parse_apple_user_reviews_row_fixture():
    items = parse_apple_user_reviews_row(SAMPLE_USER_REVIEWS_ROW)
    assert len(items) == 2
    assert items[0].id == "9001"
    assert items[0].platform == "apple"
    assert items[0].rating == 5.0
    assert items[0].title == "Super Sound Quality"
    assert items[0].text == "Really happy with the bass response."
    assert items[0].date == "2026-11-15T10:00:00Z"
    assert items[0].reviewer_name == "Audiophile99"

    assert items[1].id == "9002"
    assert items[1].rating == 1.0
    assert items[1].title == "Latency is high"

def test_apple_storefront_ids_presence():
    assert "in" in APPLE_STOREFRONT_IDS
    assert APPLE_STOREFRONT_IDS["in"] == "143467"
    assert "us" in APPLE_STOREFRONT_IDS
    assert APPLE_STOREFRONT_IDS["us"] == "143441"
    assert "gb" in APPLE_STOREFRONT_IDS
    assert len(APPLE_STOREFRONT_IDS) >= 100

def test_fetch_apple_reviews_by_date_pagination_beyond_10_pages():
    """
    Simulates 15 pages of reviews from Apple WebObjects (100 reviews per page = 1500 reviews).
    Verifies that pagination does NOT stop at page 10 and collects all 1500 reviews.
    """
    total_pages = 15
    page_size = 100

    def mock_get(url, *args, **kwargs):
        # Extract startIndex from URL
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.raise_for_status = MagicMock()

        if "startIndex=" in url:
            import urllib.parse
            parsed = urllib.parse.urlparse(url)
            params = urllib.parse.parse_qs(parsed.query)
            start = int(params.get("startIndex", [0])[0])
            page_idx = start // page_size

            if page_idx < total_pages:
                reviews = []
                for i in range(page_size):
                    review_id = str(page_idx * page_size + i + 1)
                    reviews.append({
                        "userReviewId": review_id,
                        "rating": 4,
                        "title": f"Review {review_id}",
                        "body": f"Review body {review_id}",
                        "date": "2026-11-10T00:00:00Z",
                        "name": f"User_{review_id}"
                    })
                mock_resp.json.return_value = {"userReviewList": reviews}
            else:
                mock_resp.json.return_value = {"userReviewList": []}
        else:
            mock_resp.json.return_value = {}

        return mock_resp

    with patch("requests.get", side_effect=mock_get):
        collected, err = fetch_apple_reviews_by_date(
            "1592550875", country="in", days=None, max_pages=50
        )
        assert err is None
        assert len(collected) == total_pages * page_size
        assert len(collected) == 1500, "Should have fetched 1500 reviews across 15 pages"
        # Confirm IDs from page 11..15 are present
        ids = {r.id for r in collected}
        assert "1100" in ids
        assert "1500" in ids

def test_fetch_apple_reviews_by_date_empty_page_and_http_errors():
    """
    Tests graceful termination when an empty page or HTTP error occurs
    for an app ID that has no seed files.
    """
    unknown_app_id = "9998887776"

    # 1. Empty page right away
    def mock_empty_get(url, *args, **kwargs):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"userReviewList": []}
        mock_resp.text = "<html></html>"
        mock_resp.content = b""
        return mock_resp

    with patch("requests.get", side_effect=mock_empty_get):
        reviews, err = fetch_apple_reviews_by_date(unknown_app_id, country="in", days=None)
        assert reviews == []
        assert err is None

    # 2. HTTP 404
    def mock_404_get(url, *args, **kwargs):
        mock_resp = MagicMock()
        mock_resp.status_code = 404
        mock_resp.text = "Not Found"
        mock_resp.content = b"Not Found"
        return mock_resp

    with patch("requests.get", side_effect=mock_404_get):
        reviews, err = fetch_apple_reviews_by_date(unknown_app_id, country="in", days=None)
        assert reviews == []

def test_fetch_apple_reviews_by_date_duplicate_removal():
    """
    Tests that duplicate review IDs across pages are removed.
    """
    batch_size = 100
    call_count = 0

    def mock_dup_get(url, *args, **kwargs):
        nonlocal call_count
        call_count += 1
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.raise_for_status = MagicMock()

        if call_count == 1:
            # Full 100-item page with a duplicate item inside
            items = []
            for i in range(batch_size - 1):
                items.append({
                    "userReviewId": f"REV-{i}",
                    "rating": 4,
                    "body": f"Review {i}",
                    "date": "2026-11-10T00:00:00Z"
                })
            # Add duplicate of REV-0
            items.append({
                "userReviewId": "REV-0",
                "rating": 4,
                "body": "Duplicate of REV-0",
                "date": "2026-11-10T00:00:00Z"
            })
            mock_resp.json.return_value = {"userReviewList": items}
        elif call_count == 2:
            # Second page contains REV-1 (duplicate from page 1) and 5 new items
            items = [
                {"userReviewId": "REV-1", "rating": 4, "body": "Duplicate of REV-1", "date": "2026-11-09T00:00:00Z"},
            ]
            for j in range(5):
                items.append({
                    "userReviewId": f"REV-PAGE2-{j}",
                    "rating": 5,
                    "body": f"Page 2 Review {j}",
                    "date": "2026-11-08T00:00:00Z"
                })
            mock_resp.json.return_value = {"userReviewList": items}
        else:
            mock_resp.json.return_value = {"userReviewList": []}
        return mock_resp

    with patch("requests.get", side_effect=mock_dup_get):
        collected, err = fetch_apple_reviews_by_date("9998887776", country="in", days=None, max_pages=3)
        assert err is None
        unique_ids = [r.id for r in collected]
        # Page 1 has 99 unique items (REV-0 to REV-98, duplicate REV-0 dropped)
        # Page 2 has REV-1 dropped, plus 5 new items -> 99 + 5 = 104 total
        assert len(unique_ids) == len(set(unique_ids)), "All collected reviews must have unique IDs"
        assert len(collected) == 104

def test_fetch_apple_reviews_by_date_date_filtering():
    """
    Tests that reviews outside cutoff date window are filtered out and pagination stops early.
    """
    now = datetime.now(timezone.utc)
    in_range_date = (now - timedelta(days=2)).isoformat()
    old_date = (now - timedelta(days=40)).isoformat()

    sample_payload = {
        "userReviewList": [
            {"userReviewId": "IN-1", "rating": 5, "body": "Recent", "date": in_range_date},
            {"userReviewId": "OLD-1", "rating": 1, "body": "Old 1", "date": old_date},
            {"userReviewId": "OLD-2", "rating": 1, "body": "Old 2", "date": old_date},
            {"userReviewId": "OLD-3", "rating": 1, "body": "Old 3", "date": old_date},
            {"userReviewId": "OLD-4", "rating": 1, "body": "Old 4", "date": old_date},
            {"userReviewId": "OLD-5", "rating": 1, "body": "Old 5", "date": old_date},
            {"userReviewId": "IN-AFTER-STOP", "rating": 5, "body": "Should not reach", "date": in_range_date},
        ]
    }

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = sample_payload

    with patch("requests.get", return_value=mock_resp):
        # Filter for 7 days
        collected, err = fetch_apple_reviews_by_date("1592550875", country="in", days=7)
        assert err is None
        assert len(collected) == 1
        assert collected[0].id == "IN-1"

def test_fetch_apple_reviews_by_date_all_available_real():
    """
    Live test against Apple for boAt Hearables (1592550875):
    Verifies that 'All Available Reviews' (days=None) fetches beyond the previous
    500 review limit across more than 10 pages.
    """
    collected, err = fetch_apple_reviews_by_date("1592550875", country="in", days=None)
    assert err is None
    # Prior limit was 500 reviews (10 pages of RSS). The new WebObjects engine fetches 1,000+!
    assert len(collected) > 500, f"Expected > 500 reviews, got {len(collected)}"
    # Verify no duplicate IDs
    ids = [r.id for r in collected if r.id]
    assert len(ids) == len(set(ids)), "Reviews should have no duplicate IDs"

