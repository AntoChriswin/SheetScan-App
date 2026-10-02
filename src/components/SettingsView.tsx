import React from 'react';
import { ScannerConfig } from '../types';
import { Settings, Save, Zap, Volume2, Vibrate, ShieldAlert, Repeat } from 'lucide-react';

interface SettingsViewProps {
  config: ScannerConfig;
  onChangeConfig: (newConfig: ScannerConfig) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ config, onChangeConfig }) => {
  const updateField = <K extends keyof ScannerConfig>(key: K, value: ScannerConfig[K]) => {
    onChangeConfig({
      ...config,
      [key]: value
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Scanner Settings</h1>
        <p className="text-sm text-slate-400 mt-1">Configure save modes, validation rules, and feedback preferences.</p>
      </div>

      <div className="space-y-6">
        {/* Save Mode */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h3 className="font-semibold text-slate-200 flex items-center gap-2">
            <Save className="w-5 h-5 text-emerald-400" />
            <span>Save Mode</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              onClick={() => updateField('saveMode', 'auto')}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                config.saveMode === 'auto'
                  ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="font-semibold text-sm mb-1 text-slate-200">Auto Save</div>
              <p className="text-xs text-slate-400">Instantly writes scanned barcode to Google Sheets upon detection.</p>
            </div>

            <div
              onClick={() => updateField('saveMode', 'manual')}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                config.saveMode === 'manual'
                  ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="font-semibold text-sm mb-1 text-slate-200">Manual Save</div>
              <p className="text-xs text-slate-400">Stores scans locally and allows batch updating multiple rows together.</p>
            </div>
          </div>
        </div>

        {/* Workflow behavior */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6">
          <h3 className="font-semibold text-slate-200 flex items-center gap-2">
            <Repeat className="w-5 h-5 text-sky-400" />
            <span>Workflow Behavior</span>
          </h3>

          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="font-medium text-sm text-slate-200 block">Auto Advance Row</span>
                <span className="text-xs text-slate-400">Automatically select the next row after a successful scan.</span>
              </div>
              <input
                type="checkbox"
                checked={config.autoAdvance}
                onChange={(e) => updateField('autoAdvance', e.target.checked)}
                className="w-5 h-5 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
              />
            </label>

            <div className="pt-4 border-t border-slate-800">
              <label className="block font-medium text-sm text-slate-200 mb-2">Existing Barcode Handling</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => updateField('overwriteExisting', 'ask')}
                  className={`p-3 rounded-xl border text-xs font-medium text-left transition-all ${
                    config.overwriteExisting === 'ask'
                      ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Ask before replacing existing value
                </button>
                <button
                  onClick={() => updateField('overwriteExisting', 'always')}
                  className={`p-3 rounded-xl border text-xs font-medium text-left transition-all ${
                    config.overwriteExisting === 'always'
                      ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Always replace without asking
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="font-medium text-sm text-slate-200 block">Duplicate Barcode Warning</span>
                  <span className="text-xs text-slate-400">Warn if scanned barcode already exists elsewhere in sheet.</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.preventDuplicates}
                  onChange={(e) => updateField('preventDuplicates', e.target.checked)}
                  className="w-5 h-5 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Feedback preferences */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h3 className="font-semibold text-slate-200 flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-400" />
            <span>Scan Feedback</span>
          </h3>

          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <Volume2 className="w-4 h-4 text-slate-400" />
                <div>
                  <span className="font-medium text-sm text-slate-200 block">Sound Beep</span>
                  <span className="text-xs text-slate-400">Play confirmation tone on successful scan.</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.soundEnabled}
                onChange={(e) => updateField('soundEnabled', e.target.checked)}
                className="w-5 h-5 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer pt-4 border-t border-slate-800">
              <div className="flex items-center gap-3">
                <Vibrate className="w-4 h-4 text-slate-400" />
                <div>
                  <span className="font-medium text-sm text-slate-200 block">Vibration Feedback</span>
                  <span className="text-xs text-slate-400">Vibrate mobile device on successful scan.</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.vibrationEnabled}
                onChange={(e) => updateField('vibrationEnabled', e.target.checked)}
                className="w-5 h-5 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
