import React, { useState } from 'react';
import {
  Search,
  X,
  Smartphone,
  Globe,
  Star,
  Check,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  AppConfig,
  COUNTRIES,
  Platform,
  PRESET_APPS,
  SearchResultItem,
} from '../types';
import { api } from '../services/api';

interface AppSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: AppConfig;
  onSaveConfig: (newConfig: AppConfig) => void;
}

export const AppSelectorModal: React.FC<AppSelectorModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  onSaveConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'manual' | 'presets'>('search');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchPlatform, setSearchPlatform] = useState<'both' | 'google' | 'apple'>('both');
  const [selectedCountry, setSelectedCountry] = useState(currentConfig.country);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Manual config state
  const [manualName, setManualName] = useState(currentConfig.name);
  const [manualGoogleId, setManualGoogleId] = useState(currentConfig.googleAppId);
  const [manualAppleId, setManualAppleId] = useState(currentConfig.appleAppId);
  const [manualCountry, setManualCountry] = useState(currentConfig.country);

  // Staged selections from search
  const [stagedGoogleApp, setStagedGoogleApp] = useState<{
    id: string;
    title: string;
    icon?: string | null;
  } | null>(
    currentConfig.googleAppId
      ? { id: currentConfig.googleAppId, title: currentConfig.name }
      : null
  );

  const [stagedAppleApp, setStagedAppleApp] = useState<{
    id: string;
    title: string;
    icon?: string | null;
  } | null>(
    currentConfig.appleAppId
      ? { id: currentConfig.appleAppId, title: currentConfig.name }
      : null
  );

  if (!isOpen) return null;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    try {
      const res = await api.searchApps(
        searchQuery.trim(),
        searchPlatform,
        selectedCountry
      );
      setSearchResults(res.results);
      if (res.results.length === 0) {
        setSearchError('No matching applications found on the selected store(s).');
      }
    } catch (err: any) {
      setSearchError(err.message || 'Failed to search store.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (item: SearchResultItem) => {
    if (item.platform === 'google') {
      setStagedGoogleApp({
        id: item.app_id,
        title: item.title,
        icon: item.icon,
      });
      // Also update manual input for consistency
      setManualGoogleId(item.app_id);
    } else {
      setStagedAppleApp({
        id: item.app_id,
        title: item.title,
        icon: item.icon,
      });
      setManualAppleId(item.app_id);
    }
  };

  const handleApplySelection = () => {
    const finalGoogleId = manualGoogleId.trim();
    const finalAppleId = manualAppleId.trim();

    if (!finalGoogleId && !finalAppleId) {
      alert('Please select or specify at least one store identifier (Google Play or Apple App Store).');
      return;
    }

    const appTitle =
      stagedGoogleApp?.title ||
      stagedAppleApp?.title ||
      manualName.trim() ||
      'Selected App';

    onSaveConfig({
      name: appTitle,
      googleAppId: finalGoogleId,
      appleAppId: finalAppleId,
      country: selectedCountry,
    });
    onClose();
  };

  const handlePresetSelect = (preset: AppConfig) => {
    onSaveConfig(preset);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">App Selection & Search</h2>
              <p className="text-xs text-slate-500">
                Search app stores or configure store identifiers for live scraping
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-4 border-b border-slate-200 flex space-x-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('search')}
            className={`pb-3 border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === 'search'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Store Search</span>
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            className={`pb-3 border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === 'manual'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Manual Identifiers</span>
          </button>

          <button
            onClick={() => setActiveTab('presets')}
            className={`pb-3 border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === 'presets'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Quick Presets</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* SEARCH TAB */}
          {activeTab === 'search' && (
            <div className="space-y-5">
              {/* Search Form Controls */}
              <form onSubmit={handleSearch} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                  {/* Query Input */}
                  <div className="md:col-span-6 relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Enter app name, package, or store URL..."
                      className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl outline-hidden text-slate-800"
                    />
                  </div>

                  {/* Platform Selector */}
                  <div className="md:col-span-3">
                    <select
                      value={searchPlatform}
                      onChange={(e) => setSearchPlatform(e.target.value as any)}
                      className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden text-slate-700 cursor-pointer"
                    >
                      <option value="both">Both Stores</option>
                      <option value="google">Google Play</option>
                      <option value="apple">App Store</option>
                    </select>
                  </div>

                  {/* Country Selector */}
                  <div className="md:col-span-3">
                    <select
                      value={selectedCountry}
                      onChange={(e) => setSelectedCountry(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden text-slate-700 cursor-pointer"
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.name} ({c.code.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSearching || !searchQuery.trim()}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
                  >
                    <span>{isSearching ? 'Searching Stores...' : 'Search Stores'}</span>
                  </button>
                </div>
              </form>

              {/* Current Staged Selection Bar */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Staged App Pair for Dashboard
                  </div>
                  <div className="flex items-center space-x-3 text-slate-700">
                    <div>
                      <span className="text-emerald-700 font-semibold">Google Play: </span>
                      <span className="font-mono text-slate-800">
                        {stagedGoogleApp ? stagedGoogleApp.id : '(Not selected)'}
                      </span>
                    </div>
                    <span>•</span>
                    <div>
                      <span className="text-blue-700 font-semibold">App Store: </span>
                      <span className="font-mono text-slate-800">
                        {stagedAppleApp ? stagedAppleApp.id : '(Not selected)'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleApplySelection}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                >
                  Load Analytics
                </button>
              </div>

              {/* Error Message */}
              {searchError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{searchError}</span>
                </div>
              )}

              {/* Search Results List */}
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-800">
                    Search Results ({searchResults.length})
                  </div>
                  <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-1">
                    {searchResults.map((item) => {
                      const isGoogle = item.platform === 'google';
                      const isSelected =
                        (isGoogle && stagedGoogleApp?.id === item.app_id) ||
                        (!isGoogle && stagedAppleApp?.id === item.app_id);

                      return (
                        <div
                          key={`${item.platform}-${item.app_id}`}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                            isSelected
                              ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-300'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            {item.icon ? (
                              <img
                                src={item.icon}
                                alt={item.title}
                                className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                                <Smartphone className="w-5 h-5" />
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-slate-900 text-xs truncate max-w-[240px]">
                                  {item.title}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                                    isGoogle
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-blue-50 text-blue-700 border-blue-200'
                                  }`}
                                >
                                  {isGoogle ? 'Play Store' : 'App Store'}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 truncate max-w-[240px]">
                                {item.developer || 'Unknown Developer'} •{' '}
                                <span className="font-mono text-slate-600">{item.app_id}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3 flex-shrink-0">
                            {item.score !== null && item.score !== undefined && (
                              <div className="flex items-center space-x-1 text-xs font-semibold text-slate-700">
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                <span>{item.score.toFixed(1)}</span>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => handleSelectSearchResult(item)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                isSelected
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              {isSelected ? (
                                <span className="flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" /> Selected
                                </span>
                              ) : (
                                `Select for ${isGoogle ? 'GP' : 'iOS'}`
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MANUAL IDENTIFIERS TAB */}
          {activeTab === 'manual' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 leading-relaxed">
                Provide store-specific package identifiers or store links directly. Identifiers on Google Play and Apple App Store are validated independently.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Friendly App Display Name
                </label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="e.g. boAt Hearables"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Google Play Package ID or URL
                  </label>
                  <input
                    type="text"
                    value={manualGoogleId}
                    onChange={(e) => setManualGoogleId(e.target.value)}
                    placeholder="e.g. com.boAt.hearables"
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Format: com.company.app or play.google.com URL
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Apple App Store ID or URL
                  </label>
                  <input
                    type="text"
                    value={manualAppleId}
                    onChange={(e) => setManualAppleId(e.target.value)}
                    placeholder="e.g. 1592550875"
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Format: 9 or 10-digit number or apps.apple.com URL
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Storefront Country
                </label>
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-hidden cursor-pointer"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.name} ({c.code.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleApplySelection}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                >
                  Save & Load Dashboard
                </button>
              </div>
            </div>
          )}

          {/* PRESETS TAB */}
          {activeTab === 'presets' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-600">
                Instantly switch to verified dual-platform applications:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PRESET_APPS.map((preset) => {
                  const country = COUNTRIES.find((c) => c.code === preset.country);
                  const isCurrent = preset.name === currentConfig.name;

                  return (
                    <div
                      key={preset.name}
                      onClick={() => handlePresetSelect(preset)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all hover:shadow-md ${
                        isCurrent
                          ? 'bg-blue-50/70 border-blue-400 ring-1 ring-blue-400'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-base">{country?.flag}</span>
                          <span className="font-bold text-slate-900 text-sm">
                            {preset.name}
                          </span>
                        </div>
                        {preset.name === 'boAt Hearables' && (
                          <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                            Specification Default
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] font-mono text-slate-500 space-y-0.5">
                        <div className="truncate">GP: {preset.googleAppId}</div>
                        <div className="truncate">iOS: {preset.appleAppId}</div>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-blue-600 font-semibold pt-2 border-t border-slate-100">
                        <span>{isCurrent ? 'Currently Active' : 'Load App'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
