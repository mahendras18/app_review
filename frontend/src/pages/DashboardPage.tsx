import React, { useEffect, useState, useCallback } from 'react';
import { Navbar } from '../components/Navbar';
import { NavigationTab, Sidebar } from '../components/Sidebar';
import { StoreCard } from '../components/StoreCard';
import { RatingComparison } from '../components/RatingComparison';
import { ExcelReportCard } from '../components/ExcelReportCard';
import { AppSelectorModal } from '../components/AppSelectorModal';
import { SettingsView } from '../components/SettingsView';
import { ToastContainer, ToastMessage } from '../components/Toast';
import {
  AppConfig,
  PRESET_APPS,
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

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5500);
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

  // Fetch Dashboard Summary Data (count: 0 to avoid fetching reviews on dashboard load)
  const loadDashboard = useCallback(
    async (showToast = false) => {
      setIsLoading(true);
      setGeneralError(null);
      try {
        const data = await api.getUnifiedDashboard(
          appConfig.googleAppId || undefined,
          appConfig.appleAppId || undefined,
          appConfig.country,
          0 // Zero reviews on initial dashboard load
        );
        setDashboardData(data);
        setBackendOnline(true);

        if (showToast) {
          addToast(
            'success',
            `Refreshed ${appConfig.name} store metrics successfully!`
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

              {/* Excel Report Section */}
              <section className="space-y-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Generate Review Report
                  </h2>
                  <p className="text-xs text-slate-500">
                    Generate a genuine Excel (.xlsx) report for {appConfig.name} and open it directly in Microsoft Excel for the web
                  </p>
                </div>

                <ExcelReportCard
                  appConfig={appConfig}
                  onToast={addToast}
                />
              </section>
            </div>
          )}

          {/* TAB 2: EXCEL REPORTS */}
          {activeTab === 'export' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Generate Excel Report</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Generate customer review reports for {appConfig.name} and open directly in Microsoft Excel for the web
                </p>
              </div>

              <ExcelReportCard
                appConfig={appConfig}
                onToast={addToast}
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
