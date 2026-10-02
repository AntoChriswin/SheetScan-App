import React from 'react';
import { Worksheet } from '../types';
import { Table, ArrowLeft, ChevronRight, Hash, RefreshCw, AlertCircle, ShieldAlert } from 'lucide-react';

interface WorksheetSelectorProps {
  spreadsheetName: string;
  sheets: Worksheet[];
  isLoading: boolean;
  error?: string | null;
  onSelectSheet: (sheetName: string) => void;
  onBack: () => void;
  onRetry: () => void;
  onReauth?: () => void;
}

export const WorksheetSelector: React.FC<WorksheetSelectorProps> = ({
  spreadsheetName,
  sheets,
  isLoading,
  error,
  onSelectSheet,
  onBack,
  onRetry,
  onReauth
}) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Spreadsheets</span>
      </button>

      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">Select Worksheet</h1>
        <p className="text-sm text-slate-400">
          Spreadsheet: <span className="font-semibold text-slate-200">{spreadsheetName}</span>
        </p>
      </div>

      {error && (
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 mb-8 space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-white mb-1">Unable to load worksheets</h3>
              <p className="text-sm text-slate-300">{error}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-rose-500/20">
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-sm transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry</span>
            </button>
            {onReauth && (
              <button
                onClick={onReauth}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-all cursor-pointer border border-slate-700"
              >
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Re-authenticate with Google</span>
              </button>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-slate-900/30 border border-slate-800/80 rounded-2xl">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-4" />
          <h3 className="text-lg font-medium text-slate-200 mb-1">Loading worksheets...</h3>
          <p className="text-sm text-slate-500">Retrieving sheet structure from Google Sheets API</p>
        </div>
      ) : sheets.length === 0 && !error ? (
        <div className="text-center py-16 bg-slate-900/30 border border-slate-800/80 rounded-2xl">
          <Table className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-300 mb-1">No worksheets found</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
            This spreadsheet contains no accessible worksheets or tabs.
          </p>
          <button
            onClick={onRetry}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-medium text-slate-200 transition-colors"
          >
            Retry Loading
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sheets.map((sheet) => {
            const title = sheet.properties.title;
            const rowCount = sheet.properties.gridProperties?.rowCount;
            const colCount = sheet.properties.gridProperties?.columnCount;

            return (
              <div
                key={sheet.properties.sheetId}
                onClick={() => onSelectSheet(title)}
                className="group p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 transition-all cursor-pointer flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
                    <Table className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors text-base mb-1">
                      {title}
                    </h3>
                    {rowCount && colCount ? (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Hash className="w-3 h-3" />
                          {rowCount} rows × {colCount} cols
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">Worksheet tab</span>
                    )}
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 group-hover:bg-emerald-500 group-hover:text-slate-950 flex items-center justify-center transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
