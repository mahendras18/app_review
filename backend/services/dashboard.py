import io
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from backend.schemas.responses import (
    AppSummary,
    RatingComparison,
    ReviewItem,
    ReviewReportItem,
    ReviewsReportResponse,
    SingleDashboardResponse,
    UnifiedDashboardResponse,
)
from backend.services.apple_app_store import (
    fetch_apple_reviews,
    fetch_apple_reviews_by_date,
    fetch_apple_summary,
)
from backend.services.date_utils import normalize_to_utc, parse_date_range
from backend.services.excel_export import (
    build_excel_filename,
    generate_platform_reviews_excel,
    generate_reviews_excel,
)
from backend.services.google_play import (
    fetch_google_play_reviews,
    fetch_google_play_reviews_by_date,
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
        if count > 0:
            g_rev, g_err = fetch_google_play_reviews(
                google_id, country=country, count=count, sort_order=sort_order
            )
            google_reviews = g_rev
            google_summary.reviews_fetched = len(g_rev)
            if g_err and not google_summary.error:
                google_summary.error = g_err
        else:
            google_summary.reviews_fetched = 0

    apple_summary: Optional[AppSummary] = None
    apple_reviews: List[ReviewItem] = []

    if apple_id:
        apple_summary = fetch_apple_summary(apple_id, country=country)
        if count > 0:
            a_rev, a_err = fetch_apple_reviews(
                apple_id, country=country, count=count, sort_order=sort_order
            )
            apple_reviews = a_rev
            apple_summary.reviews_fetched = len(a_rev)
            if a_err and not apple_summary.error:
                apple_summary.error = a_err
        else:
            apple_summary.reviews_fetched = 0

    # Combine reviews and sort
    all_reviews: List[ReviewItem] = google_reviews + apple_reviews
    
    # Sort reviews by date if available
    def parse_review_date(r: ReviewItem) -> float:
        dt = normalize_to_utc(r.date)
        return dt.timestamp() if dt else 0.0

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

def export_app_reviews(
    google_id: Optional[str] = None,
    apple_id: Optional[str] = None,
    app_name: Optional[str] = None,
    country: str = "in",
    date_range: Optional[str] = "7",
    platform: Optional[str] = "both"
) -> Tuple[Optional[io.BytesIO], str, Dict[str, Any]]:
    """
    Fetches customer reviews for the selected platform(s) independently
    using proper date filtering and pagination, and returns the generated
    Microsoft Excel (.xlsx) file with platform-specific worksheets.

    - When Both platforms are selected: Sheet 1 (iOS Reviews) and Sheet 2 (Android Reviews).
    - When only iOS is selected: Sheet 1 (iOS Reviews).
    - When only Android is selected: Sheet 1 (Android Reviews).

    Returns (excel_bytes_or_none, filename, stats_dict).
    """
    days, cutoff = parse_date_range(date_range)

    clean_platform = (platform or "both").lower().strip()
    if clean_platform in ("ios", "apple"):
        target_platform = "ios"
    elif clean_platform in ("android", "google"):
        target_platform = "android"
    else:
        target_platform = "both"

    # Resolve application display name
    resolved_name = app_name.strip() if app_name and app_name.strip() else None
    if not resolved_name:
        if target_platform in ("android", "both") and google_id:
            summary = fetch_google_play_summary(google_id, country=country)
            if summary.title:
                resolved_name = summary.title
        if not resolved_name and target_platform in ("ios", "both") and apple_id:
            summary = fetch_apple_summary(apple_id, country=country)
            if summary.title:
                resolved_name = summary.title
    if not resolved_name:
        resolved_name = "App"

    filename = build_excel_filename(date_range, app_name=resolved_name, platform=target_platform)

    google_reviews: List[ReviewItem] = []
    google_err: Optional[str] = None
    if target_platform in ("android", "both") and google_id:
        google_reviews, google_err = fetch_google_play_reviews_by_date(
            google_id, country=country, days=days
        )

    apple_reviews: List[ReviewItem] = []
    apple_err: Optional[str] = None
    if target_platform in ("ios", "both") and apple_id:
        apple_reviews, apple_err = fetch_apple_reviews_by_date(
            apple_id, country=country, days=days
        )

    # Sort reviews chronologically newest-first in each list
    def _parse_ts(r: ReviewItem) -> float:
        dt = normalize_to_utc(r.date)
        return dt.timestamp() if dt else 0.0

    def _compute_sentiment(rating: float) -> str:
        if rating >= 4.0:
            return "Positive"
        elif rating == 3.0:
            return "Neutral"
        return "Negative"

    for r in google_reviews:
        if not r.sentiment:
            r.sentiment = _compute_sentiment(r.rating)
    for r in apple_reviews:
        if not r.sentiment:
            r.sentiment = _compute_sentiment(r.rating)

    google_reviews.sort(key=_parse_ts, reverse=True)
    apple_reviews.sort(key=_parse_ts, reverse=True)

    # Determine failures
    gp_failed = bool(target_platform in ("android", "both") and google_id and google_err and not google_reviews)
    apple_failed = bool(target_platform in ("ios", "both") and apple_id and apple_err and not apple_reviews)

    requested_platforms = []
    if target_platform in ("android", "both") and google_id:
        requested_platforms.append("android")
    if target_platform in ("ios", "both") and apple_id:
        requested_platforms.append("ios")

    failed_platforms = []
    if gp_failed:
        failed_platforms.append("android")
    if apple_failed:
        failed_platforms.append("ios")

    all_failed = len(requested_platforms) > 0 and len(requested_platforms) == len(failed_platforms)

    total_count = len(google_reviews) + len(apple_reviews)

    stats = {
        "platform": target_platform,
        "total_count": total_count,
        "google_count": len(google_reviews),
        "apple_count": len(apple_reviews),
        "google_error": google_err,
        "apple_error": apple_err,
        "google_failed": gp_failed,
        "apple_failed": apple_failed,
        "all_failed": all_failed,
        "app_name": resolved_name,
        "filename": filename
    }

    if all_failed:
        logger.warning(f"All requested platforms failed for review export: {stats}")
        return None, filename, stats

    if total_count == 0:
        logger.info(f"No reviews found for platform '{target_platform}' and date range '{date_range}': {stats}")
        return None, filename, stats

    # Generate Excel (.xlsx) file with platform worksheets
    excel_stream = generate_platform_reviews_excel(
        ios_reviews=apple_reviews if target_platform in ("ios", "both") else None,
        android_reviews=google_reviews if target_platform in ("android", "both") else None,
        app_name=resolved_name,
        platform=target_platform
    )
    return excel_stream, filename, stats


import time

_REPORT_CACHE: Dict[str, Tuple[float, ReviewsReportResponse]] = {}
_CACHE_TTL_SECONDS = 300  # 5 minutes

def generate_reviews_report(
    google_id: Optional[str] = None,
    apple_id: Optional[str] = None,
    app_name: Optional[str] = None,
    country: str = "in",
    date_range: Optional[str] = "7",
    platform: Optional[str] = "both"
) -> ReviewsReportResponse:
    """
    Collects structured customer reviews for the online spreadsheet viewer.
    Returns ReviewsReportResponse with separate android_reviews and ios_reviews lists,
    complete with sentiment analysis and metadata.
    Uses in-memory caching to prevent duplicate API fetches on repeated tab views.
    """
    days, cutoff = parse_date_range(date_range)

    clean_platform = (platform or "both").lower().strip()
    if clean_platform in ("ios", "apple"):
        target_platform = "ios"
    elif clean_platform in ("android", "google"):
        target_platform = "android"
    else:
        target_platform = "both"

    clean_range = (date_range or "7").lower().strip()
    cache_key = f"{google_id or ''}:{apple_id or ''}:{country}:{clean_range}:{target_platform}"
    now_ts = time.time()

    if cache_key in _REPORT_CACHE:
        cached_ts, cached_resp = _REPORT_CACHE[cache_key]
        if now_ts - cached_ts < _CACHE_TTL_SECONDS:
            logger.info(f"[Report] Returning cached review report for key: {cache_key}")
            return cached_resp

    resolved_name = app_name.strip() if app_name and app_name.strip() else "boAt Hearables"

    google_reviews: List[ReviewItem] = []
    google_err: Optional[str] = None
    if target_platform in ("android", "both") and google_id:
        google_reviews, google_err = fetch_google_play_reviews_by_date(
            google_id, country=country, days=days
        )

    apple_reviews: List[ReviewItem] = []
    apple_err: Optional[str] = None
    if target_platform in ("ios", "both") and apple_id:
        apple_reviews, apple_err = fetch_apple_reviews_by_date(
            apple_id, country=country, days=days
        )

    # Sort reviews chronologically newest-first
    def _parse_ts(r: ReviewItem) -> float:
        dt = normalize_to_utc(r.date)
        return dt.timestamp() if dt else 0.0

    def _compute_sentiment(rating: float) -> str:
        if rating >= 4.0:
            return "Positive"
        elif rating == 3.0:
            return "Neutral"
        return "Negative"

    for r in google_reviews:
        if not r.sentiment:
            r.sentiment = _compute_sentiment(r.rating)
    for r in apple_reviews:
        if not r.sentiment:
            r.sentiment = _compute_sentiment(r.rating)

    google_reviews.sort(key=_parse_ts, reverse=True)
    apple_reviews.sort(key=_parse_ts, reverse=True)

    def _to_report_item(r: ReviewItem, platform_display: str) -> ReviewReportItem:
        if r.rating >= 4.0:
            sentiment = "Positive"
        elif r.rating == 3.0:
            sentiment = "Neutral"
        else:
            sentiment = "Negative"
        return ReviewReportItem(
            id=r.id,
            platform=platform_display,
            app_name=resolved_name,
            rating=float(r.rating or 0.0),
            sentiment=sentiment,
            title=r.title or None,
            text=r.text or "",
            date=r.date,
            version=r.version or None,
            reviewer_name=r.reviewer_name or None
        )

    android_items = [_to_report_item(r, "Google Play") for r in google_reviews] if target_platform in ("android", "both") else []
    ios_items = [_to_report_item(r, "Apple App Store") for r in apple_reviews] if target_platform in ("ios", "both") else []

    total_count = len(android_items) + len(ios_items)

    response_obj = ReviewsReportResponse(
        platform=target_platform,
        app_name=resolved_name,
        date_range=clean_range,
        country=country,
        total_count=total_count,
        android_count=len(android_items),
        ios_count=len(ios_items),
        android_reviews=android_items,
        ios_reviews=ios_items,
        errors={
            "google": google_err,
            "apple": apple_err
        }
    )

    _REPORT_CACHE[cache_key] = (now_ts, response_obj)
    return response_obj


from datetime import datetime, timezone
from backend.schemas.responses import GeneratedReportItem
from backend.services.temp_report_service import save_temp_report

def generate_and_host_report(
    platform: str = "both",
    date_range: str = "7",
    country: str = "in",
    google_id: Optional[str] = "com.boAt.hearables",
    apple_id: Optional[str] = "1592550875",
    app_name: str = "boAt Hearables",
    base_url: str = "http://localhost:8000"
) -> GeneratedReportItem:
    """
    Collects genuine customer reviews for boAt Hearables, generates an authentic
    Excel (.xlsx) workbook with dedicated platform worksheets, and saves it
    to temporary hosting for viewing in Microsoft's Excel Online Viewer.
    """
    days, cutoff = parse_date_range(date_range)
    clean_platform = (platform or "both").lower().strip()
    if clean_platform in ("ios", "apple"):
        target_platform = "ios"
    elif clean_platform in ("android", "google"):
        target_platform = "android"
    else:
        target_platform = "both"

    clean_range = (date_range or "7").lower().strip()
    resolved_name = app_name.strip() if app_name and app_name.strip() else "boAt Hearables"

    google_reviews: List[ReviewItem] = []
    google_err: Optional[str] = None
    if target_platform in ("android", "both") and google_id:
        google_reviews, google_err = fetch_google_play_reviews_by_date(
            google_id, country=country, days=days
        )

    apple_reviews: List[ReviewItem] = []
    apple_err: Optional[str] = None
    if target_platform in ("ios", "both") and apple_id:
        apple_reviews, apple_err = fetch_apple_reviews_by_date(
            apple_id, country=country, days=days
        )

    def _parse_ts(r: ReviewItem) -> float:
        dt = normalize_to_utc(r.date)
        return dt.timestamp() if dt else 0.0

    def _compute_sentiment(rating: float) -> str:
        if rating >= 4.0:
            return "Positive"
        elif rating == 3.0:
            return "Neutral"
        return "Negative"

    for r in google_reviews:
        if not r.sentiment:
            r.sentiment = _compute_sentiment(r.rating)
    for r in apple_reviews:
        if not r.sentiment:
            r.sentiment = _compute_sentiment(r.rating)

    google_reviews.sort(key=_parse_ts, reverse=True)
    apple_reviews.sort(key=_parse_ts, reverse=True)

    # Combine reviews sorted chronologically descending
    all_reviews: List[ReviewItem] = []
    if target_platform == "both":
        all_reviews = list(google_reviews) + list(apple_reviews)
        all_reviews.sort(key=_parse_ts, reverse=True)
    elif target_platform == "android":
        all_reviews = list(google_reviews)
    else:
        all_reviews = list(apple_reviews)

    total_count = len(google_reviews) + len(apple_reviews)

    # Generate genuine Excel .xlsx workbook (without Sentiment column, proper formatting)
    excel_stream = generate_platform_reviews_excel(
        ios_reviews=apple_reviews if target_platform in ("ios", "both") else None,
        android_reviews=google_reviews if target_platform in ("android", "both") else None,
        app_name=resolved_name,
        platform=target_platform
    )

    filename = build_excel_filename(clean_range, app_name=resolved_name, platform=target_platform)

    # Save to unpredictable temporary hosting
    meta = save_temp_report(
        excel_stream=excel_stream,
        filename=filename,
        app_name=resolved_name,
        platform=target_platform,
        date_range=clean_range,
        total_count=total_count,
        android_count=len(google_reviews),
        ios_count=len(apple_reviews),
        base_url=base_url
    )

    return GeneratedReportItem(
        id=meta["id"],
        filename=meta["filename"],
        name=meta["name"],
        platform=meta["platform"],
        date_range=meta["date_range"],
        generated_at=meta["generated_at"],
        expires_at=meta["expires_at"],
        total_count=meta["total_count"],
        android_count=meta["android_count"],
        ios_count=meta["ios_count"],
        file_url=meta["file_url"],
        viewer_url=meta["viewer_url"],
        web_url=meta["web_url"],
        is_public=meta["is_public"],
        is_localhost=meta["is_localhost"],
        app_name=meta["app_name"],
        reviews=all_reviews,
        android_reviews=google_reviews,
        ios_reviews=apple_reviews
    )

# Backward-compatibility alias
generate_and_upload_report = generate_and_host_report

