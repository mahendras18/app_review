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
  Download,
  ExternalLink,
} from 'lucide-react';
import {
  AppConfig,
  DATE_RANGE_OPTIONS,
  DateRangeOption,
  PlatformReportOption,
  GeneratedReportItem,
} from '../types';
import { api } from '../services/api';
import { ExcelSpreadsheetViewer } from './ExcelSpreadsheetViewer';

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
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [generatedReport, setGeneratedReport] = useState<GeneratedReportItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Generate reviews, display them immediately on desktop, and prepare Excel report
  const handleGenerateReviews = async () => {
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
        `Generated ${report.total_count.toLocaleString()} reviews for ${appConfig.name}! Displayed below.`
      );
    } catch (err: any) {
      const msg = err.message || 'Failed to generate reviews. Please try again.';
      setErrorMessage(msg);
      onToast('error', msg);
    } finally {
      setIsGenerating(false);
    }
  };

  // Direct Excel export download - works completely independently of on-screen display
  const handleDirectDownload = () => {
    setIsExporting(true);
    try {
      const exportUrl = api.getExportUrl({
        googleId: appConfig.googleAppId || undefined,
        appleId: appConfig.appleAppId || undefined,
        appName: appConfig.name,
        country: appConfig.country,
        dateRange: selectedRange,
        platform: selectedPlatform,
      });

      // Trigger standard browser file download
      const link = document.createElement('a');
      link.href = exportUrl;
      link.setAttribute('download', '');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onToast('success', 'Excel report download started!');
    } catch (err: any) {
      onToast('error', err.message || 'Failed to download Excel report.');
    } finally {
      setIsExporting(false);
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
                  disabled={isGenerating || isExporting}
                  className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
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
                  disabled={isGenerating || isExporting}
                  className={`py-2 px-2.5 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
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

      {/* Action Row: Target App & Generation/Download Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
        <p className="text-xs text-slate-500">
          Target App: <span className="font-semibold text-slate-800">{appConfig.name}</span>
        </p>

        <div className="flex items-center space-x-3 flex-wrap gap-y-2">
          {/* Direct Download Excel Button (always functional and independent) */}
          <button
            type="button"
            onClick={handleDirectDownload}
            disabled={isExporting || isGenerating}
            className="inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 disabled:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed flex-shrink-0"
            title="Download reviews directly as an Excel workbook"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Download Excel</span>
              </>
            )}
          </button>

          {/* Primary Action Button: Generate Reviews */}
          <button
            type="button"
            onClick={handleGenerateReviews}
            disabled={isGenerating || isExporting}
            className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed flex-shrink-0"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating Reviews...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4" />
                <span>Generate Reviews</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-xs text-rose-800 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Post-Generation Banner: Excel Actions & Summary */}
      {generatedReport && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Reviews generated successfully!
              </div>
              <div className="text-xs text-emerald-700 mt-0.5">
                {generatedReport.total_count.toLocaleString()} reviews collected ({generatedReport.android_count.toLocaleString()} Android, {generatedReport.ios_count.toLocaleString()} iOS) • Available online for 24 hours
              </div>
            </div>

            {/* Excel Download & Online Viewer Action Links */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              {/* Direct Excel File Download Button */}
              <a
                href={generatedReport.file_url}
                download={generatedReport.filename}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-emerald-300 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                title="Download this generated Excel file"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Download Excel (.xlsx)</span>
              </a>

              {/* Open in Microsoft Excel Online Viewer */}
              <a
                href={generatedReport.viewer_url || generatedReport.web_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                title="Open in Microsoft Excel Online Viewer"
              >
                <span>Open in Excel Online</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {generatedReport.is_localhost && (
            <div className="pt-2 border-t border-emerald-200/60 flex items-start space-x-2 text-[11px] text-emerald-800/80">
              <Info className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Local Development Note:</strong> Microsoft Excel Online Viewer requires a publicly reachable HTTPS URL (e.g. deployed backend or tunnel via <code className="bg-emerald-100/80 px-1 py-0.5 rounded font-mono">PUBLIC_BASE_URL</code> in backend .env) so Microsoft's servers can retrieve the workbook. Direct file download above works in all environments.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Generated Reviews Excel-Like Interactive Spreadsheet - Visible Immediately within Application UI */}
      {generatedReport && (
        <div className="pt-4 border-t border-slate-200/80 space-y-4 animate-fade-in">
          {/* Interactive Excel-Like Spreadsheet */}
          <ExcelSpreadsheetViewer
            reviews={generatedReport.reviews || []}
            appName={appConfig.name}
            originalExcelUrl={generatedReport.file_url}
            excelOnlineUrl={generatedReport.viewer_url || generatedReport.web_url}
            onDownloadOriginal={handleDirectDownload}
            isDownloadingOriginal={isExporting}
          />
        </div>
      )}
    </div>
  );
};
