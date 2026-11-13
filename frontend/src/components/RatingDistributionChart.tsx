import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Star, BarChart3, Info } from 'lucide-react';
import { ReviewItem } from '../types';

interface RatingDistributionChartProps {
  reviews: ReviewItem[];
}

export const RatingDistributionChart: React.FC<RatingDistributionChartProps> = ({
  reviews,
}) => {
  // Compute distribution for Google Play and Apple App Store
  const distributionData = [5, 4, 3, 2, 1].map((star) => {
    const googleCount = reviews.filter(
      (r) => r.platform === 'google' && Math.round(r.rating) === star
    ).length;
    const appleCount = reviews.filter(
      (r) => r.platform === 'apple' && Math.round(r.rating) === star
    ).length;

    return {
      stars: `${star} ★`,
      starValue: star,
      'Google Play': googleCount,
      'App Store': appleCount,
      total: googleCount + appleCount,
    };
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Recent Review Rating Breakdown
            </h3>
            <p className="text-xs text-slate-500">
              Distribution of stars in the fetched sample ({reviews.length} reviews)
            </p>
          </div>
        </div>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={distributionData}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
            <XAxis type="number" stroke="#64748b" fontSize={11} allowDecimals={false} />
            <YAxis
              dataKey="stars"
              type="category"
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-slate-900 text-white p-2.5 rounded-lg text-xs shadow-lg space-y-1">
                      <div className="font-bold border-b border-slate-700 pb-1">{label} Reviews</div>
                      {payload.map((entry: any, index: number) => (
                        <div key={`item-${index}`} className="flex justify-between gap-3">
                          <span style={{ color: entry.color }}>{entry.name}:</span>
                          <span className="font-semibold">{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
              iconType="circle"
              iconSize={8}
            />
            <Bar dataKey="Google Play" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={16} />
            <Bar dataKey="App Store" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center space-x-1.5">
        <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <span>
          Note: This breakdown applies solely to the recently fetched review batch, useful for sentiment diagnostics.
        </span>
      </div>
    </div>
  );
};
