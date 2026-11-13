import logging
from datetime import datetime
from typing import List, Optional, Tuple

from backend.schemas.responses import (
    AppSummary,
    RatingComparison,
    ReviewItem,
    SingleDashboardResponse,
    UnifiedDashboardResponse,
)
from backend.services.apple_app_store import (
    fetch_apple_reviews,
    fetch_apple_summary,
)
from backend.services.google_play import (
    fetch_google_play_reviews,
    fetch_google_play_summary,
)

logger = logging.getLogger(__name__)

def get_app_summary(app_id: str, platform: str, country: str = "in") -> AppSummary:
    """
    Returns app information and overall rating statistics for the selected platform.
    """
    platform_clean = platform.lower().strip()
    if platform_clean in ("google", "android", "playstore", "play"):
        return fetch_google_play_summary(app_id, country=country)
    elif platform_clean in ("apple", "ios", "appstore"):
        return fetch_apple_summary(app_id, country=country)
    else:
        now_iso = datetime.now().isoformat()
        return AppSummary(
            platform=platform,
            app_id=app_id,
            country=country,
            last_updated=now_iso,
            error=f"Unsupported platform '{platform}'. Supported platforms: 'google', 'apple'."
        )

def get_app_reviews(
    app_id: str,
    platform: str,
    country: str = "in",
    count: int = 30,
    sort_order: str = "newest"
) -> Tuple[List[ReviewItem], Optional[str]]:
    """
    Retrieves recent reviews for the selected platform.
    """
    platform_clean = platform.lower().strip()
    if platform_clean in ("google", "android", "playstore", "play"):
        return fetch_google_play_reviews(app_id, country=country, count=count, sort_order=sort_order)
    elif platform_clean in ("apple", "ios", "appstore"):
        return fetch_apple_reviews(app_id, country=country, count=count, sort_order=sort_order)
    else:
        return [], f"Unsupported platform '{platform}'."

def get_single_dashboard(
    app_id: str,
    platform: str,
    country: str = "in",
    count: int = 30,
    sort_order: str = "newest"
) -> SingleDashboardResponse:
    """
    Return app summary and recent reviews together for a single platform.
    """
    summary = get_app_summary(app_id, platform=platform, country=country)
    reviews, review_err = get_app_reviews(
        app_id, platform=platform, country=country, count=count, sort_order=sort_order
    )

    if review_err and not summary.error:
        # Note the review retrieval issue without clearing summary
        summary.error = review_err

    summary.reviews_fetched = len(reviews)

    return SingleDashboardResponse(
        summary=summary,
        reviews=reviews,
        reviews_fetched=len(reviews)
    )

def get_unified_dashboard(
    google_id: Optional[str] = None,
    apple_id: Optional[str] = None,
    country: str = "in",
    count: int = 30,
    sort_order: str = "newest"
) -> UnifiedDashboardResponse:
    """
    Builds a unified dashboard containing Google Play and Apple App Store data,
    overall rating comparison, and combined recent reviews.
    """
    now_iso = datetime.now().isoformat()

    google_summary: Optional[AppSummary] = None
    google_reviews: List[ReviewItem] = []

    if google_id:
        google_summary = fetch_google_play_summary(google_id, country=country)
        g_rev, g_err = fetch_google_play_reviews(
            google_id, country=country, count=count, sort_order=sort_order
        )
        google_reviews = g_rev
        google_summary.reviews_fetched = len(g_rev)
        if g_err and not google_summary.error:
            google_summary.error = g_err

    apple_summary: Optional[AppSummary] = None
    apple_reviews: List[ReviewItem] = []

    if apple_id:
        apple_summary = fetch_apple_summary(apple_id, country=country)
        a_rev, a_err = fetch_apple_reviews(
            apple_id, country=country, count=count, sort_order=sort_order
        )
        apple_reviews = a_rev
        apple_summary.reviews_fetched = len(a_rev)
        if a_err and not apple_summary.error:
            apple_summary.error = a_err

    # Combine reviews and sort
    all_reviews: List[ReviewItem] = google_reviews + apple_reviews
    
    # Sort reviews by date if available
    def parse_review_date(r: ReviewItem) -> float:
        if not r.date:
            return 0.0
        try:
            dt = datetime.fromisoformat(r.date.replace("Z", "+00:00"))
            return dt.timestamp()
        except Exception:
            return 0.0

    reverse_sort = sort_order.lower() == "newest"
    all_reviews.sort(key=parse_review_date, reverse=reverse_sort)

    # Compute rating comparison
    comparison: Optional[RatingComparison] = None
    g_score = google_summary.score if google_summary and not google_summary.error else None
    a_score = apple_summary.score if apple_summary and not apple_summary.error else None
    g_count = google_summary.ratings_count if google_summary and not google_summary.error else None
    a_count = apple_summary.ratings_count if apple_summary and not apple_summary.error else None

    diff = None
    if g_score is not None and a_score is not None:
        diff = round(g_score - a_score, 2)

    comparison = RatingComparison(
        google_score=g_score,
        apple_score=a_score,
        score_difference=diff,
        google_ratings_count=g_count,
        apple_ratings_count=a_count,
        has_both=(g_score is not None and a_score is not None),
        details="Official ratings reported directly by Google Play and Apple App Store APIs."
    )

    return UnifiedDashboardResponse(
        google_summary=google_summary,
        apple_summary=apple_summary,
        reviews=all_reviews,
        rating_comparison=comparison,
        country=country,
        timestamp=now_iso
    )
