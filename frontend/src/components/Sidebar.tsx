import React from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  Scale,
  Settings,
  Activity,
  ExternalLink,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { AppConfig } from '../types';

export type NavigationTab = 'overview' | 'reviews' | 'comparison' | 'settings';

interface SidebarProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  appConfig: AppConfig;
  backendOnline: boolean;
  reviewsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  appConfig,
  backendOnline,
  reviewsCount,
}) => {
  const navItems = [
    {
      id: 'overview' as NavigationTab,
      label: 'Overview',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'reviews' as NavigationTab,
      label: 'Recent Reviews',
      icon: MessageSquare,
      badge: reviewsCount > 0 ? `${reviewsCount}` : null,
    },
    {
      id: 'comparison' as NavigationTab,
      label: 'Platform Compare',
      icon: Scale,
      badge: null,
    },
    {
      id: 'settings' as NavigationTab,
      label: 'App Configuration',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col flex-shrink-0 min-h-[calc(100vh-4rem)]">
      {/* Navigation List */}
      <div className="p-4 space-y-1">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
          Analytics Views
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    isActive ? 'bg-blue-200/70 text-blue-800' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Target App Card */}
      <div className="p-4 mx-3 my-2 bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200 rounded-2xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Target App
          </span>
          <span className="inline-flex items-center text-[10px] text-emerald-700 font-medium bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
            Active
          </span>
        </div>
        <div className="text-sm font-bold text-slate-900 truncate mb-1">
          {appConfig.name}
        </div>
        <div className="text-[11px] text-slate-500 space-y-1">
          <div className="flex items-center justify-between">
            <span>Play Store:</span>
            <span className="font-mono text-slate-700 truncate max-w-[110px]" title={appConfig.googleAppId}>
              {appConfig.googleAppId ? appConfig.googleAppId.split('.').slice(-1)[0] : 'None'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>App Store:</span>
            <span className="font-mono text-slate-700 truncate max-w-[110px]" title={appConfig.appleAppId}>
              {appConfig.appleAppId || 'None'}
            </span>
          </div>
        </div>
      </div>

      {/* Store Information / System Status footer */}
      <div className="mt-auto p-4 border-t border-slate-200 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span
              className={`w-2 h-2 rounded-full ${
                backendOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="text-slate-600 text-[11px] font-medium">Backend API</span>
          </div>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              backendOnline
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {backendOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-[11px] text-slate-500 leading-relaxed">
          <div className="flex items-center space-x-1 font-semibold text-slate-700 mb-0.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Real Store Scraping</span>
          </div>
          Live data retrieved directly via Google Play & Apple RSS/Lookup APIs.
        </div>
      </div>
    </aside>
  );
};
