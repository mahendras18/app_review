export type Platform = 'google' | 'apple';
export type PlatformFilter = 'all' | 'google' | 'apple';
export type SortOrder = 'newest' | 'oldest';

export type PlatformReportOption = 'both' | 'ios' | 'android';
export type PlatformExportOption = PlatformReportOption; // Backward compatibility alias

export interface PlatformReportConfig {
  value: PlatformReportOption;
  label: string;
  description: string;
}
export type PlatformExportConfig = PlatformReportConfig;

export const PLATFORM_REPORT_OPTIONS: PlatformReportConfig[] = [
  { value: 'both', label: 'Both iOS and Android', description: 'Sheet 1: Android Reviews • Sheet 2: iOS Reviews' },
  { value: 'android', label: 'Android (Google Play Store)', description: 'Worksheet: Android Reviews' },
  { value: 'ios', label: 'iOS (Apple App Store)', description: 'Worksheet: iOS Reviews' },
];
export const PLATFORM_EXPORT_OPTIONS = PLATFORM_REPORT_OPTIONS;

export type DateRangeOption = '7' | '15' | '30' | 'all';

export interface DateRangeConfig {
  value: DateRangeOption;
  label: string;
  description: string;
}

export const DATE_RANGE_OPTIONS: DateRangeConfig[] = [
  { value: '7', label: 'Last 7 Days', description: 'Reviews created in the last 7 days' },
  { value: '15', label: 'Last 15 Days', description: 'Reviews created in the last 15 days' },
  { value: '30', label: 'Last 30 Days', description: 'Reviews created in the last 30 days' },
  { value: 'all', label: 'All Available Reviews', description: 'Maximum accessible reviews from store feeds' },
];

export interface GeneratedReportItem {
  id: string;
  filename: string;
  name: string;
  platform: string;
  date_range: string;
  generated_at: string;
  expires_at: string;
  total_count: number;
  android_count: number;
  ios_count: number;
  file_url: string;
  viewer_url: string;
  web_url: string;
  is_public: boolean;
  is_localhost: boolean;
  app_name: string;
  reviews?: ReviewItem[];
  android_reviews?: ReviewItem[];
  ios_reviews?: ReviewItem[];
}

export interface GenerateReportPayload {
  platform: PlatformReportOption;
  date_range: DateRangeOption;
  country?: string;
  google_id?: string;
  apple_id?: string;
  app_name?: string;
}

export interface ReportNotification {
  type: 'success' | 'info' | 'error';
  message: string;
  totalReviews?: number;
  androidReviews?: number;
  iosReviews?: number;
}
export type ExportNotification = ReportNotification;

export interface ReviewReportItem {
  id?: string | null;
  platform: string; // "Google Play" | "Apple App Store"
  app_name: string;
  rating: number;
  sentiment: 'Positive' | 'Neutral' | 'Negative' | string;
  title?: string | null;
  text: string;
  date?: string | null;
  version?: string | null;
  reviewer_name?: string | null;
}

export interface ReviewsReportResponse {
  platform: 'both' | 'ios' | 'android';
  app_name: string;
  date_range: string;
  country: string;
  total_count: number;
  android_count: number;
  ios_count: number;
  android_reviews: ReviewReportItem[];
  ios_reviews: ReviewReportItem[];
  errors: {
    google?: string | null;
    apple?: string | null;
  };
}

export interface ReviewItem {
  id?: string;
  platform: Platform;
  rating: number;
  sentiment?: 'Positive' | 'Neutral' | 'Negative' | string;
  title?: string | null;
  text: string;
  date?: string | null;
  version?: string | null;
  reviewer_name?: string | null;
}

export interface AppSummary {
  platform: Platform;
  app_id: string;
  title?: string | null;
  developer?: string | null;
  icon?: string | null;
  score?: number | null;
  ratings_count?: number | null;
  reviews_count?: number | null;
  reviews_fetched: number;
  url?: string | null;
  country: string;
  last_updated: string;
  error?: string | null;
}

export interface RatingComparison {
  google_score?: number | null;
  apple_score?: number | null;
  score_difference?: number | null;
  google_ratings_count?: number | null;
  apple_ratings_count?: number | null;
  has_both: boolean;
  details?: string | null;
}

export interface SingleDashboardResponse {
  summary: AppSummary;
  reviews: ReviewItem[];
  reviews_fetched: number;
}

export interface UnifiedDashboardResponse {
  google_summary?: AppSummary | null;
  apple_summary?: AppSummary | null;
  reviews: ReviewItem[];
  rating_comparison?: RatingComparison | null;
  country: string;
  timestamp: string;
}

export interface SearchResultItem {
  app_id: string;
  platform: Platform;
  title: string;
  developer?: string | null;
  icon?: string | null;
  score?: number | null;
  url?: string | null;
}

export interface SearchResponse {
  query: string;
  platform: string;
  country: string;
  count: number;
  results: SearchResultItem[];
}

export interface AppConfig {
  name: string;
  googleAppId: string;
  appleAppId: string;
  country: string;
}

export interface CountryOption {
  code: string;
  name: string;
  flag: string;
}

export const COUNTRIES: CountryOption[] = [
  { code: 'in', name: 'India', flag: '🇮🇳' },
  { code: 'us', name: 'United States', flag: '🇺🇸' },
  { code: 'gb', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'ca', name: 'Canada', flag: '🇨🇦' },
  { code: 'de', name: 'Germany', flag: '🇩🇪' },
  { code: 'au', name: 'Australia', flag: '🇦🇺' },
  { code: 'jp', name: 'Japan', flag: '🇯🇵' },
  { code: 'fr', name: 'France', flag: '🇫🇷' },
  { code: 'br', name: 'Brazil', flag: '🇧🇷' },
  { code: 'sg', name: 'Singapore', flag: '🇸🇬' },
];

export const PRESET_APPS: AppConfig[] = [
  {
    name: 'boAt Hearables',
    googleAppId: 'com.boAt.hearables',
    appleAppId: '1592550875',
    country: 'in',
  },
];
