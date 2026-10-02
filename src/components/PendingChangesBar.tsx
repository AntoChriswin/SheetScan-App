import React from 'react';
import { PendingScan } from '../types';
import { Save, AlertCircle } from 'lucide-react';

interface PendingChangesBarProps {
  pendingScans: PendingScan[];
  onSaveBatch: () => void;
  isSaving: boolean;
}

export const PendingChangesBar: React.FC<PendingChangesBarProps> = ({
  pendingScans,
  onSaveBatch,
  isSaving
}) => {
  if (pendingScans.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-xl w-full px-4 animate-slide-up">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4 backdrop-blur-md bg-slate-900/95">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-white">
              {pendingScans.length} unsaved {pendingScans.length === 1 ? 'change' : 'changes'}
            </h4>
            <p className="text-xs text-slate-400">Review pending barcode updates before syncing</p>
          </div>
        </div>

        <button
          onClick={onSaveBatch}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
        >
          <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
          <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>
    </div>
  );
};
