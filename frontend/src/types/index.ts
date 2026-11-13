export type Platform = 'google' | 'apple';
export type PlatformFilter = 'all' | 'google' | 'apple';
export type SortOrder = 'newest' | 'oldest';

export interface ReviewItem {
  id?: string;
  platform: Platform;
  rating: number;
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
  {
    name: 'Spotify',
    googleAppId: 'com.spotify.music',
    appleAppId: '324684580',
    country: 'us',
  },
  {
    name: 'WhatsApp',
    googleAppId: 'com.whatsapp',
    appleAppId: '310633997',
    country: 'in',
  },
  {
    name: 'Duolingo',
    googleAppId: 'com.duolingo',
    appleAppId: '570060128',
    country: 'us',
  },
  {
    name: 'Netflix',
    googleAppId: 'com.netflix.mediaclient',
    appleAppId: '363590051',
    country: 'us',
  },
];
