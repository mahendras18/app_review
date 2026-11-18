import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Calendar,
  Loader2,
  Smartphone,
  Apple,
  CheckCircle2,
  AlertCircle,
  Layers,
  Info,
} from 'lucide-react';
import {
  AppConfig,
  DATE_RANGE_OPTIONS,
  DateRangeOption,
  PlatformReportOption,
  GeneratedReportItem,
} from '../types';
import { api } from '../services/api';

interface ExcelReportCardProps {
  appConfig: AppConfig;
  onToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const ExcelReportCard: React.FC<ExcelReportCardProps> = ({
  appConfig,
  onToast,
}) => {
  const [selectedRange, setSelectedRange] = useState<DateRangeOption>('7');
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformReportOption>('both');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedReport, setGeneratedReport] = useState<GeneratedReportItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Generate genuine Excel report and host temporarily for Microsoft Excel Online Viewer
  const handleGenerateReport = async () => {
    setIsGenerating(true);
    setErrorMessage(null);
    setGeneratedReport(null);

    try {
      const report = await api.generateReport({
        google_id: appConfig.googleAppId || undefined,
        apple_id: appConfig.appleAppId || undefined,
        app_name: appConfig.name,
        country: appConfig.country,
        date_range: selectedRange,
        platform: selectedPlatform,
      });

      setGeneratedReport(report);
      onToast(
        'success',
        `Excel report generated successfully! ${report.total_count.toLocaleString()} reviews collected.`
      );
    } catch (err: any) {
      const msg = err.message || 'Failed to generate Excel report. Please try again.';
      setErrorMessage(msg);
      onToast('error', msg);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
      {/* Platform & Date Range Filter Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Platform Selection */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>Platform Selection</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'both' as PlatformReportOption, label: 'Both', icon: Layers },
              { id: 'android' as PlatformReportOption, label: 'Android', icon: Smartphone },
              { id: 'ios' as PlatformReportOption, label: 'iOS', icon: Apple },
            ].map((p) => {
              const Icon = p.icon;
              const isSelected = selectedPlatform === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPlatform(p.id)}
                  disabled={isGenerating}
                  className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                    isSelected
                      ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date Range Selection */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Date Range</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DATE_RANGE_OPTIONS.map((opt) => {
              const isSelected = selectedRange === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedRange(opt.value)}
                  disabled={isGenerating}
                  className={`py-2 px-2.5 rounded-xl text-xs font-semibold border text-center transition-all ${
                    isSelected
                      ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Generate Report Button Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
        <p className="text-xs text-slate-500">
          Target App: <span className="font-semibold text-slate-800">{appConfig.name}</span>
        </p>

        <button
          type="button"
          onClick={handleGenerateReport}
          disabled={isGenerating}
          className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed flex-shrink-0"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating Excel Report...</span>
            </>
          ) : (
            <>
              <FileSpreadsheet className="w-4 h-4" />
              <span>Generate Report</span>
            </>
          )}
        </button>
      </div>

      {/* Simple Excel Report Link - Shown After Generating Report */}
      {generatedReport && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Excel report generated successfully!
              </div>
              <div className="text-xs text-emerald-700 mt-0.5">
                {generatedReport.total_count.toLocaleString()} reviews collected ({generatedReport.android_count.toLocaleString()} Android, {generatedReport.ios_count.toLocaleString()} iOS) • Available online for 24 hours
              </div>
            </div>

            <a
              href={generatedReport.viewer_url || generatedReport.web_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex-shrink-0"
            >
              <span>Open Excel Report</span>
              <span aria-hidden="true">&rarr;</span>
            </a>
          </div>

          {generatedReport.is_localhost && (
            <div className="pt-2 border-t border-emerald-200/60 flex items-start space-x-2 text-[11px] text-emerald-800/80">
              <Info className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Local Development Note:</strong> Microsoft Excel Online Viewer requires a publicly reachable HTTPS URL (e.g. deployed backend or tunnel via <code className="bg-emerald-100/80 px-1 py-0.5 rounded font-mono">PUBLIC_BASE_URL</code> in backend .env) so Microsoft's servers can retrieve the workbook.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-xs text-rose-800 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
