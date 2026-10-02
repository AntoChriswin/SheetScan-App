import React from 'react';
import { SheetColumn } from '../types';
import { ArrowLeft, CheckSquare, Square, Check, Barcode } from 'lucide-react';

interface ColumnSelectorProps {
  sheetName: string;
  columns: SheetColumn[];
  selectedColumnIndices: number[];
  onToggleColumn: (columnIndex: number) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onContinue: () => void;
  onBack: () => void;
  barcodeColumn: string;
  onSelectBarcodeColumn: (colLetter: string) => void;
}

export const ColumnSelector: React.FC<ColumnSelectorProps> = ({
  sheetName,
  columns,
  selectedColumnIndices,
  onToggleColumn,
  onSelectAll,
  onClearAll,
  onContinue,
  onBack,
  barcodeColumn,
  onSelectBarcodeColumn
}) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Worksheets</span>
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">Configure Columns & Target</h1>
          <p className="text-sm text-slate-400">
            Worksheet: <span className="font-semibold text-slate-200">{sheetName}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onSelectAll}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-800 transition-colors"
          >
            Select All
          </button>
          <button
            onClick={onClearAll}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-800 transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
            <h3 className="font-semibold text-slate-200 mb-4 flex items-center justify-between">
              <span>Display Columns</span>
              <span className="text-xs font-normal text-slate-400">
                {selectedColumnIndices.length} of {columns.length} selected
              </span>
            </h3>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {columns.map((col) => {
                const isSelected = selectedColumnIndices.includes(col.columnIndex);
                return (
                  <div
                    key={col.columnIndex}
                    onClick={() => onToggleColumn(col.columnIndex)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                        : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-mono text-xs font-semibold text-slate-300">
                        {col.columnLetter}
                      </span>
                      <span className="font-medium text-sm text-slate-200">{col.header}</span>
                    </div>

                    <div className="text-emerald-400">
                      {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-slate-600" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
            <h3 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
              <Barcode className="w-5 h-5 text-emerald-400" />
              <span>Barcode Target Column</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Select which spreadsheet column will receive the scanned barcode values.
            </p>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {columns.map((col) => {
                const isTarget = barcodeColumn === col.columnLetter;
                return (
                  <div
                    key={col.columnLetter}
                    onClick={() => onSelectBarcodeColumn(col.columnLetter)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                      isTarget
                        ? 'bg-emerald-500 text-slate-950 font-semibold border-emerald-400'
                        : 'bg-slate-900/40 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded flex items-center justify-center font-mono text-xs ${isTarget ? 'bg-slate-950 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                        {col.columnLetter}
                      </span>
                      <span className="text-sm">{col.header}</span>
                    </div>
                    {isTarget && <Check className="w-4 h-4" />}
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={onContinue}
            disabled={selectedColumnIndices.length === 0}
            className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-base shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue to Table
          </button>
        </div>
      </div>
    </div>
  );
};
