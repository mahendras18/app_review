import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Scale,
  TrendingUp,
  TrendingDown,
  Minus,
  HelpCircle,
  Clock,
  Globe,
  Award,
} from 'lucide-react';
import { AppSummary, RatingComparison as RatingComparisonType } from '../types';

interface RatingComparisonProps {
  comparison?: RatingComparisonType | null;
  googleSummary?: AppSummary | null;
  appleSummary?: AppSummary | null;
  country: string;
}

export const RatingComparison: React.FC<RatingComparisonProps> = ({
  comparison,
  googleSummary,
  appleSummary,
  country,
}) => {
  const gScore = googleSummary?.score ?? null;
  const aScore = appleSummary?.score ?? null;
  const gRatings = googleSummary?.ratings_count ?? null;
  const aRatings = appleSummary?.ratings_count ?? null;

  // Prepare chart data for ratings on a 0 - 5 scale
  const chartData = [
    {
      name: 'Google Play',
      platform: 'google',
      rating: gScore !== null ? gScore : 0,
      ratingsCount: gRatings || 0,
      color: '#10b981', // emerald-500
    },
    {
      name: 'App Store',
      platform: 'apple',
      rating: aScore !== null ? aScore : 0,
      ratingsCount: aRatings || 0,
      color: '#3b82f6', // blue-500
    },
  ];

  const diff = comparison?.score_difference;
  const hasBoth = comparison?.has_both ?? (gScore !== null && aScore !== null);

  const higherPlatform =
    hasBoth && diff !== null && diff !== undefined
      ? diff > 0
        ? 'Google Play'
        : diff < 0
        ? 'Apple App Store'
        : 'Tied'
      : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Scale className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900">
              Platform Rating Comparison
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Standardized 0–5.0 star comparison from official store APIs
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-medium border border-slate-200">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span>Storefront: {country.toUpperCase()}</span>
          </span>
        </div>
      </div>

      {/* Difference Highlights Banner */}
      {hasBoth ? (
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-slate-50 to-blue-50/40 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs ${
                diff! > 0
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : diff! < 0
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'bg-slate-200 text-slate-800'
              }`}
            >
              {diff! > 0 ? (
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              ) : diff! < 0 ? (
                <TrendingDown className="w-5 h-5 text-blue-600" />
              ) : (
                <Minus className="w-5 h-5 text-slate-600" />
              )}
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-700">
                Overall Rating Differential
              </div>
              <div className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span>{diff! > 0 ? `+${diff!.toFixed(2)}` : diff!.toFixed(2)} stars</span>
                <span className="text-xs font-normal text-slate-500">
                  {diff! > 0
                    ? '(Google Play is higher)'
                    : diff! < 0
                    ? '(Apple App Store is higher)'
                    : '(Identical ratings)'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-xs border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-5">
            <div>
              <div className="text-slate-400 text-[11px]">Leader</div>
              <div className="font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                <span>{higherPlatform}</span>
              </div>
            </div>

            <div>
              <div className="text-slate-400 text-[11px]">Ratings Ratio</div>
              <div className="font-bold text-slate-900 mt-0.5">
                {gRatings && aRatings
                  ? `${(gRatings / aRatings).toFixed(1)}x (GP vs iOS)`
                  : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center space-x-2">
          <HelpCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>
            {gScore !== null
              ? 'Apple App Store data is currently unavailable. Displaying Google Play Store ratings.'
              : aScore !== null
              ? 'Google Play Store data is currently unavailable. Displaying Apple App Store ratings.'
              : 'Both platforms are currently unavailable for comparison.'}
          </span>
        </div>
      )}

      {/* Main Charts & Breakdown Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Recharts Bar Chart: 0 - 5 Scale */}
        <div className="lg:col-span-7 h-64 bg-slate-50/60 border border-slate-100 rounded-xl p-3 flex flex-col">
          <div className="text-xs font-semibold text-slate-700 px-2 pt-1 mb-1">
            Store Rating Average (0.0 to 5.0 scale)
          </div>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis
                  domain={[0, 5]}
                  ticks={[0, 1, 2, 3, 4, 5]}
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-2.5 rounded-lg text-xs shadow-lg space-y-1">
                          <div className="font-bold">{data.name}</div>
                          <div>Rating: {data.rating ? `${data.rating} / 5.0` : 'Unavailable'}</div>
                          <div>Total Ratings: {data.ratingsCount ? data.ratingsCount.toLocaleString() : 'Unavailable'}</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="rating" radius={[6, 6, 0, 0]} maxBarSize={55}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Side-by-Side Breakdown Cards */}
        <div className="lg:col-span-5 space-y-3">
          {/* Google Play Box */}
          <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/40">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-emerald-900 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Google Play Store
              </span>
              <span className="text-xs font-bold text-emerald-700">
                {gScore !== null ? `${gScore.toFixed(2)} ★` : 'Unavailable'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between">
              <span>Total Ratings:</span>
              <span className="font-semibold text-slate-700">
                {gRatings ? gRatings.toLocaleString() : 'Unavailable'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between mt-1">
              <span>Fetched Sample:</span>
              <span className="font-semibold text-slate-700">
                {googleSummary?.reviews_fetched || 0} reviews
              </span>
            </div>
          </div>

          {/* Apple App Store Box */}
          <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/40">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-blue-900 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                Apple App Store
              </span>
              <span className="text-xs font-bold text-blue-700">
                {aScore !== null ? `${aScore.toFixed(2)} ★` : 'Unavailable'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between">
              <span>Total Ratings:</span>
              <span className="font-semibold text-slate-700">
                {aRatings ? aRatings.toLocaleString() : 'Unavailable'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between mt-1">
              <span>Fetched Sample:</span>
              <span className="font-semibold text-slate-700">
                {appleSummary?.reviews_fetched || 0} reviews
              </span>
            </div>
          </div>

          {/* Clarification Note requirement */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 leading-relaxed">
            <span className="font-semibold text-slate-700">Measurement Integrity:</span> Overall ratings shown here reflect the entire historical store averages reported by Google and Apple APIs, not a localized average of the 30 fetched recent reviews.
          </div>
        </div>
      </div>
    </div>
  );
};
