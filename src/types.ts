export interface SheetFile {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
  mimeType?: string;
}

export interface Worksheet {
  properties: {
    sheetId: number;
    title: string;
    index: number;
    gridProperties?: {
      rowCount: number;
      columnCount: number;
    };
  };
}

export interface SheetColumn {
  header: string;
  columnIndex: number; // 0-based index
  columnLetter: string; // 'A', 'B', 'C', etc.
}

export interface SheetRow {
  spreadsheetRow: number; // 1-based actual row number in Google Sheets
  values: Record<string, string>; // column header -> value
}

export interface PendingScan {
  id: string;
  spreadsheetId: string;
  sheetName: string;
  row: number;
  column: string;
  barcode: string;
  previousValue?: string;
  status: 'pending' | 'saving' | 'saved' | 'failed';
  createdAt: string;
  errorMessage?: string;
}

export interface ScanHistoryItem {
  id: string;
  timestamp: string;
  rowNumber: number;
  rowName: string;
  column: string;
  barcode: string;
  status: 'saved' | 'pending' | 'failed';
  previousValue?: string;
}

export interface ScannerConfig {
  barcodeColumn: string; // e.g. 'E'
  saveMode: 'auto' | 'manual';
  autoAdvance: boolean;
  preventDuplicates: boolean;
  overwriteExisting: 'ask' | 'always';
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}
