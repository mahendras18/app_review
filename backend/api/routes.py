import logging
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Query, Response, Request
from fastapi.responses import FileResponse

from backend.schemas.responses import (
    AppSummary,
    HealthResponse,
    ReviewsReportResponse,
    ReviewsResponse,
    SearchResponse,
    SingleDashboardResponse,
    UnifiedDashboardResponse,
)
from backend.services.apple_app_store import search_apple_apps
from backend.services.dashboard import (
    export_app_reviews,
    generate_reviews_report,
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
    count: int = Query(30, ge=0, le=100, description="Number of reviews per platform (max 100)"),
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

@router.get("/reviews/export")
def export_reviews(
    google_id: Optional[str] = Query(None, description="Google Play Store package ID"),
    apple_id: Optional[str] = Query(None, description="Apple App Store Track ID"),
    app_name: Optional[str] = Query(None, description="Application display name"),
    country: str = Query("in", min_length=2, max_length=5, description="Country storefront code"),
    date_range: str = Query("7", description="Date range: '7', '15', '30', or 'all'"),
    platform: str = Query("both", description="Platform selection: 'both', 'ios', or 'android'")
):
    """
    Exports customer reviews from Google Play Store and Apple App Store
    for the selected date range and platform(s) as a downloadable Microsoft Excel (.xlsx) file.
    - When Both platforms are selected: Sheet 1 (iOS Reviews) and Sheet 2 (Android Reviews).
    - When only iOS is selected: Sheet 1 (iOS Reviews).
    - When only Android is selected: Sheet 1 (Android Reviews).
    """
    clean_platform = (platform or "both").lower().strip()
    if clean_platform in ("both", "all"):
        target_platform = "both"
    elif clean_platform in ("ios", "apple", "appstore"):
        target_platform = "ios"
    elif clean_platform in ("android", "google", "playstore"):
        target_platform = "android"
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid platform '{platform}'. Must be 'ios', 'android', or 'both'."
        )

    if target_platform == "ios" and not apple_id:
        raise HTTPException(
            status_code=400,
            detail="Apple App Store Track ID ('apple_id') must be provided for iOS export."
        )

    if target_platform == "android" and not google_id:
        raise HTTPException(
            status_code=400,
            detail="Google Play Store package ID ('google_id') must be provided for Android export."
        )

    if target_platform == "both" and not google_id and not apple_id:
        raise HTTPException(
            status_code=400,
            detail="At least one of 'google_id' or 'apple_id' must be provided."
        )

    clean_range = date_range.lower().strip()
    valid_ranges = (
        "7", "15", "30", "all",
        "7d", "15d", "30d",
        "last_7_days", "last_15_days", "last_30_days",
        "all_available"
    )
    if clean_range not in valid_ranges:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid date_range '{date_range}'. Must be '7', '15', '30', or 'all'."
        )

    try:
        excel_bytes, filename, stats = export_app_reviews(
            google_id=google_id,
            apple_id=apple_id,
            app_name=app_name,
            country=country,
            date_range=clean_range,
            platform=target_platform
        )
    except Exception as e:
        logger.error(f"Unexpected error during review export: {e}")
        raise HTTPException(status_code=500, detail="Unable to fetch reviews. Please try again.")

    if stats.get("all_failed"):
        raise HTTPException(
            status_code=502,
            detail="Unable to fetch reviews. Please try again."
        )

    if not excel_bytes or stats.get("total_count", 0) == 0:
        raise HTTPException(
            status_code=404,
            detail="No reviews found for the selected date range."
        )

    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "X-Platform": target_platform,
        "X-Total-Reviews": str(stats.get("total_count", 0)),
        "X-Google-Reviews": str(stats.get("google_count", 0)),
        "X-Apple-Reviews": str(stats.get("apple_count", 0)),
        "X-Google-Status": "failed" if stats.get("google_failed") else ("skipped" if target_platform == "ios" else "success"),
        "X-Apple-Status": "failed" if stats.get("apple_failed") else ("skipped" if target_platform == "android" else "success"),
        "X-Google-Error": stats.get("google_error") or "",
        "X-Apple-Error": stats.get("apple_error") or "",
        "Access-Control-Expose-Headers": "Content-Disposition, X-Platform, X-Total-Reviews, X-Google-Reviews, X-Apple-Reviews, X-Google-Status, X-Apple-Status, X-Google-Error, X-Apple-Error"
    }

    return Response(
        content=excel_bytes.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers
    )

@router.get("/reviews/report", response_model=ReviewsReportResponse)
def get_reviews_report(
    google_id: Optional[str] = Query(None, description="Google Play Store package ID"),
    apple_id: Optional[str] = Query(None, description="Apple App Store Track ID"),
    app_name: Optional[str] = Query(None, description="Application display name"),
    country: str = Query("in", min_length=2, max_length=5, description="Country storefront code"),
    date_range: str = Query("7", description="Date range: '7', '15', '30', or 'all'"),
    platform: str = Query("both", description="Platform selection: 'both', 'ios', or 'android'")
):
    """
    Returns structured customer reviews for the online spreadsheet viewer
    categorized into separate Android Reviews and iOS Reviews worksheets.
    """
    clean_platform = (platform or "both").lower().strip()
    if clean_platform in ("both", "all"):
        target_platform = "both"
    elif clean_platform in ("ios", "apple", "appstore"):
        target_platform = "ios"
    elif clean_platform in ("android", "google", "playstore"):
        target_platform = "android"
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid platform '{platform}'. Must be 'ios', 'android', or 'both'."
        )

    clean_range = date_range.lower().strip()
    valid_ranges = (
        "7", "15", "30", "all",
        "7d", "15d", "30d",
        "last_7_days", "last_15_days", "last_30_days",
        "all_available"
    )
    if clean_range not in valid_ranges:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid date_range '{date_range}'. Must be '7', '15', '30', or 'all'."
        )

    # Default to boAt Hearables if IDs are not explicitly supplied
    effective_google_id = google_id or "com.boAt.hearables"
    effective_apple_id = apple_id or "1592550875"

    report = generate_reviews_report(
        google_id=effective_google_id if target_platform in ("android", "both") else None,
        apple_id=effective_apple_id if target_platform in ("ios", "both") else None,
        app_name=app_name or "boAt Hearables",
        country=country,
        date_range=clean_range,
        platform=target_platform
    )
    return report

# --------------------------------------------------------------------------
# Temporary Online Excel Hosting & Microsoft Office Online Viewer Endpoints
# --------------------------------------------------------------------------
from backend.schemas.responses import (
    GeneratedReportItem,
    GenerateReportRequest,
)
from backend.services.temp_report_service import (
    get_report_file,
    list_active_reports,
)
from backend.services.dashboard import generate_and_host_report

@router.get("/reports/view/{token}/{filename}")
def view_temp_report(token: str, filename: str):
    """
    Publicly accessible endpoint for Microsoft Office Online Viewer to fetch
    the temporary Excel workbook without authentication.
    Available for a limited period (24 hours).
    """
    res = get_report_file(token=token, filename=filename)
    if not res:
        raise HTTPException(
            status_code=404,
            detail="Report not found or has expired (24-hour retention period)."
        )

    file_path, safe_filename = res
    headers = {
        "Content-Disposition": f'inline; filename="{safe_filename}"',
        "Cache-Control": "public, max-age=3600",
        "X-Report-Token": token,
    }
    return FileResponse(
        path=file_path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=safe_filename,
        headers=headers
    )

@router.post("/reports/generate", response_model=GeneratedReportItem)
def create_report(payload: GenerateReportRequest, request: Request):
    """
    Generates a genuine Microsoft Excel (.xlsx) workbook for boAt Hearables
    reviews and temporarily hosts it at an unguessable public URL for viewing
    in Microsoft's Excel Online Viewer.
    Requires NO Microsoft account login, Entra registration, or credentials.
    """
    clean_platform = payload.platform.lower().strip()
    if clean_platform not in ("both", "android", "ios"):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid platform '{payload.platform}'. Must be 'both', 'android', or 'ios'."
        )

    clean_range = payload.date_range.lower().strip()
    valid_ranges = ("7", "15", "30", "all", "7d", "15d", "30d", "all_available")
    if clean_range not in valid_ranges:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid date_range '{payload.date_range}'. Must be '7', '15', '30', or 'all'."
        )

    # Determine base URL from request headers (supports proxies/tunnels)
    forwarded_proto = request.headers.get("x-forwarded-proto", "")
    forwarded_host = request.headers.get("x-forwarded-host", "")

    if forwarded_proto and forwarded_host:
        base_url = f"{forwarded_proto}://{forwarded_host}"
    else:
        base_url = str(request.base_url).rstrip("/")

    try:
        report = generate_and_host_report(
            platform=clean_platform,
            date_range=clean_range,
            country=payload.country or "in",
            google_id=payload.google_id or "com.boAt.hearables",
            apple_id=payload.apple_id or "1592550875",
            app_name=payload.app_name or "boAt Hearables",
            base_url=base_url
        )
        return report
    except Exception as e:
        logger.error(f"[Report Gen] Error generating/hosting report: {e}")
        raise HTTPException(status_code=500, detail=f"Unable to generate Excel report: {str(e)}")

@router.get("/reports", response_model=List[GeneratedReportItem])
def list_reports(request: Request):
    """
    Returns active, unexpired temporary reports.
    """
    base_url = str(request.base_url).rstrip("/")
    items = list_active_reports(base_url=base_url)
    return [GeneratedReportItem(**item) for item in items]



