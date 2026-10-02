import React, { useState } from 'react';
import { ScanLine, FileSpreadsheet, History, Settings, LogOut, ChevronRight, User as UserIcon, Menu, X } from 'lucide-react';
import { User } from 'firebase/auth';

interface NavbarProps {
  user: User | null;
  currentSpreadsheetName?: string;
  currentSheetName?: string;
  activeTab: 'dashboard' | 'table' | 'history' | 'settings';
  setActiveTab: (tab: 'dashboard' | 'table' | 'history' | 'settings') => void;
  onLogout: () => void;
  pendingCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  currentSpreadsheetName,
  currentSheetName,
  activeTab,
  setActiveTab,
  onLogout,
  pendingCount = 0
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleTabClick = (tab: 'dashboard' | 'table' | 'history' | 'settings') => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md bg-slate-900/95 w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div
            onClick={() => handleTabClick('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer group shrink-0"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <ScanLine className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg text-white tracking-tight hidden xs:inline">SheetScan</span>
          </div>

          {currentSpreadsheetName && (
            <div className="hidden md:flex items-center gap-2 text-sm text-slate-400 pl-3 border-l border-slate-800 truncate">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-medium text-slate-200 truncate max-w-[180px]">{currentSpreadsheetName}</span>
              {currentSheetName && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <span className="text-slate-400 truncate max-w-[100px]">{currentSheetName}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Desktop Nav */}
        <nav className="hidden sm:flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => handleTabClick('dashboard')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'dashboard' || activeTab === 'table'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Sheets</span>
          </button>

          <button
            onClick={() => handleTabClick('history')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 relative ${
              activeTab === 'history'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <History className="w-4 h-4" />
            <span>History</span>
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-slate-950 font-bold text-xs rounded-full flex items-center justify-center shadow">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => handleTabClick('settings')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>

          {user && (
            <div className="flex items-center gap-3 pl-3 ml-2 border-l border-slate-800">
              <div className="flex items-center gap-2">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'User'} className="w-8 h-8 rounded-full border border-slate-700" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
              <button
                onClick={onLogout}
                title="Sign out"
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </nav>

        {/* Mobile Hamburger Button */}
        <div className="flex sm:hidden items-center gap-2">
          {user && (
            <div className="flex items-center">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'User'} className="w-7 h-7 rounded-full border border-slate-700" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
                  <UserIcon className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-slate-900 border-b border-slate-800 px-4 py-4 space-y-2 animate-fade-in shadow-xl">
          {currentSpreadsheetName && (
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 mb-3">
              <div className="text-[10px] uppercase font-semibold text-slate-500 mb-1">Active Spreadsheet</div>
              <div className="text-xs font-medium text-emerald-400 truncate">{currentSpreadsheetName}</div>
              {currentSheetName && <div className="text-xs text-slate-400 truncate mt-0.5">Tab: {currentSheetName}</div>}
            </div>
          )}

          <button
            onClick={() => handleTabClick('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'dashboard' || activeTab === 'table'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-5 h-5" />
            <span>Sheets & Spreadsheets</span>
          </button>

          <button
            onClick={() => handleTabClick('history')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <History className="w-5 h-5" />
              <span>Scan History</span>
            </div>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-full">
                {pendingCount} pending
              </span>
            )}
          </button>

          <button
            onClick={() => handleTabClick('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'settings'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </button>

          {user && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onLogout();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors border border-rose-500/20 mt-2"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign out</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
};
