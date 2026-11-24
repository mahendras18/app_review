import React, { useState, useMemo } from 'react';
import {
  Star,
  Calendar,
  Smartphone,
  Apple,
  Search,
  ChevronDown,
  ChevronUp,
  User,
  Tag,
  Hash,
  MessageSquareOff,
  ArrowUpDown,
  RotateCcw,
} from 'lucide-react';
import { ReviewItem } from '../types';

interface RecentReviewsProps {
  reviews: ReviewItem[];
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  appName?: string;
  defaultPlatformFilter?: 'all' | 'google' | 'apple';
}

const ITEMS_PER_PAGE = 10;

export const RecentReviews: React.FC<RecentReviewsProps> = ({
  reviews,
  isLoading = false,
  error = null,
  onRefresh,
  appName = 'boAt Hearables',
  defaultPlatformFilter = 'all',
}) => {
  const [visibleCount, setVisibleCount] = useState<number>(ITEMS_PER_PAGE);
  const [expandedReviews, setExpandedReviews] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [platformFilter, setPlatformFilter] = useState<'all' | 'google' | 'apple'>(defaultPlatformFilter);
  const [starFilter, setStarFilter] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

  const toggleExpand = (id: string) => {
    setExpandedReviews((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + ITEMS_PER_PAGE);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setPlatformFilter('all');
    setStarFilter(null);
    setSortOrder('newest');
    setVisibleCount(ITEMS_PER_PAGE);
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
      });
    } catch {
      return dateStr;
    }
  };

  // Filter and sort reviews
  const filteredReviews = useMemo(() => {
    if (!reviews || reviews.length === 0) return [];

    let list = [...reviews];

    // Platform filter
    if (platformFilter !== 'all') {
      list = list.filter((r) => r.platform === platformFilter);
    }

    // Star rating filter
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

    // Sort order
    if (sortOrder === 'newest') {
      list.sort((a, b) => {
        const timeA = a.date ? new Date(a.date).getTime() : 0;
        const timeB = b.date ? new Date(b.date).getTime() : 0;
        return timeB - timeA;
      });
    } else if (sortOrder === 'oldest') {
      list.sort((a, b) => {
        const timeA = a.date ? new Date(a.date).getTime() : 0;
        const timeB = b.date ? new Date(b.date).getTime() : 0;
        return timeA - timeB;
      });
    } else if (sortOrder === 'highest') {
      list.sort((a, b) => b.rating - a.rating);
    } else if (sortOrder === 'lowest') {
      list.sort((a, b) => a.rating - b.rating);
    }

    return list;
  }, [reviews, platformFilter, starFilter, searchQuery, sortOrder]);

  // Counts by platform
  const googleCount = useMemo(
    () => reviews.filter((r) => r.platform === 'google').length,
    [reviews]
  );
  const appleCount = useMemo(
    () => reviews.filter((r) => r.platform === 'apple').length,
    [reviews]
  );

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs animate-pulse space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-20 h-5 bg-slate-200 rounded-md" />
                <div className="w-16 h-4 bg-slate-200 rounded" />
              </div>
              <div className="w-24 h-4 bg-slate-200 rounded" />
            </div>
            <div className="w-1/3 h-4 bg-slate-200 rounded" />
            <div className="w-full h-12 bg-slate-100 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  // Error state
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
            Retry Request
          </button>
        )}
      </div>
    );
  }

  // Empty state when no reviews were generated
  if (reviews.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-xs space-y-3">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
          <MessageSquareOff className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-900">No Reviews Available</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          No reviews found for {appName} for the selected parameters. Try selecting a broader date range or another platform.
        </p>
      </div>
    );
  }

  const paginatedReviews = filteredReviews.slice(0, visibleCount);
  const hasMore = visibleCount < filteredReviews.length;

  return (
    <div className="space-y-4">
      {/* Search and Filters Toolbar */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Keyword Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleCount(ITEMS_PER_PAGE);
              }}
              placeholder="Search in reviews, titles, or authors..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* Platform Tabs Filter */}
          <div className="flex items-center space-x-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setPlatformFilter('all');
                setVisibleCount(ITEMS_PER_PAGE);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                platformFilter === 'all'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              All ({reviews.length})
            </button>
            {googleCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setPlatformFilter('google');
                  setVisibleCount(ITEMS_PER_PAGE);
                }}
                className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  platformFilter === 'google'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Smartphone className="w-3 h-3" />
                <span>Android ({googleCount})</span>
              </button>
            )}
            {appleCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setPlatformFilter('apple');
                  setVisibleCount(ITEMS_PER_PAGE);
                }}
                className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  platformFilter === 'apple'
                    ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Apple className="w-3 h-3" />
                <span>iOS ({appleCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Secondary Row: Star Rating Filter & Sort Order */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-200/60 text-xs">
          {/* Star Filter Badges */}
          <div className="flex items-center space-x-1.5 overflow-x-auto">
            <span className="text-[11px] font-semibold text-slate-500 mr-1">Rating:</span>
            <button
              type="button"
              onClick={() => {
                setStarFilter(null);
                setVisibleCount(ITEMS_PER_PAGE);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                starFilter === null
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Any
            </button>
            {[5, 4, 3, 2, 1].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => {
                  setStarFilter(starFilter === star ? null : star);
                  setVisibleCount(ITEMS_PER_PAGE);
                }}
                className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  starFilter === star
                    ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{star}</span>
                <Star className={`w-3 h-3 ${starFilter === star ? 'fill-white text-white' : 'fill-amber-400 text-amber-400'}`} />
              </button>
            ))}
          </div>

          {/* Sort Dropdown & Active Count */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1 text-slate-500">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                aria-label="Sort reviews by"
                className="bg-white border border-slate-200 rounded-lg text-xs py-1 px-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="highest">Highest Rating</option>
                <option value="lowest">Lowest Rating</option>
              </select>
            </div>

            {(searchQuery || starFilter !== null || platformFilter !== 'all') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center space-x-1 text-[11px] text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Review Count Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Showing <strong className="font-semibold text-slate-800">{paginatedReviews.length}</strong> of{' '}
          <strong className="font-semibold text-slate-800">{filteredReviews.length}</strong> reviews
          {filteredReviews.length !== reviews.length && ` (filtered from ${reviews.length} total)`}
        </span>
      </div>

      {/* Empty Filter Results */}
      {filteredReviews.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs space-y-3">
          <p className="text-xs text-slate-500">
            No reviews matched your current search or filter criteria.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-3.5 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Review Cards Feed */}
      <div className="space-y-3">
        {paginatedReviews.map((review, idx) => {
          const reviewKey = review.id || `rev-${review.platform}-${idx}`;
          const isGoogle = review.platform === 'google';
          const isExpanded = !!expandedReviews[reviewKey];
          const isLongText = review.text.length > 240;

          return (
            <div
              key={reviewKey}
              className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 transition-all p-5 shadow-xs space-y-3"
            >
              {/* Review Card Header: Platform Badge, Star Rating, Date */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span
                    className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold border ${
                      isGoogle
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    {isGoogle ? (
                      <>
                        <Smartphone className="w-3 h-3 text-emerald-600" />
                        <span>Google Play</span>
                      </>
                    ) : (
                      <>
                        <Apple className="w-3 h-3 text-blue-600" />
                        <span>Apple App Store</span>
                      </>
                    )}
                  </span>

                  {/* Rating Badge */}
                  <div className="flex items-center space-x-1 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200">
                    <span className="text-xs font-bold text-amber-900">
                      {review.rating.toFixed(1)}
                    </span>
                    <div className="flex items-center space-x-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3 h-3 ${
                            review.rating >= s
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Date */}
                <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatDate(review.date)}</span>
                </div>
              </div>

              {/* Review Title */}
              {review.title && (
                <h4 className="font-bold text-slate-900 text-sm leading-snug">
                  {review.title}
                </h4>
              )}

              {/* Review Text */}
              <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                {isLongText && !isExpanded ? (
                  <>
                    {review.text.slice(0, 240)}...
                    <button
                      type="button"
                      onClick={() => toggleExpand(reviewKey)}
                      className="ml-1.5 text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center cursor-pointer"
                    >
                      Read more <ChevronDown className="w-3 h-3 ml-0.5" />
                    </button>
                  </>
                ) : (
                  <>
                    {review.text}
                    {isLongText && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(reviewKey)}
                        className="ml-2 text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center cursor-pointer"
                      >
                        Show less <ChevronUp className="w-3 h-3 ml-0.5" />
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Review Metadata Footer */}
              <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                {review.reviewer_name && (
                  <div className="flex items-center space-x-1">
                    <User className="w-3 h-3 text-slate-400" />
                    <span className="text-slate-600 font-medium">{review.reviewer_name}</span>
                  </div>
                )}

                {review.version && (
                  <div className="flex items-center space-x-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
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
            type="button"
            onClick={handleLoadMore}
            className="px-6 py-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs transition-colors hover:border-slate-300 cursor-pointer"
          >
            Load More Reviews ({filteredReviews.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
};
