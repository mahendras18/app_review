import React from 'react';
import {
  Star,
  ExternalLink,
  AlertCircle,
  Clock,
  MessageSquare,
  Users,
  Layers,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';
import { AppSummary, Platform } from '../types';

interface StoreCardProps {
  platform: Platform;
  summary?: AppSummary | null;
  isLoading: boolean;
  onRetry?: () => void;
}

export const StoreCard: React.FC<StoreCardProps> = ({
  platform,
  summary,
  isLoading,
  onRetry,
}) => {
  const isGoogle = platform === 'google';
  const storeName = isGoogle ? 'Google Play Store' : 'Apple App Store';
  const badgeColor = isGoogle
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : 'bg-blue-50 text-blue-700 border-blue-200';
  const accentColor = isGoogle ? 'text-emerald-600' : 'text-blue-600';
  const progressBg = isGoogle ? 'bg-emerald-500' : 'bg-blue-600';

  // Render Skeleton Loader while loading
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs animate-pulse">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-slate-200 rounded-xl" />
            <div className="space-y-2">
              <div className="w-32 h-4 bg-slate-200 rounded" />
              <div className="w-20 h-3 bg-slate-200 rounded" />
            </div>
          </div>
          <div className="w-24 h-6 bg-slate-200 rounded-full" />
        </div>
        <div className="my-6 space-y-2">
          <div className="w-20 h-8 bg-slate-200 rounded" />
          <div className="w-48 h-3 bg-slate-200 rounded" />
        </div>
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
          <div className="h-14 bg-slate-100 rounded-xl" />
          <div className="h-14 bg-slate-100 rounded-xl" />
        </div>
      </div>
    );
  }

  // Error State for this specific platform
  if (!summary || summary.error) {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-6 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">{storeName}</h3>
              <p className="text-[11px] text-slate-500 font-mono">{summary?.app_id || 'Identifier'}</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Error
          </span>
        </div>

        <div className="bg-rose-50/70 border border-rose-100 rounded-xl p-3.5 mb-4 text-xs text-rose-800 leading-relaxed">
          {summary?.error || `Could not connect to ${storeName}. Verify the app identifier or network connection.`}
        </div>

        {onRetry && (
          <button
            onClick={onRetry}
            className="w-full py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors"
          >
            Retry Platform Request
          </button>
        )}
      </div>
    );
  }

  const scoreFormatted = summary.score !== null && summary.score !== undefined
    ? summary.score.toFixed(2)
    : 'Unavailable';

  const scorePercent = summary.score !== null && summary.score !== undefined
    ? Math.min(100, Math.max(0, (summary.score / 5) * 100))
    : 0;

  const totalRatingsFormatted = summary.ratings_count !== null && summary.ratings_count !== undefined
    ? summary.ratings_count.toLocaleString()
    : 'Unavailable';

  const writtenReviewsFormatted = summary.reviews_count !== null && summary.reviews_count !== undefined
    ? summary.reviews_count.toLocaleString()
    : isGoogle
    ? 'Unavailable'
    : 'Unavailable (Not provided in Apple API)';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 transition-all p-6 shadow-xs relative">
      {/* Platform Header */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-center space-x-3.5">
          {summary.icon ? (
            <img
              src={summary.icon}
              alt={summary.title || 'App Icon'}
              className="w-12 h-12 rounded-xl object-cover shadow-xs border border-slate-200"
              onError={(e) => {
                // fallback if image fails to load
                (e.currentTarget as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/></svg>';
              }}
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
              <Layers className="w-6 h-6" />
            </div>
          )}

          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 text-base leading-snug truncate max-w-[220px]" title={summary.title || 'Unavailable'}>
              {summary.title || 'Unavailable'}
            </h3>
            <p className="text-xs text-slate-500 truncate max-w-[200px]">
              {summary.developer || 'Developer Unavailable'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeColor}`}>
            {isGoogle ? 'Google Play' : 'App Store'}
          </span>
          {summary.url && (
            <a
              href={summary.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title={`View on ${storeName}`}
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* Main Star Rating Display */}
      <div className="my-5 bg-slate-50/70 border border-slate-100 rounded-2xl p-4">
        <div className="flex items-baseline justify-between mb-2">
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">
              {scoreFormatted}
            </span>
            <span className="text-sm font-semibold text-slate-400">/ 5.0</span>
          </div>
          <div className="flex items-center space-x-1">
            {[1, 2, 3, 4, 5].map((star) => {
              const fill = summary.score !== null && summary.score !== undefined && summary.score >= star;
              const half = summary.score !== null && summary.score !== undefined && !fill && summary.score >= star - 0.5;
              return (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    fill
                      ? 'fill-amber-400 text-amber-400'
                      : half
                      ? 'fill-amber-200 text-amber-400'
                      : 'text-slate-300'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Rating Score Bar */}
        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${progressBg}`}
            style={{ width: `${scorePercent}%` }}
          />
        </div>
      </div>

      {/* Structured Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 text-xs mb-4">
        {/* Total Ratings */}
        <div className="p-3 bg-white border border-slate-200 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Total Ratings</span>
            <Users className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-sm font-bold text-slate-900">
            {totalRatingsFormatted}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Overall store count</div>
        </div>

        {/* Written Reviews Count */}
        <div className="p-3 bg-white border border-slate-200 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Written Reviews</span>
            <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-sm font-bold text-slate-900">
            {isGoogle ? writtenReviewsFormatted : 'Unavailable'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {isGoogle ? 'Store total' : 'Apple API excludes'}
          </div>
        </div>

        {/* Reviews Fetched in This Request */}
        <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
          <div className="flex items-center justify-between text-blue-700 mb-1">
            <span className="text-[11px] font-medium">Fetched Reviews</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-sm font-bold text-blue-900">
            {summary.reviews_fetched} recent
          </div>
          <div className="text-[10px] text-blue-600/80 mt-0.5">Available for text analysis</div>
        </div>

        {/* Storefront & Package */}
        <div className="p-3 bg-white border border-slate-200 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Storefront</span>
            <span className="text-[10px] uppercase font-mono font-bold text-slate-700 bg-slate-100 px-1 rounded">
              {summary.country}
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-600 truncate mt-1" title={summary.app_id}>
            {summary.app_id}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">App identifier</div>
        </div>
      </div>

      {/* Last Refreshed Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[11px] text-slate-400">
        <div className="flex items-center space-x-1">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>Last refresh:</span>
        </div>
        <span className="font-medium text-slate-600">
          {new Date(summary.last_updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>
    </div>
  );
};
