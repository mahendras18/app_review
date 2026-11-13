import React from 'react';
import {
  RotateCw,
  Search,
  Smartphone,
  ChevronDown,
  Layers,
  Sparkles,
} from 'lucide-react';
import { AppConfig, COUNTRIES, PRESET_APPS } from '../types';

interface NavbarProps {
  appConfig: AppConfig;
  onOpenAppSelector: () => void;
  onSelectPreset: (preset: AppConfig) => void;
  onRefresh: () => void;
  isLoading: boolean;
  lastUpdated?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  appConfig,
  onOpenAppSelector,
  onSelectPreset,
  onRefresh,
  isLoading,
  lastUpdated,
}) => {
  const [presetDropdownOpen, setPresetDropdownOpen] = React.useState(false);
  const currentCountry = COUNTRIES.find((c) => c.code === appConfig.country) || COUNTRIES[0];

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm backdrop-blur-md bg-white/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Branding & App Title */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-slate-900 text-lg tracking-tight">AppReview Pulse</h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                Unified Analytics
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden md:block">
              Cross-Platform Store Intelligence & Reviews Monitor
            </p>
          </div>
        </div>

        {/* Center: Active App Pill & Quick Presets */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-slate-100 hover:bg-slate-200/80 transition-colors border border-slate-200 rounded-xl p-1.5 pl-3 space-x-3">
            <div className="flex items-center space-x-2">
              <Smartphone className="w-4 h-4 text-blue-600" />
              <div className="text-left">
                <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                  <span>{appConfig.name}</span>
                  <span className="text-xs" title={currentCountry.name}>{currentCountry.flag}</span>
                </div>
                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                  {appConfig.googleAppId && (
                    <span className="text-emerald-700 bg-emerald-50 px-1 rounded font-medium">GP</span>
                  )}
                  {appConfig.appleAppId && (
                    <span className="text-blue-700 bg-blue-50 px-1 rounded font-medium">iOS</span>
                  )}
                  <span>({currentCountry.code.toUpperCase()})</span>
                </div>
              </div>
            </div>

            <button
              onClick={onOpenAppSelector}
              className="flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white rounded-lg border border-slate-200 shadow-xs hover:text-blue-600 hover:border-blue-300 transition-colors"
              title="Change app or search stores"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Change</span>
            </button>
          </div>

          {/* Quick Presets Dropdown */}
          <div className="relative hidden lg:block">
            <button
              onClick={() => setPresetDropdownOpen(!presetDropdownOpen)}
              className="flex items-center space-x-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Presets</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {presetDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setPresetDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 overflow-hidden animate-fade-in">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Quick Sample Apps
                  </div>
                  {PRESET_APPS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => {
                        onSelectPreset(preset);
                        setPresetDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-blue-50 hover:text-blue-700 flex items-center justify-between transition-colors ${
                        preset.name === appConfig.name ? 'bg-blue-50/60 font-semibold text-blue-700' : 'text-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span>{COUNTRIES.find((c) => c.code === preset.country)?.flag}</span>
                        <span>{preset.name}</span>
                      </div>
                      {preset.name === 'boAt Hearables' && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                          Default
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: Refresh button and status */}
        <div className="flex items-center space-x-3">
          {lastUpdated && (
            <div className="hidden md:flex flex-col text-right">
              <span className="text-[10px] text-slate-400">Refreshed</span>
              <span className="text-xs text-slate-600 font-medium">
                {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          )}

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white shadow-sm transition-all ${
              isLoading
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-blue-500/20 hover:shadow-md'
            }`}
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Fetching...' : 'Refresh Data'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
