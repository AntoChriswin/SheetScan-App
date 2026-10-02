import React, { useEffect, useRef, useState } from 'react';
import { scannerService, playSuccessBeep, triggerVibration } from '../lib/scanner';
import { X, RefreshCw, Keyboard, Camera, Upload, AlertTriangle, CheckCircle, ArrowLeft } from 'lucide-react';

interface ScannerModalProps {
  onDetected: (barcode: string) => void;
  onOpenManualEntry: () => void;
  onClose: () => void;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

type ScanMode = 'select' | 'camera' | 'detecting' | 'success' | 'error';

export const ScannerModal: React.FC<ScannerModalProps> = ({
  onDetected,
  onOpenManualEntry,
  onClose,
  soundEnabled,
  vibrationEnabled
}) => {
  const [mode, setMode] = useState<ScanMode>('select');
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detectedBarcode, setDetectedBarcode] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const startCamera = async () => {
    setErrorMessage(null);
    if (!videoRef.current) {
      setTimeout(() => startCamera(), 100);
      return;
    }

    try {
      await scannerService.start(
        videoRef.current,
        (barcodeText) => {
          if (soundEnabled) playSuccessBeep();
          if (vibrationEnabled) triggerVibration();
          scannerService.stop();
          onDetected(barcodeText);
        },
        (err) => {
          console.error('Scanner error:', err);
          setErrorMessage('Camera access was denied or is unavailable on this device. Please check your browser permissions.');
        }
      );
    } catch (err: any) {
      console.error('Failed to start camera:', err);
      setErrorMessage(err.message || 'Camera is unavailable or permission denied.');
    }
  };

  useEffect(() => {
    if (mode === 'camera') {
      startCamera();
    } else {
      scannerService.stop();
    }
  }, [mode]);

  useEffect(() => {
    return () => {
      scannerService.stop();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file.');
      setMode('error');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setMode('detecting');
    setErrorMessage(null);

    try {
      const barcode = await scannerService.decodeFromImage(file);
      setDetectedBarcode(barcode);
      if (soundEnabled) playSuccessBeep();
      if (vibrationEnabled) triggerVibration();
      setMode('success');
    } catch (err: any) {
      console.error('Image decode error:', err);
      setErrorMessage(err.message || 'No barcode detected in this image.');
      setMode('error');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white animate-fade-in">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-slate-900/80 border-b border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-2">
          {mode === 'camera' || mode === 'detecting' || mode === 'success' || mode === 'error' ? (
            <button
              onClick={() => {
                scannerService.stop();
                if (previewUrl) URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
                setMode('select');
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors mr-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : null}
          <Camera className="w-5 h-5 text-emerald-400" />
          <h2 className="font-bold text-base">Scan Barcode</h2>
        </div>
        <button
          onClick={() => {
            scannerService.stop();
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            onClose();
          }}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main Content Area */}
      {mode === 'select' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold tracking-tight mb-2">Choose Scanning Method</h3>
            <p className="text-sm text-slate-400">Scan using your device camera or upload a barcode image.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mb-6">
            <button
              onClick={() => setMode('camera')}
              className="group p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 transition-all flex flex-col items-center text-center cursor-pointer shadow-sm hover:shadow-lg hover:shadow-emerald-500/5"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
                <Camera className="w-7 h-7" />
              </div>
              <h4 className="font-semibold text-white mb-1">Camera Scan</h4>
              <p className="text-xs text-slate-400">Scan using device camera</p>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="group p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 transition-all flex flex-col items-center text-center cursor-pointer shadow-sm hover:shadow-lg hover:shadow-emerald-500/5"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
                <Upload className="w-7 h-7" />
              </div>
              <h4 className="font-semibold text-white mb-1">Upload Image</h4>
              <p className="text-xs text-slate-400">Choose barcode image</p>
            </button>
          </div>

          <button
            onClick={() => {
              scannerService.stop();
              onClose();
              onOpenManualEntry();
            }}
            className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-sm transition-all border border-slate-800 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Keyboard className="w-4 h-4 text-emerald-400" />
            <span>Enter Barcode Manually</span>
          </button>
        </div>
      )}

      {mode === 'camera' && (
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            muted
            playsInline
          />

          {/* Scan overlay target box */}
          <div className="relative z-10 w-72 h-48 border-2 border-emerald-500 rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.3)] flex items-center justify-center pointer-events-none">
            <div className="absolute inset-x-0 top-1/2 h-0.5 bg-emerald-500/80 animate-pulse" />
            <div className="absolute -top-3 -left-3 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
            <div className="absolute -top-3 -right-3 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
            <div className="absolute -bottom-3 -left-3 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
            <div className="absolute -bottom-3 -right-3 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
          </div>

          {errorMessage && (
            <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Camera Error</h3>
              <p className="text-sm text-slate-400 max-w-sm mb-8">{errorMessage}</p>

              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
                <button
                  onClick={startCamera}
                  className="py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all"
                >
                  Try Again
                </button>
                <button
                  onClick={() => {
                    scannerService.stop();
                    onClose();
                    onOpenManualEntry();
                  }}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-all border border-slate-700"
                >
                  Enter Manually
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {mode === 'detecting' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full text-center">
          {previewUrl && (
            <div className="w-48 h-48 rounded-2xl overflow-hidden border border-slate-800 mb-6 bg-slate-900/50 shadow-md">
              <img src={previewUrl} alt="Uploaded barcode" className="w-full h-full object-contain" />
            </div>
          )}
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-4" />
          <h3 className="text-lg font-bold text-white mb-1">Detecting barcode...</h3>
          <p className="text-xs text-slate-400 mb-8">Analyzing image for barcode data</p>

          <button
            onClick={() => setMode('select')}
            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {mode === 'success' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Barcode Detected</h3>
          
          <div className="w-full p-4 rounded-2xl bg-slate-900 border border-slate-800 mb-6">
            <span className="font-mono text-xl font-bold text-emerald-400 tracking-wider">{detectedBarcode}</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              onClick={() => {
                scannerService.stop();
                if (previewUrl) URL.revokeObjectURL(previewUrl);
                onDetected(detectedBarcode);
              }}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-emerald-500/10 cursor-pointer"
            >
              Use Barcode
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-all border border-slate-700 cursor-pointer"
            >
              Scan Another Image
            </button>
          </div>
        </div>
      )}

      {mode === 'error' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full text-center">
          {previewUrl && (
            <div className="w-36 h-36 rounded-2xl overflow-hidden border border-slate-800 mb-6 bg-slate-900/50 shadow-md">
              <img src={previewUrl} alt="Uploaded barcode" className="w-full h-full object-contain opacity-70" />
            </div>
          )}
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No barcode detected</h3>
          <p className="text-xs text-slate-400 mb-6 max-w-xs">
            {errorMessage || 'Make sure the barcode is clearly visible, in focus, and not heavily cropped.'}
          </p>

          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all cursor-pointer"
            >
              Try Another Image
            </button>
            <button
              onClick={() => setMode('camera')}
              className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-all border border-slate-700 cursor-pointer"
            >
              Use Camera
            </button>
          </div>
        </div>
      )}

      {/* Footer bar for camera mode */}
      {mode === 'camera' && (
        <div className="p-6 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between backdrop-blur-md">
          <p className="text-xs text-slate-400">Align barcode within the target box to scan automatically.</p>
          <button
            onClick={() => {
              scannerService.stop();
              onClose();
              onOpenManualEntry();
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-colors border border-slate-700 cursor-pointer"
          >
            <Keyboard className="w-4 h-4" />
            <span>Manual Entry</span>
          </button>
        </div>
      )}
    </div>
  );
};
