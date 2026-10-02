import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ReplaceConfirmModalProps {
  currentValue: string;
  newValue: string;
  onReplace: () => void;
  onCancel: () => void;
}

export const ReplaceConfirmModal: React.FC<ReplaceConfirmModalProps> = ({
  currentValue,
  newValue,
  onReplace,
  onCancel
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Cell Already Contains Value</h2>
            <p className="text-xs text-slate-400">Confirm replacement before updating Google Sheets</p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Current Value in Cell</span>
              <p className="text-sm font-mono font-medium text-slate-300 mt-0.5">{currentValue || '(Empty)'}</p>
            </div>
            <div className="pt-3 border-t border-slate-800/80">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">New Barcode Value</span>
              <p className="text-sm font-mono font-bold text-emerald-400 mt-0.5">{newValue}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onReplace}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            Replace Value
          </button>
        </div>
      </div>
    </div>
  );
};
