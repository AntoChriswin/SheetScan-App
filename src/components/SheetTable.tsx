import React, { useState } from 'react';
import { SheetColumn, SheetRow } from '../types';
import { Search, ArrowLeft, ScanLine, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';

interface SheetTableProps {
  sheetName: string;
  columns: SheetColumn[];
  selectedColumnIndices: number[];
  rows: SheetRow[];
  barcodeColumn: string;
  onSelectRow: (row: SheetRow) => void;
  onBack: () => void;
  onOpenScanner: () => void;
}

export const SheetTable: React.FC<SheetTableProps> = ({
  sheetName,
  columns,
  selectedColumnIndices,
  rows,
  barcodeColumn,
  onSelectRow,
  onBack,
  onOpenScanner
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 25;

  const displayedColumns = columns.filter((col) => selectedColumnIndices.includes(col.columnIndex));

  // Filter rows by search query across displayed fields
  const filteredRows = rows.filter((row) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return displayedColumns.some((col) => {
      const val = row.values[col.header] || '';
      return val.toLowerCase().includes(q);
    });
  });

  const totalPages = Math.ceil(filteredRows.length / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentRows = filteredRows.slice(startIndex, startIndex + rowsPerPage);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 sm:pb-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Change Columns</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{sheetName}</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Target Column for Barcode: <span className="font-semibold text-emerald-400 font-mono">{barcodeColumn}</span>
          </p>
        </div>

        <button
          onClick={onOpenScanner}
          className="hidden sm:inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
        >
          <ScanLine className="w-5 h-5" />
          <span>Open Barcode Scanner</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search rows..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="text-xs text-slate-400">
          Showing {filteredRows.length} {filteredRows.length === 1 ? 'row' : 'rows'} (Original row numbers preserved)
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900 sticky top-0 z-10 text-xs font-semibold text-slate-400 uppercase tracking-wider shadow-sm">
                <th className="py-3.5 px-4 w-20">Row</th>
                {displayedColumns.map((col) => (
                  <th key={col.columnIndex} className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span>{col.header}</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">
                        {col.columnLetter}
                      </span>
                    </div>
                  </th>
                ))}
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-sm">
              {currentRows.length === 0 ? (
                <tr>
                  <td colSpan={displayedColumns.length + 2} className="text-center py-12 text-slate-500">
                    No matching rows found.
                  </td>
                </tr>
              ) : (
                currentRows.map((row) => (
                  <tr
                    key={row.spreadsheetRow}
                    onClick={() => onSelectRow(row)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-500 font-semibold">
                      #{row.spreadsheetRow}
                    </td>
                    {displayedColumns.map((col) => {
                      const val = row.values[col.header] || '';
                      const isBarcodeCol = col.columnLetter === barcodeColumn;
                      return (
                        <td
                          key={col.columnIndex}
                          className={`py-3.5 px-4 ${isBarcodeCol ? 'font-mono font-medium text-emerald-400' : 'text-slate-300'}`}
                        >
                          {val !== '' ? (
                            val
                          ) : (
                            <span className="text-slate-600 italic">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-3.5 px-4 text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>Select</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/40">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-medium text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <span className="text-xs text-slate-400">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-medium text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Mobile Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 inset-x-0 z-30 p-4 bg-slate-950/90 border-t border-slate-800 backdrop-blur-md flex sm:hidden items-center justify-between gap-3 shadow-2xl">
        <div className="text-xs text-slate-400 truncate">
          Target: <span className="text-emerald-400 font-mono font-bold">{barcodeColumn}</span>
        </div>
        <button
          onClick={onOpenScanner}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all cursor-pointer shrink-0"
        >
          <ScanLine className="w-5 h-5" />
          <span>Scan Barcode</span>
        </button>
      </div>
    </div>
  );
};
