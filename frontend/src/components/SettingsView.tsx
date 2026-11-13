import React from 'react';
import {
  Settings,
  Server,
  Database,
  Shield,
  FileCode,
  ExternalLink,
  Smartphone,
  Globe,
  RefreshCw,
} from 'lucide-react';
import { AppConfig, COUNTRIES } from '../types';

interface SettingsViewProps {
  appConfig: AppConfig;
  onOpenAppSelector: () => void;
  backendOnline: boolean;
  onRefresh: () => void;
  isLoading: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  appConfig,
  onOpenAppSelector,
  backendOnline,
  onRefresh,
  isLoading,
}) => {
  const currentCountry = COUNTRIES.find((c) => c.code === appConfig.country);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Application Configuration</h2>
        <p className="text-xs text-slate-500 mt-1">
          Review application parameters, scraping endpoints, and backend connectivity.
        </p>
      </div>

      {/* Target App Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">{appConfig.name}</h3>
              <p className="text-xs text-slate-500">
                Active application targeted for review and rating collection
              </p>
            </div>
          </div>

          <button
            onClick={onOpenAppSelector}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            Switch Target App
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-slate-400 text-[11px] mb-1">Google Play Package</div>
            <div className="font-mono font-semibold text-slate-800 truncate" title={appConfig.googleAppId}>
              {appConfig.googleAppId || 'Not Configured'}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-slate-400 text-[11px] mb-1">Apple App Store ID</div>
            <div className="font-mono font-semibold text-slate-800 truncate" title={appConfig.appleAppId}>
              {appConfig.appleAppId || 'Not Configured'}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-slate-400 text-[11px] mb-1">Storefront Country</div>
            <div className="font-semibold text-slate-800">
              {currentCountry?.flag} {currentCountry?.name} ({appConfig.country.toUpperCase()})
            </div>
          </div>
        </div>
      </div>

      {/* Backend & Scraping Architecture Info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Backend & Scraping Service</h3>
            <p className="text-xs text-slate-500">
              FastAPI Python backend with modular provider services
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <div className="font-bold text-slate-800 flex items-center justify-between">
              <span>Google Play Provider</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-mono">
                google-play-scraper
              </span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Fetches app metadata, rating scores, ratings volume, written review counts, and the 30 newest customer reviews without requiring Google Developer API credentials.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <div className="font-bold text-slate-800 flex items-center justify-between">
              <span>Apple App Store Provider</span>
              <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-mono">
                iTunes Lookup + RSS
              </span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Uses Apple's public iTunes lookup API for official track rating and count, combined with the official Apple customer reviews RSS feed for recent review entries.
            </p>
          </div>
        </div>

        {/* API Endpoints Info */}
        <div className="pt-3 border-t border-slate-100 text-xs space-y-2">
          <div className="font-semibold text-slate-700">Available REST Endpoints:</div>
          <div className="space-y-1 font-mono text-[11px] text-slate-600">
            <div className="p-2 bg-slate-100 rounded-lg">GET /api/health</div>
            <div className="p-2 bg-slate-100 rounded-lg">GET /api/apps/search?query=...&platform=...&country=...</div>
            <div className="p-2 bg-slate-100 rounded-lg">GET /api/apps/:app_id/summary?platform=...&country=...</div>
            <div className="p-2 bg-slate-100 rounded-lg">GET /api/apps/:app_id/reviews?platform=...&count=30&sort=newest</div>
            <div className="p-2 bg-slate-100 rounded-lg">GET /api/dashboard/unified?google_id=...&apple_id=...&country=...</div>
          </div>
        </div>
      </div>
    </div>
  );
};
