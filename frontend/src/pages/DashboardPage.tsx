import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Navbar } from '../components/Navbar';
import { NavigationTab, Sidebar } from '../components/Sidebar';
import { StoreCard } from '../components/StoreCard';
import { RatingComparison } from '../components/RatingComparison';
import { RatingDistributionChart } from '../components/RatingDistributionChart';
import { FilterBar } from '../components/FilterBar';
import { RecentReviews } from '../components/RecentReviews';
import { AppSelectorModal } from '../components/AppSelectorModal';
import { SettingsView } from '../components/SettingsView';
import { ToastContainer, ToastMessage } from '../components/Toast';
import {
  AppConfig,
  PlatformFilter,
  PRESET_APPS,
  ReviewItem,
  UnifiedDashboardResponse,
} from '../types';
import { api } from '../services/api';
import { AlertCircle, RefreshCw } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  // Application target config (boAt Hearables default)
  const [appConfig, setAppConfig] = useState<AppConfig>(PRESET_APPS[0]);
  const [activeTab, setActiveTab] = useState<NavigationTab>('overview');

  // Dashboard Data State
  const [dashboardData, setDashboardData] = useState<UnifiedDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Modal & Toast States
  const [isAppSelectorOpen, setIsAppSelectorOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [starFilter, setStarFilter] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d' | '90d'>('all');

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Check backend health
  const checkHealth = useCallback(async () => {
    try {
      await api.checkHealth();
      setBackendOnline(true);
    } catch {
      setBackendOnline(false);
    }
  }, []);

  // Fetch Dashboard Data
  const loadDashboard = useCallback(
    async (showToast = false) => {
      setIsLoading(true);
      setGeneralError(null);
      try {
        const data = await api.getUnifiedDashboard(
          appConfig.googleAppId || undefined,
          appConfig.appleAppId || undefined,
          appConfig.country,
          30,
          'newest'
        );
        setDashboardData(data);
        setBackendOnline(true);

        if (showToast) {
          const fetchedCount = data.reviews.length;
          addToast(
            'success',
            `Refreshed ${appConfig.name} data! Retrieved ${fetchedCount} reviews across stores.`
          );
        }
      } catch (err: any) {
        setGeneralError(err.message || 'Failed to connect to backend server.');
        setBackendOnline(false);
        addToast('error', `Failed to fetch data: ${err.message || 'Unknown network error'}`);
      } finally {
        setIsLoading(false);
      }
    },
    [appConfig]
  );

  useEffect(() => {
    checkHealth();
    loadDashboard();
  }, [loadDashboard, checkHealth]);

  // Filter and sort reviews
  const filteredReviews = useMemo(() => {
    if (!dashboardData?.reviews) return [];

    let list = [...dashboardData.reviews];

    // Platform filter
    if (platformFilter !== 'all') {
      list = list.filter((r) => r.platform === platformFilter);
    }

    // Star filter
    if (starFilter !== null) {
      list = list.filter((r) => Math.round(r.rating) === starFilter);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          r.text.toLowerCase().includes(q) ||
          (r.title && r.title.toLowerCase().includes(q)) ||
          (r.reviewer_name && r.reviewer_name.toLowerCase().includes(q))
      );
    }

    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date().getTime();
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const cutoff = now - days * 24 * 60 * 60 * 1000;

      list = list.filter((r) => {
        if (!r.date) return true;
        const d = new Date(r.date).getTime();
        return isNaN(d) || d >= cutoff;
      });
    }

    // Sorting
    list.sort((a, b) => {
      if (sortOrder === 'newest') {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      } else if (sortOrder === 'oldest') {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateA - dateB;
      } else if (sortOrder === 'highest') {
        return b.rating - a.rating;
      } else if (sortOrder === 'lowest') {
        return a.rating - b.rating;
      }
      return 0;
    });

    return list;
  }, [dashboardData?.reviews, platformFilter, starFilter, searchQuery, dateRange, sortOrder]);

  const platformSpecificError = useMemo(() => {
    if (platformFilter === 'apple') {
      return dashboardData?.apple_summary?.error || null;
    }
    if (platformFilter === 'google') {
      return dashboardData?.google_summary?.error || null;
    }
    if (platformFilter === 'all') {
      if (dashboardData?.google_summary?.error && dashboardData?.apple_summary?.error) {
        return `Google Play: ${dashboardData.google_summary.error} | App Store: ${dashboardData.apple_summary.error}`;
      }
    }
    return null;
  }, [platformFilter, dashboardData]);

  const storeWarning = useMemo(() => {
    if (platformFilter === 'all') {
      if (dashboardData?.apple_summary?.error && !dashboardData?.google_summary?.error) {
        return `Apple App Store review feed unavailable: ${dashboardData.apple_summary.error}. Showing Google Play reviews only.`;
      }
      if (dashboardData?.google_summary?.error && !dashboardData?.apple_summary?.error) {
        return `Google Play Store review feed unavailable: ${dashboardData.google_summary.error}. Showing Apple App Store reviews only.`;
      }
    }
    return null;
  }, [platformFilter, dashboardData]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setPlatformFilter('all');
    setStarFilter(null);
    setSortOrder('newest');
    setDateRange('all');
  };

  const handleAppConfigChange = (newConfig: AppConfig) => {
    setAppConfig(newConfig);
    addToast('info', `Switched app to ${newConfig.name}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation */}
      <Navbar
        appConfig={appConfig}
        onOpenAppSelector={() => setIsAppSelectorOpen(true)}
        onSelectPreset={handleAppConfigChange}
        onRefresh={() => loadDashboard(true)}
        isLoading={isLoading}
        lastUpdated={dashboardData?.timestamp}
      />

      {/* Main Layout Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          appConfig={appConfig}
          backendOnline={backendOnline}
          reviewsCount={dashboardData?.reviews.length || 0}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 overflow-y-auto">
          {/* General Connection Error Banner */}
          {generalError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-rose-900 shadow-xs">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                <div>
                  <strong>Backend Connection Error:</strong> {generalError}. Ensure the Python FastAPI server is running on port 8000.
                </div>
              </div>
              <button
                onClick={() => loadDashboard(true)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold flex items-center space-x-1 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-fade-in">
              {/* Platform Summary Cards Section */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Storefront Overviews
                    </h2>
                    <p className="text-xs text-slate-500">
                      Live store metrics and official rating statistics for {appConfig.name}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Google Play Store Card */}
                  <StoreCard
                    platform="google"
                    summary={dashboardData?.google_summary}
                    isLoading={isLoading}
                    onRetry={() => loadDashboard(true)}
                  />

                  {/* Apple App Store Card */}
                  <StoreCard
                    platform="apple"
                    summary={dashboardData?.apple_summary}
                    isLoading={isLoading}
                    onRetry={() => loadDashboard(true)}
                  />
                </div>
              </section>

              {/* Rating Comparison Section */}
              <section>
                <RatingComparison
                  comparison={dashboardData?.rating_comparison}
                  googleSummary={dashboardData?.google_summary}
                  appleSummary={dashboardData?.apple_summary}
                  country={appConfig.country}
                />
              </section>

              {/* Rating Distribution Breakdown */}
              {dashboardData?.reviews && dashboardData.reviews.length > 0 && (
                <section>
                  <RatingDistributionChart reviews={dashboardData.reviews} />
                </section>
              )}

              {/* Quick Preview of Recent Reviews */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Latest User Reviews
                    </h2>
                    <p className="text-xs text-slate-500">
                      Most recent user feedback across both stores
                    </p>
                  </div>

                  <button
                    onClick={() => setActiveTab('reviews')}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                  >
                    View All & Filter →
                  </button>
                </div>

                <RecentReviews
                  reviews={filteredReviews.slice(0, 5)}
                  isLoading={isLoading}
                  error={null}
                  onRefresh={() => loadDashboard(true)}
                  platformFilter="all"
                  storeWarning={storeWarning}
                />
              </section>
            </div>
          )}

          {/* TAB 2: RECENT REVIEWS */}
          {activeTab === 'reviews' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Recent User Reviews</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Chronological review feed from Google Play and Apple App Store
                </p>
              </div>

              {/* Filter & Sort Controls */}
              <FilterBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                platformFilter={platformFilter}
                onPlatformChange={setPlatformFilter}
                starFilter={starFilter}
                onStarChange={setStarFilter}
                sortOrder={sortOrder}
                onSortChange={setSortOrder}
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                onResetFilters={handleResetFilters}
                totalCount={dashboardData?.reviews.length || 0}
                filteredCount={filteredReviews.length}
              />

              {/* Reviews List */}
              <RecentReviews
                reviews={filteredReviews}
                isLoading={isLoading}
                error={platformSpecificError}
                onRefresh={() => loadDashboard(true)}
                platformFilter={platformFilter}
                storeWarning={storeWarning}
              />
            </div>
          )}

          {/* TAB 3: PLATFORM COMPARISON */}
          {activeTab === 'comparison' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Platform Comparison</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Cross-platform analysis comparing rating volume, distribution, and overall score differences
                </p>
              </div>

              <RatingComparison
                comparison={dashboardData?.rating_comparison}
                googleSummary={dashboardData?.google_summary}
                appleSummary={dashboardData?.apple_summary}
                country={appConfig.country}
              />

              {dashboardData?.reviews && (
                <RatingDistributionChart reviews={dashboardData.reviews} />
              )}
            </div>
          )}

          {/* TAB 4: APP CONFIGURATION & SETTINGS */}
          {activeTab === 'settings' && (
            <div className="animate-fade-in">
              <SettingsView
                appConfig={appConfig}
                onOpenAppSelector={() => setIsAppSelectorOpen(true)}
                backendOnline={backendOnline}
                onRefresh={() => loadDashboard(true)}
                isLoading={isLoading}
              />
            </div>
          )}
        </main>
      </div>

      {/* App Selector & Search Modal */}
      <AppSelectorModal
        isOpen={isAppSelectorOpen}
        onClose={() => setIsAppSelectorOpen(false)}
        currentConfig={appConfig}
        onSaveConfig={handleAppConfigChange}
      />

      {/* Floating Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};
