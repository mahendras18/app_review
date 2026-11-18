from typing import List, Optional
from pydantic import BaseModel, Field

class ReviewItem(BaseModel):
    id: Optional[str] = None
    platform: str  # "google" | "apple"
    rating: float
    title: Optional[str] = None
    text: str
    date: Optional[str] = None
    version: Optional[str] = None
    reviewer_name: Optional[str] = None

class AppSummary(BaseModel):
    platform: str  # "google" | "apple"
    app_id: str
    title: Optional[str] = None
    developer: Optional[str] = None
    icon: Optional[str] = None
    score: Optional[float] = None
    ratings_count: Optional[int] = None
    reviews_count: Optional[int] = None  # written reviews count (available on Google Play)
    reviews_fetched: int = 0
    url: Optional[str] = None
    country: str = "in"
    last_updated: str
    error: Optional[str] = None

class SearchResultItem(BaseModel):
    app_id: str
    platform: str
    title: str
    developer: Optional[str] = None
    icon: Optional[str] = None
    score: Optional[float] = None
    url: Optional[str] = None

class SearchResponse(BaseModel):
    query: str
    platform: str
    country: str
    count: int
    results: List[SearchResultItem]

class ReviewsResponse(BaseModel):
    platform: str
    app_id: str
    country: str
    count: int
    reviews: List[ReviewItem]

class RatingComparison(BaseModel):
    google_score: Optional[float] = None
    apple_score: Optional[float] = None
    score_difference: Optional[float] = None
    google_ratings_count: Optional[int] = None
    apple_ratings_count: Optional[int] = None
    has_both: bool = False
    details: Optional[str] = None

class SingleDashboardResponse(BaseModel):
    summary: AppSummary
    reviews: List[ReviewItem]
    reviews_fetched: int

class UnifiedDashboardResponse(BaseModel):
    google_summary: Optional[AppSummary] = None
    apple_summary: Optional[AppSummary] = None
    reviews: List[ReviewItem]
    rating_comparison: Optional[RatingComparison] = None
    country: str
    timestamp: str

class ReviewReportItem(BaseModel):
    id: Optional[str] = None
    platform: str  # "Google Play" | "Apple App Store"
    app_name: str
    rating: float
    sentiment: str  # "Positive" | "Neutral" | "Negative"
    title: Optional[str] = None
    text: str
    date: Optional[str] = None
    version: Optional[str] = None
    reviewer_name: Optional[str] = None

class ReviewsReportResponse(BaseModel):
    platform: str  # "both" | "android" | "ios"
    app_name: str
    date_range: str
    country: str
    total_count: int
    android_count: int
    ios_count: int
    android_reviews: List[ReviewReportItem] = Field(default_factory=list)
    ios_reviews: List[ReviewReportItem] = Field(default_factory=list)
    errors: dict = Field(default_factory=dict)

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: str = "1.0.0"

class GeneratedReportItem(BaseModel):
    id: str
    filename: str
    name: str
    platform: str
    date_range: str
    generated_at: str
    expires_at: str
    total_count: int
    android_count: int
    ios_count: int
    file_url: str
    viewer_url: str
    web_url: str
    is_public: bool = True
    is_localhost: bool = False
    app_name: str = "boAt Hearables"

class GenerateReportRequest(BaseModel):
    platform: str = "both"
    date_range: str = "7"
    country: str = "in"
    google_id: Optional[str] = "com.boAt.hearables"
    apple_id: Optional[str] = "1592550875"
    app_name: Optional[str] = "boAt Hearables"
