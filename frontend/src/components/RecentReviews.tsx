import React, { useState } from 'react';
import {
  Star,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  MessageSquareOff,
  User,
  Info,
  ExternalLink,
  Tag,
  Hash,
} from 'lucide-react';
import { PlatformFilter, ReviewItem } from '../types';

interface RecentReviewsProps {
  reviews: ReviewItem[];
  isLoading: boolean;
  error?: string | null;
  onRefresh?: () => void;
  platformFilter?: PlatformFilter;
  storeWarning?: string | null;
}

const ITEMS_PER_PAGE = 10;

export const RecentReviews: React.FC<RecentReviewsProps> = ({
  reviews,
  isLoading,
  error,
  onRefresh,
  platformFilter = 'all',
  storeWarning,
}) => {
  const [visibleCount, setVisibleCount] = useState<number>(ITEMS_PER_PAGE);
  const [expandedReviews, setExpandedReviews] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedReviews((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + ITEMS_PER_PAGE);
  };

  // Format date helper
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Date Unavailable';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs animate-pulse space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-16 h-5 bg-slate-200 rounded-md" />
                <div className="w-20 h-4 bg-slate-200 rounded" />
              </div>
              <div className="w-28 h-4 bg-slate-200 rounded" />
            </div>
            <div className="w-1/3 h-4 bg-slate-200 rounded" />
            <div className="w-full h-12 bg-slate-100 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-8 shadow-xs text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
          <MessageSquareOff className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Failed to Load Reviews</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">{error}</p>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
          >
            Retry Review Request
          </button>
        )}
      </div>
    );
  }

  if (reviews.length === 0) {
    const emptyMessage =
      platformFilter === 'apple'
        ? 'No reviews matched your current filter criteria or the Apple App Store currently has no recent public reviews for this app in this storefront.'
        : platformFilter === 'google'
        ? 'No reviews matched your current filter criteria or Google Play Store currently has no recent reviews for this app in this storefront.'
        : 'No reviews matched your current filter criteria or the stores currently have no recent reviews for this app.';

    return (
      <div className="space-y-4">
        {storeWarning && (
          <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start space-x-2.5">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="font-semibold">Store Notice:</strong> {storeWarning}
            </div>
          </div>
        )}
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
            <MessageSquareOff className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">No Reviews Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {emptyMessage}
          </p>
        </div>
      </div>
    );
  }

  const paginatedReviews = reviews.slice(0, visibleCount);
  const hasMore = visibleCount < reviews.length;

  return (
    <div className="space-y-4">
      {/* Store Warning Notice if one store failed */}
      {storeWarning && (
        <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start space-x-2.5">
          <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="font-semibold">Store Notice:</strong> {storeWarning}
          </div>
        </div>
      )}

      {/* Informative Limitation Note */}
      <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-xs text-blue-900 flex items-start space-x-2.5">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="font-semibold">Recent Review Sample:</strong> Displaying the 30 most recent reviews retrieved from live store feeds per platform. This is a recent chronological sample and not the application's entire historical review archive.
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-3">
        {paginatedReviews.map((review, idx) => {
          const isGoogle = review.platform === 'google';
          const reviewKey = review.id || `review-${idx}`;
          const isExpanded = !!expandedReviews[reviewKey];
          const isLongText = review.text.length > 280;

          return (
            <div
              key={reviewKey}
              className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 transition-all p-5 shadow-xs"
            >
              {/* Review Header: Platform Badge, Stars, Date */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                      isGoogle
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    {isGoogle ? 'Google Play' : 'Apple App Store'}
                  </span>

                  <div className="flex items-center space-x-0.5 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    <span className="text-xs font-bold text-amber-900 mr-1">
                      {review.rating.toFixed(0)}
                    </span>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          review.rating >= s
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatDate(review.date)}</span>
                </div>
              </div>

              {/* Review Title (available on Apple App Store) */}
              {review.title && (
                <h4 className="font-bold text-slate-900 text-sm mb-1.5">
                  {review.title}
                </h4>
              )}

              {/* Review Content */}
              <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line mb-3">
                {isLongText && !isExpanded ? (
                  <>
                    {review.text.slice(0, 280)}...
                    <button
                      onClick={() => toggleExpand(reviewKey)}
                      className="ml-1 text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center"
                    >
                      Read more <ChevronDown className="w-3 h-3 ml-0.5" />
                    </button>
                  </>
                ) : (
                  <>
                    {review.text}
                    {isLongText && (
                      <button
                        onClick={() => toggleExpand(reviewKey)}
                        className="ml-2 text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center"
                      >
                        Show less <ChevronUp className="w-3 h-3 ml-0.5" />
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Review Metadata Footer (Version, Reviewer Name, Identifier) */}
              <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                {review.reviewer_name && (
                  <div className="flex items-center space-x-1">
                    <User className="w-3 h-3 text-slate-400" />
                    <span className="text-slate-600 font-medium">{review.reviewer_name}</span>
                  </div>
                )}

                {review.version && (
                  <div className="flex items-center space-x-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/80">
                    <Tag className="w-3 h-3 text-slate-400" />
                    <span>v{review.version}</span>
                  </div>
                )}

                {review.id && (
                  <div className="flex items-center space-x-1 font-mono text-[10px] text-slate-400 truncate max-w-[200px]" title={`Review ID: ${review.id}`}>
                    <Hash className="w-3 h-3" />
                    <span>{review.id}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination / Load More */}
      {hasMore && (
        <div className="text-center pt-2">
          <button
            onClick={handleLoadMore}
            className="px-6 py-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs transition-colors hover:border-slate-300"
          >
            Load More Reviews ({reviews.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
};
