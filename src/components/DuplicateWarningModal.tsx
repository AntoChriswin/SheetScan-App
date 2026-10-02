import React from 'react';
import { ShieldAlert, X } from 'lucide-react';

interface DuplicateWarningModalProps {
  barcode: string;
  existingRecordInfo?: { rowNumber: number; rowName: string };
  existingRecord?: { rowNumber: number; rowName: string };
  onUseAnyway: () => void;
  onScanAgain: () => void;
}

export const DuplicateWarningModal: React.FC<DuplicateWarningModalProps> = ({
  barcode,
  existingRecordInfo,
  existingRecord,
  onUseAnyway,
  onScanAgain
}) => {
  const record = existingRecordInfo || existingRecord || { rowNumber: 0, rowName: '' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={onScanAgain}
          className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Barcode Already Exists</h2>
            <p className="text-xs text-slate-400">This barcode was found elsewhere in the spreadsheet</p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Scanned Barcode</span>
              <p className="text-sm font-mono font-bold text-emerald-400">{barcode}</p>
            </div>
            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Existing Record Match</span>
              <p className="text-sm text-slate-200 mt-1">
                Found at Row <span className="font-mono font-semibold text-white">#{record.rowNumber}</span>
                {record.rowName ? ` (${record.rowName})` : ''}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onScanAgain}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm transition-colors cursor-pointer"
          >
            Scan Again
          </button>
          <button
            onClick={onUseAnyway}
            className="px-6 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-sm shadow-lg shadow-rose-500/20 transition-all cursor-pointer"
          >
            Use Anyway
          </button>
        </div>
      </div>
    </div>
  );
};
