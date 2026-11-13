import React from 'react';
import {
  Search,
  SlidersHorizontal,
  X,
  Star,
  Calendar,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { PlatformFilter, SortOrder } from '../types';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  platformFilter: PlatformFilter;
  onPlatformChange: (platform: PlatformFilter) => void;
  starFilter: number | null; // null means all stars
  onStarChange: (star: number | null) => void;
  sortOrder: 'newest' | 'oldest' | 'highest' | 'lowest';
  onSortChange: (sort: 'newest' | 'oldest' | 'highest' | 'lowest') => void;
  dateRange: 'all' | '7d' | '30d' | '90d';
  onDateRangeChange: (range: 'all' | '7d' | '30d' | '90d') => void;
  onResetFilters: () => void;
  totalCount: number;
  filteredCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  platformFilter,
  onPlatformChange,
  starFilter,
  onStarChange,
  sortOrder,
  onSortChange,
  dateRange,
  onDateRangeChange,
  onResetFilters,
  totalCount,
  filteredCount,
}) => {
  const isFiltered =
    searchQuery !== '' ||
    platformFilter !== 'all' ||
    starFilter !== null ||
    dateRange !== 'all' ||
    sortOrder !== 'newest';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-4">
      {/* Top Row: Search Input + Platform Tabs + Reset Button */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search review text or titles..."
            className="w-full pl-10 pr-9 py-2 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl outline-hidden transition-all text-slate-800 placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Platform Selection Tabs */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80">
          {(
            [
              { id: 'all', label: 'All Stores' },
              { id: 'google', label: 'Google Play' },
              { id: 'apple', label: 'App Store' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => onPlatformChange(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                platformFilter === tab.id
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Row: Star Filters, Sort Dropdown, Date Range, Results Count */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
        {/* Star Rating Pills */}
        <div className="flex items-center space-x-1.5 flex-wrap">
          <span className="text-slate-400 font-medium mr-1 text-[11px]">Rating:</span>
          <button
            onClick={() => onStarChange(null)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              starFilter === null
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          {[5, 4, 3, 2, 1].map((star) => (
            <button
              key={star}
              onClick={() => onStarChange(starFilter === star ? null : star)}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
                starFilter === star
                  ? 'bg-amber-50 text-amber-900 border-amber-300 font-semibold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>{star}</span>
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            </button>
          ))}
        </div>

        {/* Sort & Date Controls */}
        <div className="flex items-center space-x-2">
          {/* Sort Selector */}
          <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortOrder}
              onChange={(e) => onSortChange(e.target.value as any)}
              className="bg-transparent text-xs text-slate-700 font-medium outline-hidden cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Rating</option>
              <option value="lowest">Lowest Rating</option>
            </select>
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={dateRange}
              onChange={(e) => onDateRangeChange(e.target.value as any)}
              className="bg-transparent text-xs text-slate-700 font-medium outline-hidden cursor-pointer"
            >
              <option value="all">All Dates</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>

          {/* Reset Filters */}
          {isFiltered && (
            <button
              onClick={onResetFilters}
              className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors"
              title="Reset all filters"
            >
              Reset
            </button>
          )}

          {/* Review Count Info */}
          <div className="text-[11px] text-slate-500 font-medium pl-1">
            Showing <strong className="text-slate-800">{filteredCount}</strong> of {totalCount}
          </div>
        </div>
      </div>
    </div>
  );
};
