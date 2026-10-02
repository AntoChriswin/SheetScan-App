import React, { useState } from 'react';
import { SheetFile } from '../types';
import { FileSpreadsheet, Search, RefreshCw, ChevronRight, Clock, ExternalLink } from 'lucide-react';

interface SpreadsheetListProps {
  spreadsheets: SheetFile[];
  isLoading: boolean;
  onRefresh: () => void;
  onSelectSpreadsheet: (sheet: SheetFile) => void;
  error?: string | null;
}

export const SpreadsheetList: React.FC<SpreadsheetListProps> = ({
  spreadsheets,
  isLoading,
  onRefresh,
  onSelectSpreadsheet,
  error
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSheets = spreadsheets.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">My Google Sheets</h1>
          <p className="text-sm text-slate-400 mt-1">Select a spreadsheet to start scanning and updating barcodes.</p>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 font-medium text-sm transition-all shadow-sm disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Sheets</span>
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
        <input
          type="text"
          placeholder="Search spreadsheets by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-12 pr-4 py-3.5 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
        />
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm mb-6">
          {error}
        </div>
      )}

      {isLoading && spreadsheets.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/60 animate-pulse h-36" />
          ))}
        </div>
      ) : filteredSheets.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/30 border border-slate-800/80 rounded-2xl">
          <FileSpreadsheet className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-300 mb-1">No Google Sheets found</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
            {searchQuery ? 'No spreadsheets match your search query.' : 'You have no Google Sheets in your Google Drive or access is restricted.'}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-medium text-slate-200 transition-colors"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSheets.map((sheet) => (
            <div
              key={sheet.id}
              onClick={() => onSelectSpreadsheet(sheet)}
              className="group p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 transition-all cursor-pointer flex flex-col justify-between shadow-sm hover:shadow-lg hover:shadow-emerald-500/5"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  {sheet.webViewLink && (
                    <a
                      href={sheet.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-slate-500 hover:text-slate-300 p-1 rounded-lg transition-colors"
                      title="Open in Google Sheets"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
                <h3 className="font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors line-clamp-2 mb-1">
                  {sheet.name}
                </h3>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800/80 mt-4 text-xs text-slate-500">
                {sheet.modifiedTime ? (
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(sheet.modifiedTime).toLocaleDateString()}</span>
                  </div>
                ) : (
                  <span>Google Sheet</span>
                )}
                <div className="flex items-center gap-1 text-emerald-400 font-medium group-hover:translate-x-1 transition-transform">
                  <span>Select</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
