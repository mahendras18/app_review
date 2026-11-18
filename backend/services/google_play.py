import logging
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import parse_qs, urlparse

from google_play_scraper import Sort, app as gp_app, reviews as gp_reviews, search as gp_search
from google_play_scraper.constants.element import ElementSpecs
from google_play_scraper.constants.regex import Regex
from google_play_scraper.constants.request import Formats
from google_play_scraper.exceptions import NotFoundError, ExtraHTTPError
from google_play_scraper.utils.request import get

from backend.schemas.responses import AppSummary, ReviewItem, SearchResultItem
from backend.services.date_utils import normalize_to_utc, parse_date_range

logger = logging.getLogger(__name__)

def extract_google_play_id(input_str: str) -> str:
    """
    Extracts the package ID from a Google Play Store URL or raw package name.
    e.g. 'https://play.google.com/store/apps/details?id=com.boAt.hearables' -> 'com.boAt.hearables'
    """
    input_str = input_str.strip()
    if "play.google.com" in input_str:
        parsed = urlparse(input_str)
        params = parse_qs(parsed.query)
        if "id" in params and params["id"]:
            return params["id"][0]
    return input_str

def _extract_top_app_id_fallback(query: str, lang: str = "en", country: str = "in") -> Optional[str]:
    """
    Helper to extract the appId of the top search result if google-play-scraper misses it.
    """
    try:
        from urllib.parse import quote
        import json
        url = Formats.Searchresults.build(query=quote(query), lang=lang, country=country)
        dom = get(url)
        matches = Regex.SCRIPT.findall(dom)
        dataset = {}
        for match in matches:
            km = Regex.KEY.findall(match)
            vm = Regex.VALUE.findall(match)
            if km and vm:
                dataset[km[0]] = json.loads(vm[0])
        tr = dataset.get("ds:4", [[]])[0][1][0][23][16]
        if len(tr) > 3 and isinstance(tr[3], dict):
            for v in tr[3].values():
                if isinstance(v, list) and v and isinstance(v[0], list) and v[0]:
                    candidate = v[0][0]
                    if isinstance(candidate, str) and "." in candidate:
                        return candidate
    except Exception as e:
        logger.debug(f"Top result fallback extraction failed: {e}")
    return None

def fetch_google_play_summary(app_id: str, country: str = "in") -> AppSummary:
    """
    Fetches Google Play Store app metadata and overall ratings.
    """
    clean_id = extract_google_play_id(app_id)
    now_iso = datetime.now().isoformat()

    try:
        data = gp_app(clean_id, lang="en", country=country)
        return AppSummary(
            platform="google",
            app_id=clean_id,
            title=data.get("title") or "Unavailable",
            developer=data.get("developer"),
            icon=data.get("icon"),
            score=round(data.get("score"), 2) if data.get("score") is not None else None,
            ratings_count=data.get("ratings"),
            reviews_count=data.get("reviews"),
            reviews_fetched=0,
            url=data.get("url") or f"https://play.google.com/store/apps/details?id={clean_id}",
            country=country,
            last_updated=now_iso,
            error=None
        )
    except NotFoundError:
        logger.warning(f"Google Play app not found: {clean_id}")
        return AppSummary(
            platform="google",
            app_id=clean_id,
            title=None,
            country=country,
            last_updated=now_iso,
            error=f"App with identifier '{clean_id}' was not found on Google Play Store."
        )
    except Exception as e:
        logger.error(f"Error fetching Google Play app {clean_id}: {e}")
        return AppSummary(
            platform="google",
            app_id=clean_id,
            title=None,
            country=country,
            last_updated=now_iso,
            error=f"Failed to fetch Google Play data: {str(e)}"
        )

def fetch_google_play_reviews(
    app_id: str,
    country: str = "in",
    count: int = 30,
    sort_order: str = "newest"
) -> Tuple[List[ReviewItem], Optional[str]]:
    """
    Fetches recent reviews from Google Play Store.
    Returns (reviews, error_message).
    """
    clean_id = extract_google_play_id(app_id)
    sort_enum = Sort.NEWEST if sort_order.lower() == "newest" else Sort.OLDEST

    try:
        # clamp count between 1 and 100
        count = max(1, min(count, 100))
        result, _ = gp_reviews(
            clean_id,
            lang="en",
            country=country,
            sort=sort_enum,
            count=count
        )

        review_items: List[ReviewItem] = []
        for r in result:
            dt = r.get("at")
            date_str = dt.isoformat() if isinstance(dt, datetime) else str(dt) if dt else None
            
            review_items.append(ReviewItem(
                id=str(r.get("reviewId", "")),
                platform="google",
                rating=float(r.get("score", 0)),
                title=None,  # Google Play reviews do not have titles
                text=r.get("content") or "",
                date=date_str,
                version=r.get("reviewCreatedVersion"),
                reviewer_name=r.get("userName")
            ))

        return review_items, None
    except NotFoundError:
        return [], f"App '{clean_id}' was not found on Google Play Store."
    except Exception as e:
        logger.error(f"Error fetching Google Play reviews for {clean_id}: {e}")
        return [], f"Failed to retrieve Google Play reviews: {str(e)}"

def fetch_google_play_reviews_by_date(
    app_id: str,
    country: str = "in",
    days: Optional[int] = None,
    max_total: int = 100_000,
    max_pages: int = 500,
) -> Tuple[List[ReviewItem], Optional[str]]:
    """
    Fetches customer reviews from Google Play Store filtered by review creation date.
    Uses pagination with continuation tokens.

    - If `days` is set (e.g. 7, 15, 30): only reviews within that window are returned;
      pagination stops early when 5 consecutive reviews fall outside the cutoff.
    - If `days` is None (All Available): fetches all pages until the API returns no more
      reviews or no continuation token; `max_total` and `max_pages` act as safety caps only.

    Returns (reviews, error_message).
    """
    from datetime import timezone, timedelta

    clean_id = extract_google_play_id(app_id)
    cutoff = datetime.now(timezone.utc) - timedelta(days=days) if days is not None else None
    fetch_all = days is None

    collected_reviews: List[ReviewItem] = []
    seen_ids: set = set()
    continuation_token = None
    batch_size = 100
    consecutive_older = 0
    page_num = 0
    stop_reason = "unknown"

    logger.info(
        f"[GooglePlay] Starting review fetch | app={clean_id} | "
        f"days={days!r} | fetch_all={fetch_all} | "
        f"max_total={max_total} | max_pages={max_pages}"
    )

    try:
        while True:
            page_num += 1

            result, continuation_token = gp_reviews(
                clean_id,
                lang="en",
                country=country,
                sort=Sort.NEWEST,
                count=batch_size,
                continuation_token=continuation_token,
            )

            batch_dates = []
            stop_pagination = False
            added_in_batch = 0

            if not result:
                stop_reason = "empty_result"
                logger.info(
                    f"[GooglePlay] Page {page_num:4d} | batch=0 | total={len(collected_reviews)} | "
                    f"stop=empty_result"
                )
                break

            for r in result:
                dt_val = r.get("at")
                dt_utc = normalize_to_utc(dt_val)

                # Date-window filtering (only when days is set)
                if cutoff is not None and dt_utc is not None:
                    if dt_utc < cutoff:
                        consecutive_older += 1
                        if consecutive_older >= 5:
                            stop_pagination = True
                            stop_reason = "date_cutoff_reached"
                            break
                        continue
                    else:
                        consecutive_older = 0  # reset on in-range review

                # Duplicate guard
                rid = str(r.get("reviewId", "")).strip()
                if rid and rid in seen_ids:
                    continue
                if rid:
                    seen_ids.add(rid)

                date_str = (
                    dt_val.isoformat()
                    if isinstance(dt_val, datetime)
                    else str(dt_val) if dt_val else None
                )
                if date_str:
                    batch_dates.append(date_str)

                collected_reviews.append(
                    ReviewItem(
                        id=rid or None,
                        platform="google",
                        rating=float(r.get("score", 0)),
                        title=None,
                        text=r.get("content") or "",
                        date=date_str,
                        version=r.get("reviewCreatedVersion"),
                        reviewer_name=r.get("userName"),
                    )
                )
                added_in_batch += 1

                # Safety cap: prevent runaway loops
                if len(collected_reviews) >= max_total:
                    stop_pagination = True
                    stop_reason = "max_total_reached"
                    break

            # Per-page log
            all_dates = [
                r.date for r in collected_reviews if r.date
            ]
            oldest_date = min(all_dates) if all_dates else "N/A"
            newest_date = max(all_dates) if all_dates else "N/A"
            has_token = bool(continuation_token and continuation_token.token)
            logger.info(
                f"[GooglePlay] Page {page_num:4d} | batch={added_in_batch:4d} | "
                f"total={len(collected_reviews):6d} | oldest={oldest_date} | "
                f"newest={newest_date} | has_next={has_token}"
            )

            if stop_pagination:
                break

            # No more pages
            if not continuation_token or continuation_token.token is None:
                stop_reason = "no_continuation_token"
                break

            # Safety page cap
            if page_num >= max_pages:
                stop_reason = "max_pages_reached"
                logger.warning(
                    f"[GooglePlay] Safety page cap hit ({max_pages} pages). "
                    f"Stopping with {len(collected_reviews)} reviews."
                )
                break

        logger.info(
            f"[GooglePlay] Pagination complete | stop_reason={stop_reason} | "
            f"total_pages={page_num} | total_reviews={len(collected_reviews)} | "
            f"unique_ids={len(seen_ids)}"
        )
        return collected_reviews, None

    except NotFoundError:
        return [], f"App '{clean_id}' was not found on Google Play Store."
    except Exception as e:
        logger.error(f"[GooglePlay] Error fetching reviews by date for {clean_id}: {e}")
        if collected_reviews:
            logger.info(
                f"[GooglePlay] Returning {len(collected_reviews)} reviews collected before error."
            )
            return collected_reviews, None
        return [], f"Failed to retrieve Google Play reviews: {str(e)}"


def search_google_play_apps(query: str, country: str = "in", limit: int = 10) -> List[SearchResultItem]:
    """
    Searches for apps on Google Play Store.
    """
    query = query.strip()
    if not query:
        return []

    # If the user passed a URL or package name directly
    extracted_id = extract_google_play_id(query)
    if "." in extracted_id and " " not in extracted_id:
        try:
            summary = fetch_google_play_summary(extracted_id, country=country)
            if not summary.error and summary.title:
                return [SearchResultItem(
                    app_id=extracted_id,
                    platform="google",
                    title=summary.title,
                    developer=summary.developer,
                    icon=summary.icon,
                    score=summary.score,
                    url=summary.url
                )]
        except Exception:
            pass

    try:
        raw_results = gp_search(query, lang="en", country=country, n_hits=limit)
        results: List[SearchResultItem] = []

        top_id_fallback = None
        for i, r in enumerate(raw_results):
            app_id = r.get("appId")
            if not app_id and i == 0:
                # Top result sometimes has appId=None in newer html layouts
                if not top_id_fallback:
                    top_id_fallback = _extract_top_app_id_fallback(query, lang="en", country=country)
                app_id = top_id_fallback

            if app_id:
                results.append(SearchResultItem(
                    app_id=app_id,
                    platform="google",
                    title=r.get("title") or "Unknown",
                    developer=r.get("developer"),
                    icon=r.get("icon"),
                    score=round(r.get("score"), 2) if r.get("score") is not None else None,
                    url=f"https://play.google.com/store/apps/details?id={app_id}"
                ))

        return results
    except Exception as e:
        logger.error(f"Google Play search error for '{query}': {e}")
        return []
