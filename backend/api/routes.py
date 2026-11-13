import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from backend.schemas.responses import (
    AppSummary,
    HealthResponse,
    ReviewsResponse,
    SearchResponse,
    SingleDashboardResponse,
    UnifiedDashboardResponse,
)
from backend.services.apple_app_store import search_apple_apps
from backend.services.dashboard import (
    get_app_reviews,
    get_app_summary,
    get_single_dashboard,
    get_unified_dashboard,
)
from backend.services.google_play import search_google_play_apps

router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)

@router.get("/health", response_model=HealthResponse)
def health_check():
    """
    Check whether the backend service is healthy and running.
    """
    return HealthResponse(
        status="ok",
        timestamp=datetime.now().isoformat(),
        version="1.0.0"
    )

@router.get("/apps/search", response_model=SearchResponse)
def search_apps(
    query: str = Query(..., min_length=1, description="App name, package ID, or store URL"),
    platform: str = Query("both", description="Store platform: 'google', 'apple', or 'both'"),
    country: str = Query("in", min_length=2, max_length=5, description="Country storefront code (e.g., 'in', 'us')")
):
    """
    Search for an app across Google Play Store and/or Apple App Store.
    """
    platform_clean = platform.lower().strip()
    results = []

    if platform_clean in ("google", "both", "all"):
        gp_results = search_google_play_apps(query, country=country, limit=10)
        results.extend(gp_results)

    if platform_clean in ("apple", "both", "all"):
        apple_results = search_apple_apps(query, country=country, limit=10)
        results.extend(apple_results)

    return SearchResponse(
        query=query,
        platform=platform_clean,
        country=country,
        count=len(results),
        results=results
    )

@router.get("/apps/{app_id}/summary", response_model=AppSummary)
def app_summary(
    app_id: str,
    platform: str = Query(..., description="Platform: 'google' or 'apple'"),
    country: str = Query("in", min_length=2, max_length=5, description="Country storefront code")
):
    """
    Return app information and overall rating statistics for the selected platform.
    """
    platform_clean = platform.lower().strip()
    if platform_clean not in ("google", "apple"):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid platform '{platform}'. Must be 'google' or 'apple'."
        )

    summary = get_app_summary(app_id=app_id, platform=platform_clean, country=country)
    return summary

@router.get("/apps/{app_id}/reviews", response_model=ReviewsResponse)
def app_reviews(
    app_id: str,
    platform: str = Query(..., description="Platform: 'google' or 'apple'"),
    country: str = Query("in", min_length=2, max_length=5, description="Country storefront code"),
    count: int = Query(30, ge=1, le=100, description="Number of reviews to retrieve (max 100)"),
    sort: str = Query("newest", pattern="^(newest|oldest)$", description="Sort order: 'newest' or 'oldest'")
):
    """
    Retrieve recent reviews for an app on the specified platform.
    """
    platform_clean = platform.lower().strip()
    if platform_clean not in ("google", "apple"):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid platform '{platform}'. Must be 'google' or 'apple'."
        )

    reviews, error = get_app_reviews(
        app_id=app_id,
        platform=platform_clean,
        country=country,
        count=count,
        sort_order=sort
    )

    if error and not reviews:
        raise HTTPException(status_code=404, detail=error)

    return ReviewsResponse(
        platform=platform_clean,
        app_id=app_id,
        country=country,
        count=len(reviews),
        reviews=reviews
    )

@router.get("/apps/{app_id}/dashboard", response_model=SingleDashboardResponse)
def app_dashboard(
    app_id: str,
    platform: str = Query(..., description="Platform: 'google' or 'apple'"),
    country: str = Query("in", min_length=2, max_length=5, description="Country storefront code"),
    count: int = Query(30, ge=1, le=100, description="Number of reviews (max 100)"),
    sort: str = Query("newest", pattern="^(newest|oldest)$", description="Sort order: 'newest' or 'oldest'")
):
    """
    Return app summary and recent reviews together for a single platform.
    """
    platform_clean = platform.lower().strip()
    if platform_clean not in ("google", "apple"):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid platform '{platform}'. Must be 'google' or 'apple'."
        )

    return get_single_dashboard(
        app_id=app_id,
        platform=platform_clean,
        country=country,
        count=count,
        sort_order=sort
    )

@router.get("/dashboard/unified", response_model=UnifiedDashboardResponse)
def unified_dashboard(
    google_id: Optional[str] = Query(None, description="Google Play Store package ID"),
    apple_id: Optional[str] = Query(None, description="Apple App Store Track ID"),
    country: str = Query("in", min_length=2, max_length=5, description="Country storefront code"),
    count: int = Query(30, ge=1, le=100, description="Number of reviews per platform (max 100)"),
    sort: str = Query("newest", pattern="^(newest|oldest)$", description="Sort order: 'newest' or 'oldest'")
):
    """
    Unified endpoint returning Google Play and Apple App Store summary, rating comparison,
    and merged recent reviews in one call.
    """
    if not google_id and not apple_id:
        raise HTTPException(
            status_code=400,
            detail="At least one of 'google_id' or 'apple_id' must be provided."
        )

    return get_unified_dashboard(
        google_id=google_id,
        apple_id=apple_id,
        country=country,
        count=count,
        sort_order=sort
    )
