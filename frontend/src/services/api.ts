import {
  AppSummary,
  ReviewItem,
  SearchResponse,
  SingleDashboardResponse,
  UnifiedDashboardResponse,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        ...(options?.headers || {}),
      },
    });

    if (!response.ok) {
      let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
      try {
        const errorJson = await response.json();
        if (errorJson.detail) {
          errorMsg = errorJson.detail;
        }
      } catch {
        // ignore json parse errors
      }
      throw new ApiError(errorMsg, response.status);
    }

    return await response.json();
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(err.message || 'Network request failed', 0);
  }
}

export const api = {
  checkHealth: async () => {
    return request<{ status: string; timestamp: string; version: string }>('/health');
  },

  searchApps: async (query: string, platform: string = 'both', country: string = 'in'): Promise<SearchResponse> => {
    const params = new URLSearchParams({
      query,
      platform,
      country,
    });
    return request<SearchResponse>(`/apps/search?${params.toString()}`);
  },

  getAppSummary: async (appId: string, platform: 'google' | 'apple', country: string = 'in'): Promise<AppSummary> => {
    const params = new URLSearchParams({
      platform,
      country,
    });
    return request<AppSummary>(`/apps/${encodeURIComponent(appId)}/summary?${params.toString()}`);
  },

  getAppReviews: async (
    appId: string,
    platform: 'google' | 'apple',
    country: string = 'in',
    count: number = 30,
    sort: 'newest' | 'oldest' = 'newest'
  ): Promise<{ reviews: ReviewItem[]; count: number }> => {
    const params = new URLSearchParams({
      platform,
      country,
      count: count.toString(),
      sort,
    });
    return request<{ reviews: ReviewItem[]; count: number }>(`/apps/${encodeURIComponent(appId)}/reviews?${params.toString()}`);
  },

  getUnifiedDashboard: async (
    googleId?: string,
    appleId?: string,
    country: string = 'in',
    count: number = 30,
    sort: 'newest' | 'oldest' = 'newest'
  ): Promise<UnifiedDashboardResponse> => {
    const params = new URLSearchParams();
    if (googleId) params.append('google_id', googleId);
    if (appleId) params.append('apple_id', appleId);
    params.append('country', country);
    params.append('count', count.toString());
    params.append('sort', sort);

    return request<UnifiedDashboardResponse>(`/dashboard/unified?${params.toString()}`);
  },
};
