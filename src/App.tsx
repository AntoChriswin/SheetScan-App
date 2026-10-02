import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { initAuth, googleSignIn, getAccessToken, logout, setCachedAccessToken } from './lib/firebase';
import {
  fetchUserSpreadsheets,
  fetchSpreadsheetMetadata,
  fetchSheetData,
  updateCell,
  batchUpdateCells
} from './lib/googleSheets';
import {
  SheetFile,
  Worksheet,
  SheetColumn,
  SheetRow,
  ScannerConfig,
  ScanHistoryItem,
  PendingScan
} from './types';
import { AuthScreen } from './components/AuthScreen';
import { Navbar } from './components/Navbar';
import { SpreadsheetList } from './components/SpreadsheetList';
import { WorksheetSelector } from './components/WorksheetSelector';
import { ColumnSelector } from './components/ColumnSelector';
import { SheetTable } from './components/SheetTable';
import { RowDetailModal } from './components/RowDetailModal';
import { ScannerModal } from './components/ScannerModal';
import { ManualEntryModal } from './components/ManualEntryModal';
import { ReplaceConfirmModal } from './components/ReplaceConfirmModal';
import { DuplicateWarningModal } from './components/DuplicateWarningModal';
import { PendingChangesBar } from './components/PendingChangesBar';
import { ScanHistoryView } from './components/ScanHistoryView';
import { SettingsView } from './components/SettingsView';
import { ToastContainer, ToastMessage } from './components/Toast';

const DEFAULT_CONFIG: ScannerConfig = {
  barcodeColumn: 'E',
  saveMode: 'auto',
  autoAdvance: true,
  preventDuplicates: true,
  overwriteExisting: 'ask',
  soundEnabled: true,
  vibrationEnabled: true
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'table' | 'history' | 'settings'>('dashboard');
  
  // Spreadsheet navigation
  const [spreadsheets, setSpreadsheets] = useState<SheetFile[]>([]);
  const [isFetchingSheets, setIsFetchingSheets] = useState(false);
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState<SheetFile | null>(null);
  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [selectedSheetName, setSelectedSheetName] = useState<string | null>(null);

  // Sheet data
  const [columns, setColumns] = useState<SheetColumn[]>([]);
  const [selectedColumnIndices, setSelectedColumnIndices] = useState<number[]>([]);
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);

  // Scanner & Workflow state
  const [config, setConfig] = useState<ScannerConfig>(() => {
    const saved = localStorage.getItem('sheetscan_config');
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });

  const [selectedRow, setSelectedRow] = useState<SheetRow | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [replaceConfirmData, setReplaceConfirmData] = useState<{
    currentValue: string;
    newValue: string;
    row: SheetRow;
    barcode: string;
  } | null>(null);
  const [duplicateWarningData, setDuplicateWarningData] = useState<{
    barcode: string;
    existingRecord: { rowNumber: number; rowName: string };
    row: SheetRow;
  } | null>(null);

  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [pendingScans, setPendingScans] = useState<PendingScan[]>([]);
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', message: string, details?: string) => {
    const newToast: ToastMessage = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      message,
      details
    };
    setToasts((prev) => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    localStorage.setItem('sheetscan_config', JSON.stringify(config));
  }, [config]);

  // Initialize Auth
  useEffect(() => {
    const unsubscribe = initAuth(
      async (currentUser, token) => {
        setUser(currentUser);
        setCachedAccessToken(token);
        setNeedsAuth(false);
        loadSpreadsheets(token);
      },
      () => {
        setNeedsAuth(true);
        setUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    setAuthError(null);
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setCachedAccessToken(res.accessToken);
        setNeedsAuth(false);
        loadSpreadsheets(res.accessToken);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setAuthError(err.message || 'Google Sign-In failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setNeedsAuth(true);
    setSelectedSpreadsheet(null);
    setSelectedSheetName(null);
    setSpreadsheets([]);
  };

  const loadSpreadsheets = async (token?: string) => {
    const accessToken = token || (await getAccessToken());
    if (!accessToken) return;

    setIsFetchingSheets(true);
    try {
      const files = await fetchUserSpreadsheets(accessToken);
      setSpreadsheets(files);
    } catch (err: any) {
      console.error('Error fetching spreadsheets:', err);
      addToast('error', 'Failed to load Google Sheets', err.message);
    } finally {
      setIsFetchingSheets(false);
    }
  };

  const handleSelectSpreadsheet = async (sheet: SheetFile) => {
    const accessToken = await getAccessToken();
    if (!accessToken) return;

    console.log("Selected spreadsheet object:", sheet);
    console.log("Spreadsheet ID:", sheet.id);
    console.log("Spreadsheet name:", sheet.name);
    console.log("Spreadsheet MIME type:", sheet.mimeType);
    console.log("Sheets API URL:", `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheet.id)}?fields=spreadsheetId,properties,sheets.properties`);

    if (!sheet.id) {
      addToast('error', 'Selected spreadsheet has no valid spreadsheet ID.');
      return;
    }

    setSelectedSpreadsheet(sheet);
    setSelectedSheetName(null);
    setActiveTab('table');
    setIsDataLoading(true);
    setSheetError(null);
    try {
      const meta = await fetchSpreadsheetMetadata(accessToken, sheet.id);
      console.log("Sheets API Metadata Response:", meta);
      setWorksheets(meta.sheets || []);
    } catch (err: any) {
      console.error('Error fetching metadata:', err);
      const errMessage = err.message || 'Failed to load spreadsheet worksheets.';
      setSheetError(errMessage);
      addToast('error', 'Unable to load worksheets', errMessage);
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleSelectWorksheet = async (sheetName: string, spreadsheetIdOverride?: string) => {
    const sId = spreadsheetIdOverride || selectedSpreadsheet?.id;
    const accessToken = await getAccessToken();
    if (!accessToken || !sId) return;

    setSelectedSheetName(sheetName);
    setIsDataLoading(true);
    try {
      const data = await fetchSheetData(accessToken, sId, sheetName);
      setColumns(data.columns);
      setSelectedColumnIndices(data.columns.map((c) => c.columnIndex));
      setRows(data.rows);

      // Auto suggest barcode column
      const barcodeCol = data.columns.find((c) => {
        const h = c.header.toLowerCase();
        return h.includes('barcode') || h.includes('upc') || h.includes('ean') || h.includes('sku') || h.includes('code');
      });

      if (barcodeCol) {
        setConfig((prev) => ({ ...prev, barcodeColumn: barcodeCol.columnLetter }));
      }

      setActiveTab('table');
    } catch (err: any) {
      console.error('Error fetching sheet data:', err);
      addToast('error', 'Failed to load sheet data', err.message);
    } finally {
      setIsDataLoading(false);
    }
  };

  // Process and save barcode for selected row
  const processBarcodeSave = async (barcode: string, targetRow: SheetRow) => {
    if (!selectedSpreadsheet || !selectedSheetName) return;

    const targetCol = config.barcodeColumn;
    const currentValue = targetRow.values[columns.find((c) => c.columnLetter === targetCol)?.header || ''] || '';

    // Check existing value protection
    if (currentValue && config.overwriteExisting === 'ask' && !replaceConfirmData) {
      setReplaceConfirmData({
        currentValue,
        newValue: barcode,
        row: targetRow,
        barcode
      });
      return;
    }

    // Check duplicate detection
    if (config.preventDuplicates && !duplicateWarningData) {
      const duplicate = rows.find((r) => {
        if (r.spreadsheetRow === targetRow.spreadsheetRow) return false;
        const val = r.values[columns.find((c) => c.columnLetter === targetCol)?.header || ''];
        return val && val.trim().toLowerCase() === barcode.trim().toLowerCase();
      });

      if (duplicate) {
        const nameCol = columns.find((c) => c.header.toLowerCase().includes('name') || c.header.toLowerCase().includes('item'));
        const rowName = nameCol ? duplicate.values[nameCol.header] : '';
        setDuplicateWarningData({
          barcode,
          existingRecord: { rowNumber: duplicate.spreadsheetRow, rowName },
          row: targetRow
        });
        return;
      }
    }

    if (config.saveMode === 'auto') {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        addToast('error', 'Authentication expired', 'Please sign in again.');
        return;
      }

      try {
        await updateCell(
          accessToken,
          selectedSpreadsheet.id,
          selectedSheetName,
          targetRow.spreadsheetRow,
          targetCol,
          barcode
        );

        // Update local rows state
        const colHeader = columns.find((c) => c.columnLetter === targetCol)?.header;
        if (colHeader) {
          setRows((prevRows) =>
            prevRows.map((r) =>
              r.spreadsheetRow === targetRow.spreadsheetRow
                ? { ...r, values: { ...r.values, [colHeader]: barcode } }
                : r
            )
          );
        }

        addToast('success', `Barcode saved to ${targetCol}${targetRow.spreadsheetRow}`, barcode);

        // Add to history
        const nameCol = columns.find((c) => c.header.toLowerCase().includes('name'));
        const rowName = nameCol ? targetRow.values[nameCol.header] : '';
        setHistory((prev) => [
          {
            id: Math.random().toString(36).substring(2, 9),
            timestamp: new Date().toLocaleTimeString(),
            rowNumber: targetRow.spreadsheetRow,
            rowName,
            column: targetCol,
            barcode,
            status: 'saved',
            previousValue: currentValue
          },
          ...prev
        ]);

        // Auto advance row if enabled
        if (config.autoAdvance) {
          const nextRow = rows.find((r) => r.spreadsheetRow === targetRow.spreadsheetRow + 1);
          if (nextRow) {
            setSelectedRow(nextRow);
          } else {
            setSelectedRow(null);
            setShowRowDetailModal(false);
          }
        } else {
          setSelectedRow(null);
        }
      } catch (err: any) {
        console.error('Failed to save barcode:', err);
        addToast('error', 'Unable to save changes', err.message);
      }
    } else {
      // Manual save mode: add to pending scans
      const newPending: PendingScan = {
        id: Math.random().toString(36).substring(2, 9),
        spreadsheetId: selectedSpreadsheet.id,
        sheetName: selectedSheetName,
        row: targetRow.spreadsheetRow,
        column: targetCol,
        barcode,
        previousValue: currentValue,
        status: 'pending',
        createdAt: new Date().toLocaleTimeString()
      };

      setPendingScans((prev) => [...prev, newPending]);
      addToast('info', `Stored pending scan for row #${targetRow.spreadsheetRow}`, barcode);

      // Add to history
      const nameCol = columns.find((c) => c.header.toLowerCase().includes('name'));
      const rowName = nameCol ? targetRow.values[nameCol.header] : '';
      setHistory((prev) => [
        {
          id: Math.random().toString(36).substring(2, 9),
          timestamp: new Date().toLocaleTimeString(),
          rowNumber: targetRow.spreadsheetRow,
          rowName,
          column: targetCol,
          barcode,
          status: 'pending',
          previousValue: currentValue
        },
        ...prev
      ]);

      if (config.autoAdvance) {
        const nextRow = rows.find((r) => r.spreadsheetRow === targetRow.spreadsheetRow + 1);
        if (nextRow) {
          setSelectedRow(nextRow);
        } else {
          setSelectedRow(null);
        }
      } else {
        setSelectedRow(null);
      }
    }

    setShowScanner(false);
    setShowManualEntry(false);
    setReplaceConfirmData(null);
    setDuplicateWarningData(null);
  };

  const handleSaveBatch = async () => {
    if (pendingScans.length === 0 || !selectedSpreadsheet || !selectedSheetName) return;

    const accessToken = await getAccessToken();
    if (!accessToken) return;

    setIsSavingBatch(true);
    try {
      const updates = pendingScans.map((p) => ({
        rowNumber: p.row,
        columnLetter: p.column,
        value: p.barcode
      }));

      await batchUpdateCells(accessToken, selectedSpreadsheet.id, selectedSheetName, updates);

      addToast('success', `Successfully saved ${pendingScans.length} pending scans to Google Sheets!`);
      setPendingScans([]);
      
      // Reload sheet data
      const data = await fetchSheetData(accessToken, selectedSpreadsheet.id, selectedSheetName);
      setRows(data.rows);
    } catch (err: any) {
      console.error('Batch update failed:', err);
      addToast('error', 'Batch update failed', err.message);
    } finally {
      setIsSavingBatch(false);
    }
  };

  const setShowRowDetailModal = (show: boolean) => {
    if (!show) setSelectedRow(null);
  };

  if (needsAuth) {
    return (
      <>
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
        <AuthScreen onLogin={handleGoogleLogin} isLoading={isLoggingIn} error={authError} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      <Navbar
        user={user}
        currentSpreadsheetName={selectedSpreadsheet?.name}
        currentSheetName={selectedSheetName || undefined}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        pendingCount={pendingScans.length}
      />

      <main className="flex-1">
        {activeTab === 'dashboard' && (
          <SpreadsheetList
            spreadsheets={spreadsheets}
            isLoading={isFetchingSheets}
            onRefresh={() => loadSpreadsheets()}
            onSelectSpreadsheet={handleSelectSpreadsheet}
          />
        )}

        {activeTab === 'table' && selectedSpreadsheet && (
          !selectedSheetName ? (
            <WorksheetSelector
              spreadsheetName={selectedSpreadsheet.name}
              sheets={worksheets}
              isLoading={isDataLoading}
              error={sheetError}
              onSelectSheet={(name) => handleSelectWorksheet(name)}
              onBack={() => setActiveTab('dashboard')}
              onRetry={() => handleSelectSpreadsheet(selectedSpreadsheet)}
              onReauth={handleGoogleLogin}
            />
          ) : (
            <SheetTable
              sheetName={selectedSheetName}
              columns={columns}
              selectedColumnIndices={selectedColumnIndices}
              rows={rows}
              barcodeColumn={config.barcodeColumn}
              onSelectRow={(row) => setSelectedRow(row)}
              onBack={() => {
                setSelectedSheetName(null);
              }}
              onOpenScanner={() => {
                // If no row selected, default to first row or prompt
                if (!selectedRow && rows.length > 0) {
                  setSelectedRow(rows[0]);
                }
                setShowScanner(true);
              }}
            />
          )
        )}

        {activeTab === 'history' && (
          <ScanHistoryView
            history={history}
            onClearHistory={() => setHistory([])}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            config={config}
            onChangeConfig={(newCfg) => setConfig(newCfg)}
          />
        )}
      </main>

      {/* Row Detail Modal */}
      {selectedRow && (
        <RowDetailModal
          row={selectedRow}
          columns={columns}
          barcodeColumn={config.barcodeColumn}
          onSelectBarcodeColumn={(colLetter) => setConfig((prev) => ({ ...prev, barcodeColumn: colLetter }))}
          onOpenScanner={() => setShowScanner(true)}
          onOpenManualEntry={() => setShowManualEntry(true)}
          onClose={() => setSelectedRow(null)}
        />
      )}

      {/* Scanner Modal */}
      {showScanner && (
        <ScannerModal
          onDetected={(barcode) => {
            if (selectedRow) {
              processBarcodeSave(barcode, selectedRow);
            }
          }}
          onOpenManualEntry={() => setShowManualEntry(true)}
          onClose={() => setShowScanner(false)}
          soundEnabled={config.soundEnabled}
          vibrationEnabled={config.vibrationEnabled}
        />
      )}

      {/* Manual Entry Modal */}
      {showManualEntry && (
        <ManualEntryModal
          onSave={(barcode) => {
            if (selectedRow) {
              processBarcodeSave(barcode, selectedRow);
            }
          }}
          onClose={() => setShowManualEntry(false)}
        />
      )}

      {/* Replace Confirmation Modal */}
      {replaceConfirmData && (
        <ReplaceConfirmModal
          currentValue={replaceConfirmData.currentValue}
          newValue={replaceConfirmData.newValue}
          onReplace={() => {
            const data = replaceConfirmData;
            setReplaceConfirmData(null);
            processBarcodeSave(data.newValue, data.row);
          }}
          onCancel={() => setReplaceConfirmData(null)}
        />
      )}

      {/* Duplicate Warning Modal */}
      {duplicateWarningData && (
        <DuplicateWarningModal
          barcode={duplicateWarningData.barcode}
          existingRecord={duplicateWarningData.existingRecord}
          onUseAnyway={() => {
            const data = duplicateWarningData;
            setDuplicateWarningData(null);
            processBarcodeSave(data.barcode, data.row);
          }}
          onScanAgain={() => setDuplicateWarningData(null)}
        />
      )}

      {/* Manual Save Pending Changes Bar */}
      <PendingChangesBar
        pendingScans={pendingScans}
        onSaveBatch={handleSaveBatch}
        isSaving={isSavingBatch}
      />
    </div>
  );
}
