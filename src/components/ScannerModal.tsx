import React, { useEffect, useRef, useState } from 'react';
import { scannerService, playSuccessBeep, triggerVibration, DebugInfo } from '../lib/scanner';
import { decodeCapturedBarcode, BarcodeResult } from '../lib/cameraBarcodeDecoder';
import { X, RefreshCw, Keyboard, Camera, Upload, AlertTriangle, CheckCircle, ArrowLeft, Zap, ZoomIn, ZoomOut, Bug, Camera as CameraSwitch, CameraIcon, FileCheck, List } from 'lucide-react';

interface ScannerModalProps {
  onDetected: (barcode: string) => void;
  onOpenManualEntry: () => void;
  onClose: () => void;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

type ScanMode = 'select' | 'camera' | 'processing' | 'success' | 'multiple' | 'error' | 'detecting';

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
  const roiRef = useRef<HTMLDivElement>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detectedBarcode, setDetectedBarcode] = useState<string>('');
  const [multipleResults, setMultipleResults] = useState<BarcodeResult[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Camera UI states
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [zoomSupported, setZoomSupported] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [debugMode, setDebugMode] = useState(false);
  const [debugInfo, setDebugInfo] = useState<Partial<DebugInfo>>({});
  const [decoderDebugLogs, setDecoderDebugLogs] = useState<string[]>([]);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  
  // Debug capture states
  const [debugCropDetails, setDebugCropDetails] = useState<any>(null);

  // Ref to hold the captured canvases for the test button
  const capturedCanvasesRef = useRef<{ roi: HTMLCanvasElement, full: HTMLCanvasElement } | null>(null);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devices => {
       const cameras = devices.filter(d => d.kind === 'videoinput');
       setAvailableCameras(cameras);
    }).catch(() => {});
  }, []);

  const checkCapabilities = () => {
    const caps = scannerService.getCapabilities();
    if (caps) {
      setTorchSupported(!!(caps as any).torch);
      setZoomSupported(!!(caps as any).zoom);
    }
  };

  const startCamera = async (cameraId?: string) => {
    setErrorMessage(null);
    if (!videoRef.current) {
      setTimeout(() => startCamera(cameraId), 100);
      return;
    }

    try {
      await scannerService.startCamera(videoRef.current, cameraId);
      setTimeout(checkCapabilities, 500);
    } catch (err: any) {
      console.error('Failed to start camera:', err);
      setErrorMessage(err.message || 'Camera is unavailable or permission denied.');
    }
  };

  useEffect(() => {
    if (mode === 'camera') {
      startCamera(selectedCameraId || undefined);
    } else if (mode === 'select' || mode === 'detecting') {
      scannerService.stop();
    }
  }, [mode, selectedCameraId]);

  useEffect(() => {
    return () => {
      scannerService.stop();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleTorchToggle = async () => {
    const newState = !torchEnabled;
    const success = await scannerService.setTorch(newState);
    if (success) setTorchEnabled(newState);
  };

  const handleZoom = async (delta: number) => {
    const newZoom = Math.max(1, Math.min(10, zoomLevel + delta));
    const success = await scannerService.setZoom(newZoom);
    if (success) setZoomLevel(newZoom);
  };
  
  const handleCameraSwitch = () => {
     if (availableCameras.length < 2) return;
     const currentIndex = availableCameras.findIndex(c => c.deviceId === selectedCameraId);
     const nextIndex = (currentIndex + 1) % availableCameras.length;
     setSelectedCameraId(availableCameras[nextIndex].deviceId);
  };

  const executeDecodeFlow = async (roiCanvas: HTMLCanvasElement, fullCanvas: HTMLCanvasElement) => {
    setMode('processing');
    setDecoderDebugLogs([]);

    try {
      // Use the completely isolated cameraBarcodeDecoder which implements its own logic
      const response = await decodeCapturedBarcode(roiCanvas);
      
      if (response.debugLog) {
         setDecoderDebugLogs(response.debugLog);
      }

      if (response.success && response.results.length > 0) {
        if (soundEnabled) playSuccessBeep();
        if (vibrationEnabled) triggerVibration();

        if (response.results.length === 1) {
           setDetectedBarcode(response.results[0].value);
           setMode('success');
        } else {
           setMultipleResults(response.results);
           setMode('multiple');
        }
      } else {
        // Optional fallback to fullCanvas here if needed
        const fallbackResponse = await decodeCapturedBarcode(fullCanvas);
        if (fallbackResponse.debugLog) {
           setDecoderDebugLogs(prev => [...prev, '--- FALLBACK TO FULL FRAME ---', ...fallbackResponse.debugLog]);
        }

        if (fallbackResponse.success && fallbackResponse.results.length > 0) {
           if (soundEnabled) playSuccessBeep();
           if (vibrationEnabled) triggerVibration();
           
           if (fallbackResponse.results.length === 1) {
              setDetectedBarcode(fallbackResponse.results[0].value);
              setMode('success');
           } else {
              setMultipleResults(fallbackResponse.results);
              setMode('multiple');
           }
        } else {
           setErrorMessage(response.error || 'Barcode not detected. Align the entire barcode inside the box and try again.');
           setMode('error');
        }
      }
    } catch (err: any) {
      console.error('Decode error:', err);
      setErrorMessage(err.message || 'Error occurred during decoding.');
      setMode('error');
    }
  };

  const handleCapture = async () => {
    if (!videoRef.current || !roiRef.current) return;
    const video = videoRef.current;
    
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setErrorMessage('Camera not ready yet.');
      return;
    }

    const videoRect = video.getBoundingClientRect();
    const roiRect = roiRef.current.getBoundingClientRect();

    const containerWidth = videoRect.width;
    const containerHeight = videoRect.height;
    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;

    const scale = Math.max(containerWidth / sourceWidth, containerHeight / sourceHeight);
    
    const renderedWidth = sourceWidth * scale;
    const renderedHeight = sourceHeight * scale;

    const offsetX = (renderedWidth - containerWidth) / 2;
    const offsetY = (renderedHeight - containerHeight) / 2;

    const displayX = roiRect.left - videoRect.left;
    const displayY = roiRect.top - videoRect.top;

    let sourceX = (displayX + offsetX) / scale;
    let sourceY = (displayY + offsetY) / scale;
    let sourceW = roiRect.width / scale;
    let sourceH = roiRect.height / scale;

    const isMirrored = window.getComputedStyle(video).transform.includes('matrix(-1');
    if (isMirrored) {
       sourceX = sourceWidth - sourceX - sourceW;
    }

    // Add 10% padding
    const paddingX = sourceW * 0.10;
    const paddingY = sourceH * 0.10;
    sourceX -= paddingX;
    sourceY -= paddingY;
    sourceW += paddingX * 2;
    sourceH += paddingY * 2;

    // Clamp coordinates
    sourceX = Math.max(0, sourceX);
    sourceY = Math.max(0, sourceY);
    if (sourceX + sourceW > sourceWidth) sourceW = sourceWidth - sourceX;
    if (sourceY + sourceH > sourceHeight) sourceH = sourceHeight - sourceY;

    // 1. Create ROI canvas
    const roiCanvas = document.createElement('canvas');
    roiCanvas.width = Math.round(sourceW);
    roiCanvas.height = Math.round(sourceH);
    const roiCtx = roiCanvas.getContext('2d', { willReadFrequently: true });
    if (roiCtx) {
       roiCtx.drawImage(
         video, 
         sourceX, sourceY, sourceW, sourceH,
         0, 0, roiCanvas.width, roiCanvas.height
       );
    }

    // 2. Create Full Frame canvas (for fallback)
    const fullCanvas = document.createElement('canvas');
    fullCanvas.width = sourceWidth;
    fullCanvas.height = sourceHeight;
    const fullCtx = fullCanvas.getContext('2d', { willReadFrequently: true });
    if (fullCtx) {
       fullCtx.drawImage(video, 0, 0);
    }
    
    capturedCanvasesRef.current = { roi: roiCanvas, full: fullCanvas };

    const capturedRoiDataUrl = roiCanvas.toDataURL('image/png');
    
    // Display ONLY the captured ROI to user
    setPreviewUrl(capturedRoiDataUrl);
    
    setDebugCropDetails({
       videoDisplay: `${containerWidth.toFixed(0)}x${containerHeight.toFixed(0)}`,
       roiDisplay: `x:${displayX.toFixed(0)} y:${displayY.toFixed(0)} w:${roiRect.width.toFixed(0)} h:${roiRect.height.toFixed(0)}`,
       sourceCrop: `x:${sourceX.toFixed(0)} y:${sourceY.toFixed(0)} w:${sourceW.toFixed(0)} h:${sourceH.toFixed(0)}`
    });
    
    executeDecodeFlow(roiCanvas, fullCanvas);
  };

  const handleTestCapturedImage = () => {
    if (capturedCanvasesRef.current) {
      executeDecodeFlow(capturedCanvasesRef.current.roi, capturedCanvasesRef.current.full);
    }
  };

  const handleRetake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setMode('camera');
  };

  // Keep existing upload functionality completely untouched
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
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-slate-900/80 border-b border-slate-800 backdrop-blur-md z-20">
        <div className="flex items-center gap-2">
          {mode !== 'select' ? (
            <button
              onClick={() => {
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
        <div className="flex items-center gap-2">
          {(mode === 'camera' || mode === 'processing' || mode === 'error' || mode === 'success' || mode === 'multiple') && (
             <button onClick={() => setDebugMode(!debugMode)} className={`p-2 rounded-lg transition-colors ${debugMode ? 'text-emerald-400 bg-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                <Bug className="w-5 h-5" />
             </button>
          )}
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
      </div>

      {mode === 'select' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full z-10">
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
              <p className="text-xs text-slate-400">Take a photo of barcode</p>
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
        <div className="relative flex-1 bg-black flex flex-col items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            muted
            playsInline
          />
          
          {/* Scanner Guide Overlay */}
          <div className="absolute inset-0 pointer-events-none z-10 bg-black/40 flex flex-col items-center justify-center pb-20">
            {/* Guide Text */}
            <div className="absolute top-16 flex flex-col items-center">
               <div className="bg-black/60 px-4 py-2 rounded-full text-sm font-semibold tracking-wide">
                 Align the entire barcode inside the box
               </div>
            </div>

            {/* Target Box - wide for 1D barcodes */}
            <div ref={roiRef} className="relative w-[90%] h-[20%] max-h-48 border-2 border-emerald-500/80 shadow-[0_0_50px_rgba(16,185,129,0.3)] flex items-center justify-center box-border my-6">
              <div className="absolute inset-0 backdrop-blur-none bg-transparent" style={{ boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4)' }}></div>
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 z-10" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 z-10" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 z-10" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 z-10" />
            </div>

            <div className="bg-black/60 px-4 py-2 rounded-full text-xs text-emerald-400 font-bold tracking-widest mt-4">
              Then tap the camera button
            </div>
          </div>

          {/* Camera Controls Overlay */}
          <div className="absolute top-1/2 right-4 -translate-y-1/2 z-20 flex flex-col gap-4">
             {torchSupported && (
               <button onClick={handleTorchToggle} className={`p-3 rounded-full shadow-lg transition-colors ${torchEnabled ? 'bg-yellow-500 text-black' : 'bg-slate-800/80 text-white'}`}>
                  <Zap className="w-6 h-6" />
               </button>
             )}
             {zoomSupported && (
               <div className="flex flex-col gap-2 bg-slate-800/80 p-2 rounded-full shadow-lg">
                  <button onClick={() => handleZoom(0.5)} className="p-2 hover:text-emerald-400 transition-colors"><ZoomIn className="w-5 h-5" /></button>
                  <div className="text-center text-xs font-bold">{zoomLevel.toFixed(1)}x</div>
                  <button onClick={() => handleZoom(-0.5)} className="p-2 hover:text-emerald-400 transition-colors"><ZoomOut className="w-5 h-5" /></button>
               </div>
             )}
             {availableCameras.length > 1 && (
               <button onClick={handleCameraSwitch} className="p-3 bg-slate-800/80 rounded-full shadow-lg text-white hover:text-emerald-400 transition-colors">
                 <CameraSwitch className="w-6 h-6" />
               </button>
             )}
          </div>

          {/* Large Capture Button */}
          <div className="absolute bottom-8 inset-x-0 flex justify-center z-30 pointer-events-auto">
             <button 
                onClick={handleCapture}
                className="w-20 h-20 rounded-full bg-white border-4 border-slate-300 flex items-center justify-center active:scale-95 transition-transform shadow-xl cursor-pointer"
             >
                <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-inner pointer-events-none">
                   <CameraIcon className="w-8 h-8 text-white" />
                </div>
             </button>
          </div>

          {errorMessage && (
            <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-40">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Camera Error</h3>
              <p className="text-sm text-slate-400 max-w-sm mb-8">{errorMessage}</p>

              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
                <button
                  onClick={() => startCamera(selectedCameraId || undefined)}
                  className="py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {(mode === 'processing' || mode === 'success' || mode === 'error' || mode === 'detecting' || mode === 'multiple') && mode !== 'select' && mode !== 'camera' && (
        <div className="flex-1 flex flex-col items-center justify-start p-6 max-w-md mx-auto w-full text-center relative overflow-y-auto pt-20">
          
          {debugMode && (mode === 'success' || mode === 'error' || mode === 'multiple') && (
            <div className="absolute top-0 left-0 right-0 z-40 bg-black/95 text-xs p-3 rounded-b-lg text-emerald-400 font-mono flex flex-col gap-1 border-b border-slate-700 text-left mb-4 shadow-xl max-h-48 overflow-y-auto">
              <div className="font-bold text-white border-b border-slate-700 pb-1 mb-1 sticky top-0 bg-black/95">BARCODE DECODER DEBUG</div>
              {debugCropDetails && (
                <>
                  <div className="text-slate-400">Video Display: {debugCropDetails.videoDisplay}</div>
                  <div className="text-slate-400 mb-2">Source Crop: {debugCropDetails.sourceCrop}</div>
                </>
              )}
              {decoderDebugLogs.map((log, i) => (
                <div key={i} className={log.includes('Success') || log.includes('found') ? 'text-green-400' : log.includes('error') || log.includes('fail') ? 'text-rose-400' : 'text-slate-300'}>
                  {log}
                </div>
              ))}
            </div>
          )}

          {previewUrl && (
            <div className="w-full max-w-sm rounded-2xl overflow-hidden border-2 border-emerald-500/50 mb-6 bg-slate-900/50 shadow-[0_0_30px_rgba(16,185,129,0.15)] flex-shrink-0 mt-8">
              <img src={previewUrl} alt="Captured barcode ROI" className={`w-full object-contain bg-black ${mode === 'error' ? 'opacity-60' : ''}`} />
            </div>
          )}

          {mode === 'processing' || mode === 'detecting' ? (
            <div className="flex flex-col items-center mt-4">
              <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-4" />
              <h3 className="text-lg font-bold text-white mb-1">Processing barcode...</h3>
              <p className="text-xs text-slate-400 mb-8">Analyzing image using isolated CODE128 decoder</p>
            </div>
          ) : mode === 'success' ? (
            <div className="flex flex-col items-center mt-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Barcode Detected</h3>
              <div className="w-full p-4 rounded-2xl bg-slate-900 border border-slate-800 mb-6 shadow-inner">
                <span className="font-mono text-xl font-bold text-emerald-400 tracking-wider">{detectedBarcode}</span>
              </div>
            </div>
          ) : mode === 'multiple' ? (
            <div className="flex flex-col items-center mt-4 w-full">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
                <List className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Multiple Barcodes Found</h3>
              <p className="text-xs text-slate-400 mb-4">Select the correct barcode to use.</p>
              
              <div className="flex flex-col gap-3 w-full mb-6">
                {multipleResults.map((res, i) => (
                  <button
                    key={i}
                    onClick={() => {
                       setDetectedBarcode(res.value);
                       setMode('success');
                    }}
                    className="w-full p-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-emerald-500 transition-all text-left flex items-center justify-between"
                  >
                    <div>
                      <div className="font-mono text-lg font-bold text-white">{res.value}</div>
                      <div className="text-xs text-slate-400">{res.format}</div>
                    </div>
                    <CheckCircle className="w-5 h-5 text-emerald-400 opacity-0 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center mt-4">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Barcode not detected</h3>
              <p className="text-xs text-slate-400 mb-6 max-w-xs">{errorMessage}</p>
              
              {debugMode && capturedCanvasesRef.current && (
                <div className="flex flex-col gap-2 mb-4 w-full px-4">
                  <button
                    onClick={handleTestCapturedImage}
                    className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2"
                  >
                    <FileCheck className="w-4 h-4" />
                    Test Captured Image Again
                  </button>
                  <button
                    onClick={() => {
                      if (previewUrl) {
                        const a = document.createElement('a');
                        a.href = previewUrl;
                        a.download = 'captured-roi.png';
                        a.click();
                      }
                    }}
                    className="py-2 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Download Capture
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 w-full mt-auto mb-4">
            {mode === 'success' && (
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
            )}
            
            {(mode === 'success' || mode === 'error' || mode === 'multiple') && (
               <button
                 onClick={handleRetake}
                 className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-all border border-slate-700 cursor-pointer"
               >
                 Retake
               </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
