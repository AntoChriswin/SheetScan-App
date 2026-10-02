import React from 'react';
import { SheetColumn, SheetRow } from '../types';
import { X, ScanLine, Keyboard, Barcode, Check } from 'lucide-react';

interface RowDetailModalProps {
  row: SheetRow;
  columns: SheetColumn[];
  barcodeColumn: string;
  onSelectBarcodeColumn: (colLetter: string) => void;
  onOpenScanner: () => void;
  onOpenManualEntry: () => void;
  onClose: () => void;
}

export const RowDetailModal: React.FC<RowDetailModalProps> = ({
  row,
  columns,
  barcodeColumn,
  onSelectBarcodeColumn,
  onOpenScanner,
  onOpenManualEntry,
  onClose
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-mono font-bold text-sm">
            #{row.spreadsheetRow}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Row Detail</h2>
            <p className="text-xs text-slate-400">Original Spreadsheet Row: {row.spreadsheetRow}</p>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Row Data</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {columns.map((col) => {
                const val = row.values[col.header] || '';
                const isBarcodeTarget = col.columnLetter === barcodeColumn;
                return (
                  <div key={col.columnIndex} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/60">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span>{col.header}</span>
                      <span className="font-mono text-[10px] px-1 rounded bg-slate-800 text-slate-500">
                        {col.columnLetter}
                      </span>
                    </div>
                    <div className={`text-sm truncate ${isBarcodeTarget ? 'font-mono font-semibold text-emerald-400' : 'text-slate-200'}`}>
                      {val || <span className="text-slate-600 italic">Empty</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Barcode className="w-4 h-4 text-emerald-400" />
              <span>Barcode Target Column</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {columns.map((col) => {
                const isSelected = barcodeColumn === col.columnLetter;
                return (
                  <button
                    key={col.columnLetter}
                    onClick={() => onSelectBarcodeColumn(col.columnLetter)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="truncate">{col.header} ({col.columnLetter})</span>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={onOpenScanner}
            className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <ScanLine className="w-5 h-5" />
            <span>Scan Barcode</span>
          </button>

          <button
            onClick={onOpenManualEntry}
            className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-all cursor-pointer border border-slate-700"
          >
            <Keyboard className="w-5 h-5 text-slate-400" />
            <span>Enter Manually</span>
          </button>
        </div>
      </div>
    </div>
  );
};
