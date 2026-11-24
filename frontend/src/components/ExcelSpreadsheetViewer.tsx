import React, { useState, useRef, useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  ModuleRegistry,
  AllCommunityModule,
  ColDef,
  GridApi,
  GridReadyEvent,
  CellValueChangedEvent,
} from 'ag-grid-community';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import {
  Search,
  RotateCcw,
  Maximize2,
  WrapText,
  Download,
  ExternalLink,
  Undo2,
  Redo2,
  FilterX,
  FileSpreadsheet,
  Star,
  Smartphone,
  Apple,
  X,
  Sparkles,
} from 'lucide-react';
import { ReviewItem } from '../types';

// Register all AG Grid Community modules (virtualization, filters, sorting, clipboard, csv export, etc.)
ModuleRegistry.registerModules([AllCommunityModule]);

export interface ExcelSpreadsheetRow {
  id: string;
  platform: string;
  platformKey: 'google' | 'apple';
  appName: string;
  rating: number;
  sentiment: 'Positive' | 'Neutral' | 'Negative' | string;
  date: string;
  formattedDate: string;
  title: string;
  text: string;
  version: string;
  reviewerName: string;
}

interface ExcelSpreadsheetViewerProps {
  reviews: ReviewItem[];
  appName?: string;
  originalExcelUrl?: string;
  excelOnlineUrl?: string;
  onDownloadOriginal?: () => void;
  isDownloadingOriginal?: boolean;
}

export const ExcelSpreadsheetViewer: React.FC<ExcelSpreadsheetViewerProps> = ({
  reviews,
  appName = 'boAt Hearables',
  originalExcelUrl,
  excelOnlineUrl,
  onDownloadOriginal,
  isDownloadingOriginal = false,
}) => {
  const gridRef = useRef<AgGridReact<ExcelSpreadsheetRow>>(null);
  const [gridApi, setGridApi] = useState<GridApi<ExcelSpreadsheetRow> | null>(null);

  // Search & Filter state
  const [quickSearchText, setQuickSearchText] = useState<string>('');
  const [wrapText, setWrapText] = useState<boolean>(false);
  const [activeSentimentFilter, setActiveSentimentFilter] = useState<string>('all');
  const [selectedCellInfo, setSelectedCellInfo] = useState<string>('A1');

  // Stats state
  const [displayedCount, setDisplayedCount] = useState<number>(reviews.length);

  // Convert raw ReviewItem[] to grid row dataset with sentiment and formatting
  const initialRowData = useMemo<ExcelSpreadsheetRow[]>(() => {
    return reviews.map((r, idx) => {
      const isGoogle = r.platform === 'google';
      const rating = Number(r.rating || 0);

      // Compute sentiment if not explicitly provided
      let sentiment = r.sentiment;
      if (!sentiment) {
        if (rating >= 4.0) sentiment = 'Positive';
        else if (rating === 3.0) sentiment = 'Neutral';
        else sentiment = 'Negative';
      }

      // Format date for clean spreadsheet view
      let formattedDate = r.date || '';
      if (r.date) {
        try {
          const d = new Date(r.date);
          if (!isNaN(d.getTime())) {
            formattedDate = d.toISOString().split('T')[0];
          }
        } catch {
          formattedDate = r.date;
        }
      }

      return {
        id: r.id || `rev-${r.platform}-${idx}`,
        platform: isGoogle ? 'Google Play' : 'Apple App Store',
        platformKey: isGoogle ? 'google' : 'apple',
        appName: appName,
        rating: rating,
        sentiment: sentiment,
        date: r.date || '',
        formattedDate: formattedDate,
        title: r.title || '',
        text: r.text || '',
        version: r.version || '',
        reviewerName: r.reviewer_name || '',
      };
    });
  }, [reviews, appName]);

  // Maintain editable row state in frontend memory without mutating original backend records
  const [rowData, setRowData] = useState<ExcelSpreadsheetRow[]>(initialRowData);

  // Keep rowData in sync when new reviews are generated
  React.useEffect(() => {
    setRowData(initialRowData);
    setDisplayedCount(initialRowData.length);
  }, [initialRowData]);

  // Compute average rating of visible rows
  const visibleAvgRating = useMemo(() => {
    if (rowData.length === 0) return '0.0';
    const sum = rowData.reduce((acc, r) => acc + (r.rating || 0), 0);
    return (sum / rowData.length).toFixed(1);
  }, [rowData]);

  // Column definitions for the Excel spreadsheet
  const columnDefs = useMemo<ColDef<ExcelSpreadsheetRow>[]>(() => {
    return [
      // Excel-style row number column (pinned left, non-movable)
      {
        headerName: '#',
        valueGetter: (params) => {
          return params.node && params.node.rowIndex != null ? params.node.rowIndex + 1 : '';
        },
        width: 55,
        pinned: 'left',
        lockPosition: 'left',
        suppressMovable: true,
        sortable: false,
        filter: false,
        resizable: false,
        cellClass: 'excel-row-index-cell text-center font-mono font-semibold text-slate-500 bg-slate-50 select-none border-r border-slate-300',
        headerClass: 'excel-header-center font-bold text-slate-700 bg-slate-100 border-r border-slate-300',
      },
      // Platform / Store Column
      {
        field: 'platform',
        headerName: 'Store',
        width: 145,
        pinned: 'left',
        sortable: true,
        filter: 'agTextColumnFilter',
        cellRenderer: (params: any) => {
          const isGoogle = params.data?.platformKey === 'google';
          return (
            <div className="flex items-center space-x-1.5 h-full">
              {isGoogle ? (
                <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Smartphone className="w-3 h-3 text-emerald-600" />
                  <span>Google Play</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  <Apple className="w-3 h-3 text-blue-600" />
                  <span>App Store</span>
                </span>
              )}
            </div>
          );
        },
      },
      // App Name
      {
        field: 'appName',
        headerName: 'App Name',
        width: 130,
        sortable: true,
        filter: 'agTextColumnFilter',
        cellClass: 'text-slate-800 font-medium',
      },
      // Rating (Numeric with stars)
      {
        field: 'rating',
        headerName: 'Rating',
        width: 110,
        sortable: true,
        filter: 'agNumberColumnFilter',
        editable: true,
        cellRenderer: (params: any) => {
          const val = Number(params.value || 0);
          return (
            <div className="flex items-center space-x-1 h-full">
              <span className="font-bold font-mono text-xs text-amber-900">{val.toFixed(1)}</span>
              <div className="flex items-center space-x-0.5 text-amber-400">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-2.5 h-2.5 ${val >= s ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                  />
                ))}
              </div>
            </div>
          );
        },
      },
      // Sentiment (Positive / Neutral / Negative)
      {
        field: 'sentiment',
        headerName: 'Sentiment',
        width: 120,
        sortable: true,
        filter: 'agTextColumnFilter',
        editable: true,
        cellRenderer: (params: any) => {
          const s = String(params.value || 'Neutral');
          const isPos = s.toLowerCase() === 'positive';
          const isNeg = s.toLowerCase() === 'negative';
          return (
            <div className="flex items-center h-full">
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                  isPos
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : isNeg
                    ? 'bg-rose-50 text-rose-800 border-rose-300'
                    : 'bg-amber-50 text-amber-800 border-amber-300'
                }`}
              >
                {s}
              </span>
            </div>
          );
        },
      },
      // Review Date
      {
        field: 'formattedDate',
        headerName: 'Review Date',
        width: 125,
        sortable: true,
        filter: 'agTextColumnFilter',
        cellClass: 'font-mono text-slate-600 text-xs',
        comparator: (d1, d2, nodeA, nodeB) => {
          const t1 = nodeA.data ? new Date(nodeA.data.date).getTime() : 0;
          const t2 = nodeB.data ? new Date(nodeB.data.date).getTime() : 0;
          return t1 - t2;
        },
      },
      // Review Title
      {
        field: 'title',
        headerName: 'Review Title',
        width: 180,
        sortable: true,
        filter: 'agTextColumnFilter',
        editable: true,
        cellClass: 'font-semibold text-slate-800',
      },
      // Full Review Text (with text wrap toggle)
      {
        field: 'text',
        headerName: 'Review Text',
        minWidth: 320,
        flex: 2,
        sortable: true,
        filter: 'agTextColumnFilter',
        editable: true,
        wrapText: wrapText,
        autoHeight: wrapText,
        cellClass: 'text-slate-700 leading-relaxed text-xs',
      },
      // App Version
      {
        field: 'version',
        headerName: 'Version',
        width: 105,
        sortable: true,
        filter: 'agTextColumnFilter',
        editable: true,
        cellClass: 'font-mono text-slate-600 text-xs',
      },
      // Reviewer Name
      {
        field: 'reviewerName',
        headerName: 'Reviewer Name',
        width: 140,
        sortable: true,
        filter: 'agTextColumnFilter',
        editable: true,
        cellClass: 'text-slate-700 font-medium text-xs',
      },
      // Review ID
      {
        field: 'id',
        headerName: 'Review ID',
        width: 150,
        sortable: true,
        filter: 'agTextColumnFilter',
        cellClass: 'font-mono text-[10px] text-slate-400 select-all',
      },
    ];
  }, [wrapText]);

  // Default Column Configuration
  const defaultColDef = useMemo<ColDef>(() => {
    return {
      resizable: true,
      sortable: true,
      filter: true,
      headerClass: 'excel-header-cell',
      cellClass: 'excel-grid-cell',
    };
  }, []);

  // Grid Ready Event Handler
  const onGridReady = useCallback((params: GridReadyEvent<ExcelSpreadsheetRow>) => {
    setGridApi(params.api);
    setDisplayedCount(params.api.getDisplayedRowCount());
  }, []);

  // Update visible row count whenever filters or search changes
  const onModelUpdated = useCallback(() => {
    if (gridApi) {
      setDisplayedCount(gridApi.getDisplayedRowCount());
    }
  }, [gridApi]);

  // Handle cell edit events (updates frontend React state)
  const onCellValueChanged = useCallback((event: CellValueChangedEvent<ExcelSpreadsheetRow>) => {
    const updatedData = event.data;
    setRowData((prev) =>
      prev.map((row) => (row.id === updatedData.id ? { ...updatedData } : row))
    );
  }, []);

  // Cell focus change for Excel-like formula bar cell indicator
  const onCellFocused = useCallback((params: any) => {
    if (params && params.column) {
      const colId = params.column.getColId();
      const rowIdx = (params.rowIndex != null ? params.rowIndex : 0) + 1;
      setSelectedCellInfo(`R${rowIdx}C:${colId}`);
    }
  }, []);

  // Global Quick Search Handler
  const handleQuickSearch = (value: string) => {
    setQuickSearchText(value);
    if (gridApi) {
      gridApi.setGridOption('quickFilterText', value);
    }
  };

  const handleClearSearch = () => {
    setQuickSearchText('');
    if (gridApi) {
      gridApi.setGridOption('quickFilterText', '');
    }
  };

  // Quick Sentiment Filter Buttons
  const handleSentimentFilter = (sentiment: string) => {
    setActiveSentimentFilter(sentiment);
    if (!gridApi) return;

    if (sentiment === 'all') {
      gridApi.setColumnFilterModel('sentiment', null).then(() => {
        gridApi.onFilterChanged();
      });
    } else {
      gridApi.setColumnFilterModel('sentiment', {
        type: 'equals',
        filter: sentiment,
      }).then(() => {
        gridApi.onFilterChanged();
      });
    }
  };

  // Clear all column filters
  const handleClearAllFilters = () => {
    if (!gridApi) return;
    gridApi.setFilterModel(null);
    setQuickSearchText('');
    setActiveSentimentFilter('all');
    gridApi.setGridOption('quickFilterText', '');
  };

  // Reset grid sorting
  const handleResetSorting = () => {
    if (!gridApi) return;
    gridApi.applyColumnState({
      defaultState: { sort: null },
    });
  };

  // Auto-size all columns to fit content
  const handleAutoSizeColumns = () => {
    if (!gridApi) return;
    gridApi.autoSizeAllColumns();
  };

  // Toggle Text Wrapping for Review Text
  const handleToggleWrapText = () => {
    setWrapText((prev) => !prev);
    setTimeout(() => {
      if (gridApi) {
        gridApi.resetRowHeights();
      }
    }, 50);
  };

  // Undo / Redo edits
  const handleUndo = () => {
    if (gridApi) {
      gridApi.undoCellEditing();
    }
  };

  const handleRedo = () => {
    if (gridApi) {
      gridApi.redoCellEditing();
    }
  };

  // Export Current View (Filtered, Sorted, Edited Data) to CSV with UTF-8 BOM
  const handleExportCurrentView = () => {
    if (!gridApi) return;
    const sanitizedApp = appName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = new Date().toISOString().split('T')[0];
    gridApi.exportDataAsCsv({
      fileName: `${sanitizedApp}_Reviews_CurrentView_${timestamp}.csv`,
      allColumns: true,
      skipColumnGroupHeaders: true,
      onlySelected: false,
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden flex flex-col font-sans">
      {/* 1. EXCEL-STYLE RIBBON / TITLE BAR */}
      <div className="bg-[#107c41] text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 select-none">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-xs flex items-center justify-center">
            <FileSpreadsheet className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-xs tracking-wide text-white uppercase">
                Microsoft Excel Worksheet
              </span>
              <span className="bg-emerald-900/60 text-emerald-200 text-[10px] px-1.5 py-0.2 rounded font-mono">
                .XLSX Live Grid
              </span>
            </div>
            <div className="text-[11px] text-emerald-100/90 font-medium">
              {appName} Review Data Workbook • AG Grid Virtualized Spreadsheet
            </div>
          </div>
        </div>

        {/* Top-Right Quick Links: Download Original vs Open in Excel Online */}
        <div className="flex items-center space-x-2">
          {onDownloadOriginal && (
            <button
              type="button"
              onClick={onDownloadOriginal}
              disabled={isDownloadingOriginal}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white text-[#107c41] hover:bg-emerald-50 rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-70"
              title="Download genuine backend-generated multi-sheet Excel (.xlsx) file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isDownloadingOriginal ? 'Downloading...' : 'Download Original Excel'}</span>
            </button>
          )}

          {excelOnlineUrl && (
            <a
              href={excelOnlineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white border border-emerald-600 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Open workbook directly in Microsoft Excel Online Viewer"
            >
              <span>Open in Excel Online</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* 2. EXCEL SPREADSHEET TOOLBAR */}
      <div className="bg-[#f8f9fa] border-b border-slate-200 p-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        {/* Left Section: Formula Bar / Quick Search Box */}
        <div className="flex items-center space-x-2 flex-1 min-w-[280px] max-w-md">
          {/* Cell Coordinate Box */}
          <div
            className="px-2 py-1 bg-white border border-slate-300 rounded text-[11px] font-mono text-slate-600 font-semibold select-none shadow-xs min-w-[65px] text-center"
            title="Active Cell Coordinate"
          >
            {selectedCellInfo}
          </div>

          {/* Search / Filter Input */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={quickSearchText}
              onChange={(e) => handleQuickSearch(e.target.value)}
              placeholder="Search across all columns (text, rating, author, id)..."
              className="w-full pl-8 pr-7 py-1 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-600 text-slate-800 placeholder-slate-400"
            />
            {quickSearchText && (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Center Section: Quick Sentiment Filter Chips */}
        <div className="flex items-center space-x-1">
          <span className="text-[11px] font-semibold text-slate-500 mr-1 select-none">Sentiment:</span>
          {[
            { id: 'all', label: 'All' },
            { id: 'Positive', label: 'Positive' },
            { id: 'Neutral', label: 'Neutral' },
            { id: 'Negative', label: 'Negative' },
          ].map((s) => {
            const isActive = activeSentimentFilter.toLowerCase() === s.id.toLowerCase();
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSentimentFilter(s.id)}
                className={`px-2.5 py-0.5 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Right Section: Spreadsheet Utility Controls */}
        <div className="flex items-center space-x-1.5 flex-wrap">
          {/* Undo / Redo */}
          <button
            type="button"
            onClick={handleUndo}
            title="Undo Edit (Ctrl+Z)"
            aria-label="Undo edit"
            className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded transition-colors cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            title="Redo Edit (Ctrl+Y)"
            aria-label="Redo edit"
            className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded transition-colors cursor-pointer"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          {/* Toggle Wrap Text */}
          <button
            type="button"
            onClick={handleToggleWrapText}
            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium border transition-colors cursor-pointer ${
              wrapText
                ? 'bg-emerald-50 text-emerald-800 border-emerald-400 font-semibold'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title="Toggle text wrapping for long review content"
          >
            <WrapText className="w-3.5 h-3.5 text-slate-500" />
            <span>Wrap Text</span>
          </button>

          {/* Auto-size Columns */}
          <button
            type="button"
            onClick={handleAutoSizeColumns}
            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-xs font-medium transition-colors cursor-pointer"
            title="Auto-fit column widths based on content"
          >
            <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Auto-Size</span>
          </button>

          {/* Reset Filters */}
          <button
            type="button"
            onClick={handleClearAllFilters}
            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-xs font-medium transition-colors cursor-pointer"
            title="Clear all active column filters"
          >
            <FilterX className="w-3.5 h-3.5 text-slate-500" />
            <span>Clear Filters</span>
          </button>

          {/* Reset Sorting */}
          <button
            type="button"
            onClick={handleResetSorting}
            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-xs font-medium transition-colors cursor-pointer"
            title="Reset all column sorting"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset Sort</span>
          </button>

          {/* Export Current View */}
          <button
            type="button"
            onClick={handleExportCurrentView}
            className="inline-flex items-center space-x-1.5 px-3 py-1 bg-[#107c41] hover:bg-[#0b5c30] text-white rounded text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Export the currently sorted/filtered dataset to CSV with Excel UTF-8 support"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Current View</span>
          </button>
        </div>
      </div>

      {/* 3. VIRTUALIZED AG GRID SPREADSHEET CONTAINER */}
      <div
        className="ag-theme-alpine w-full excel-spreadsheet-grid-wrapper"
        style={{ height: '540px', width: '100%' }}
      >
        <AgGridReact<ExcelSpreadsheetRow>
          ref={gridRef}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          onGridReady={onGridReady}
          onModelUpdated={onModelUpdated}
          onCellValueChanged={onCellValueChanged}
          onCellFocused={onCellFocused}
          rowSelection="single"
          enableCellTextSelection={true}
          ensureDomOrder={true}
          undoRedoCellEditing={true}
          undoRedoCellEditingLimit={20}
          animateRows={true}
          headerHeight={34}
          rowHeight={wrapText ? undefined : 36}
          suppressRowVirtualisation={false}
          suppressColumnVirtualisation={false}
          rowBuffer={15}
        />
      </div>

      {/* 4. EXCEL DESKTOP STATUS BAR */}
      <div className="bg-[#f3f2f1] border-t border-slate-300 px-4 py-1.5 flex flex-wrap items-center justify-between text-[11px] text-slate-600 select-none">
        <div className="flex items-center space-x-4">
          <span className="font-semibold text-emerald-800 flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block animate-pulse" />
            <span>Ready</span>
          </span>
          <span>
            Visible Records: <strong className="font-bold text-slate-800">{displayedCount}</strong> of{' '}
            <strong className="font-bold text-slate-800">{rowData.length}</strong> total
          </span>
          {displayedCount !== rowData.length && (
            <span className="text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded font-medium">
              Filtered ({rowData.length - displayedCount} hidden)
            </span>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <span>
            Average Rating: <strong className="font-bold text-amber-900">{visibleAvgRating}</strong> ★
          </span>
          <span>
            Store: <strong className="font-semibold text-slate-800">Both Android & iOS</strong>
          </span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-500 font-mono text-[10px]">
            Double-click cell to edit • Ctrl+C to copy • Tab/Arrows to navigate
          </span>
        </div>
      </div>
    </div>
  );
};
