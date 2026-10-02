# SheetScan

SheetScan is a production-quality, responsive web application designed for lightning-fast barcode entry into Google Sheets.

## Features

- **Google OAuth Authentication**: Secure sign-in using Google accounts with zero password storage.
- **Google Drive & Sheets Integration**: Browse real Google Sheets, select worksheets, and inspect real rows and columns.
- **Precise Row Mapping**: Preserves exact original Google Sheets row numbers (`spreadsheetRow`) regardless of filtering, sorting, pagination, or hidden columns.
- **Barcode Target Selection**: Automatically detects barcode columns or allows manual configuration.
- **Mobile-First Camera Scanner**: Supports EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, and ITF using browser camera APIs and ZXing.
- **Auto-Save & Manual-Save Modes**: Instantly update Google Sheets cells or batch save pending changes.
- **Safety Checks**: Existing value protection (replace confirmation), duplicate barcode detection, scan history, and audio/vibration feedback.

## Setup & Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start development server:
   ```bash
   npm run dev
   ```
3. Build for production:
   ```bash
   npm run build
   ```
