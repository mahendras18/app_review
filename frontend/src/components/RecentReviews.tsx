import React from 'react';
import { FileSpreadsheet } from 'lucide-react';

/**
 * Notice: Reviews are saved as genuine Excel (.xlsx) workbooks directly in Microsoft OneDrive and opened in Microsoft Excel for the web.
 */
export const RecentReviews: React.FC<any> = () => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs space-y-3">
      <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto">
        <FileSpreadsheet className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-bold text-slate-900">Microsoft Excel Cloud Integration Active</h3>
      <p className="text-xs text-slate-500 max-w-md mx-auto">
        Generate genuine Excel (.xlsx) reports directly saved to your Microsoft OneDrive and open them instantly in Microsoft Excel for the web.
      </p>
    </div>
  );
};
