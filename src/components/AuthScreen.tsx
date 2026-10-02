import React from 'react';
import { ScanLine, FileSpreadsheet, ShieldCheck, Zap } from 'lucide-react';

interface AuthScreenProps {
  onLogin: () => void;
  isLoading: boolean;
  error?: string | null;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, isLoading, error }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-slate-950">
      {/* Background gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl" />
      </div>

      <header className="relative z-10 max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-bold">
            <ScanLine className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">SheetScan</span>
        </div>
        <div className="text-xs text-slate-400 font-medium px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800">
          Google Sheets Barcode Entry
        </div>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12 flex flex-col items-center text-center my-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-8 animate-fade-in">
          <Zap className="w-4 h-4" />
          Lightning fast mobile & desktop barcode scanner for Google Sheets
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-3xl mb-6 bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
          Scan barcodes. Update Google Sheets. Done.
        </h1>

        <p className="text-lg text-slate-400 max-w-xl mb-10">
          Connect your Google account, select your spreadsheet and row, and instantly write barcodes directly into exact spreadsheet cells with zero manual friction.
        </p>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm max-w-md w-full">
            {error}
          </div>
        )}

        {/* Official Google Sign In Button */}
        <button
          onClick={onLogin}
          disabled={isLoading}
          className="gsi-material-button relative inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-base shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait cursor-pointer"
        >
          <div className="gsi-material-button-icon">
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-6 h-6">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              <path fill="none" d="M0 0h48v48H0z"></path>
            </svg>
          </div>
          <span>{isLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-20 w-full text-left">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-200 mb-1">Real Google Sheets</h3>
            <p className="text-sm text-slate-400">Direct integration with your real spreadsheets, worksheets, and exact row numbers.</p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center mb-4">
              <ScanLine className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-200 mb-1">Camera & Manual Scan</h3>
            <p className="text-sm text-slate-400">Supports EAN, UPC, Code 128, Code 39, and instant manual entry with fallback.</p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-200 mb-1">Secure & Reliable</h3>
            <p className="text-sm text-slate-400">Zero password storage, secure Google OAuth tokens, and robust conflict prevention.</p>
          </div>
        </div>
      </main>

      <footer className="relative z-10 max-w-7xl mx-auto w-full px-6 py-6 text-center text-xs text-slate-500 border-t border-slate-900">
        SheetScan — Built for Google Sheets productivity.
      </footer>
    </div>
  );
};
