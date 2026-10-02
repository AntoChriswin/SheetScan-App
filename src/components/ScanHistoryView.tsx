import React from 'react';
import { ScanHistoryItem } from '../types';
import { History, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface ScanHistoryViewProps {
  history: ScanHistoryItem[];
  onClearHistory: () => void;
}

export const ScanHistoryView: React.FC<ScanHistoryViewProps> = ({ history, onClearHistory }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Scan History</h1>
          <p className="text-sm text-slate-400 mt-1">Recent barcode scan and update session logs.</p>
        </div>

        {history.length > 0 && (
          <button
            onClick={onClearHistory}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-medium text-xs transition-colors"
          >
            Clear History
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/30 border border-slate-800/80 rounded-2xl">
          <History className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-300 mb-1">No scan history yet</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Scanned and updated barcodes will appear here during your session.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="divide-y divide-slate-800">
            {history.map((item) => (
              <div key={item.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/40 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                    {item.status === 'saved' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                    {item.status === 'pending' && <Clock className="w-5 h-5 text-amber-400" />}
                    {item.status === 'failed' && <AlertCircle className="w-5 h-5 text-rose-400" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-emerald-400 text-base">{item.barcode}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        Col {item.column}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300">
                      Row <span className="font-mono font-semibold">#{item.rowNumber}</span>
                      {item.rowName ? ` — ${item.rowName}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 text-xs text-slate-500 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                  <span>{item.timestamp}</span>
                  <span className={`px-2.5 py-1 rounded-full font-medium ${
                    item.status === 'saved'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : item.status === 'pending'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {item.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
