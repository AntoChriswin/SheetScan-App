import { BrowserMultiFormatReader, NotFoundException, DecodeHintType, BarcodeFormat } from '@zxing/library';

export interface DebugInfo {
  videoWidth: number;
  videoHeight: number;
  roiWidth: number;
  roiHeight: number;
  format: string;
  fps: number;
  variant: string;
  lastError: string;
  lastSuccess: string;
}

export class BarcodeScannerService {
  private codeReader: BrowserMultiFormatReader;
  private isScanning = false;
  private stream: MediaStream | null = null;
  private processingInterval: any = null;
  private isProcessingFrame = false;
  
  private consecutiveMatches = 0;
  private lastMatchedBarcode: string | null = null;
  
  public onDebugUpdate: ((info: Partial<DebugInfo>) => void) | null = null;
  public onCapturedFrame: ((dataUrl: string) => void) | null = null;
  
  private debugStats: Partial<DebugInfo> = {
    fps: 0,
    lastError: 'None',
    lastSuccess: 'None'
  };
  private framesProcessed = 0;
  private lastFpsTime = Date.now();

  constructor() {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.ITF
    ]);
    this.codeReader = new BrowserMultiFormatReader(hints);
  }

  async start(
    videoElement: HTMLVideoElement,
    onDetected: (resultText: string) => void,
    onError?: (err: any) => void,
    preferredCameraId?: string | null
  ): Promise<void> {
    if (this.isScanning) {
      this.stop();
    }

    this.isScanning = true;
    this.consecutiveMatches = 0;
    this.lastMatchedBarcode = null;
    this.framesProcessed = 0;
    this.lastFpsTime = Date.now();

    try {
      let selectedDeviceId = preferredCameraId;
      if (!selectedDeviceId) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter((d: MediaDeviceInfo) => d.kind === 'videoinput');
          const backCamera = videoDevices.find((d: MediaDeviceInfo) =>
            d.label.toLowerCase().includes('back') ||
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('environment')
          );
          selectedDeviceId = backCamera ? backCamera.deviceId : (videoDevices[0]?.deviceId || null);
        } catch (e) {
          // Fallback
        }
      }

      const constraints: MediaStreamConstraints = {
        video: selectedDeviceId 
          ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
          : { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoElement.srcObject = this.stream;
      
      // Attempt autofocus if available
      try {
         const track = this.stream.getVideoTracks()[0];
         const capabilities = track.getCapabilities?.();
         if (capabilities && (capabilities as any).focusMode) {
             await track.applyConstraints({
                 advanced: [{ focusMode: 'continuous' } as any]
             });
         }
      } catch (e) {}
      
      // Wait for video to be ready
      await new Promise<void>((resolve) => {
        videoElement.onloadedmetadata = () => {
          videoElement.play();
          resolve();
        };
      });

      this.updateDebug({
        videoWidth: videoElement.videoWidth,
        videoHeight: videoElement.videoHeight,
      });

      // Frame processing loop, roughly 5-10 FPS
      this.processingInterval = setInterval(() => {
        this.processFrame(videoElement, onDetected);
      }, 150);

    } catch (error) {
      this.isScanning = false;
      if (onError) onError(error);
      throw error;
    }
  }

  private async processFrame(videoElement: HTMLVideoElement, onDetected: (resultText: string) => void) {
    if (!this.isScanning || this.isProcessingFrame || videoElement.videoWidth === 0) return;
    
    this.isProcessingFrame = true;
    
    try {
      const vw = videoElement.videoWidth;
      const vh = videoElement.videoHeight;
      
      // ROI: 90% width, 20% height, centered
      const roiWidth = Math.floor(vw * 0.9);
      const roiHeight = Math.floor(vh * 0.2);
      const startX = Math.floor((vw - roiWidth) / 2);
      const startY = Math.floor((vh - roiHeight) / 2);

      this.updateDebug({ roiWidth, roiHeight });

      const canvas = document.createElement('canvas');
      canvas.width = roiWidth;
      canvas.height = roiHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        this.isProcessingFrame = false;
        return;
      }

      // Draw ROI
      ctx.drawImage(videoElement, startX, startY, roiWidth, roiHeight, 0, 0, roiWidth, roiHeight);

      // We attempt to decode variants
      let decodedText: string | null = null;
      
      // Variant A: Original
      this.updateDebug({ variant: 'Original' });
      decodedText = await this.attemptDecode(canvas);

      if (!decodedText) {
        // Variant B: Grayscale & Contrast
        this.updateDebug({ variant: 'Grayscale & Contrast' });
        this.applyContrast(ctx, roiWidth, roiHeight);
        decodedText = await this.attemptDecode(canvas);
      }
      
      if (!decodedText) {
        // Variant C: Upscaled (1.5x)
        this.updateDebug({ variant: 'Upscaled (1.5x)' });
        const scaleCanvas = document.createElement('canvas');
        scaleCanvas.width = roiWidth * 1.5;
        scaleCanvas.height = roiHeight * 1.5;
        const scaleCtx = scaleCanvas.getContext('2d');
        if (scaleCtx) {
           scaleCtx.drawImage(canvas, 0, 0, roiWidth, roiHeight, 0, 0, scaleCanvas.width, scaleCanvas.height);
           decodedText = await this.attemptDecode(scaleCanvas);
        }
      }

      if (this.onCapturedFrame && decodedText) {
         this.onCapturedFrame(canvas.toDataURL('image/jpeg', 0.8));
      }

      // Track FPS
      this.framesProcessed++;
      const now = Date.now();
      if (now - this.lastFpsTime >= 1000) {
         this.updateDebug({ fps: this.framesProcessed });
         this.framesProcessed = 0;
         this.lastFpsTime = now;
      }

      if (decodedText) {
        this.updateDebug({ lastSuccess: decodedText });
        if (decodedText === this.lastMatchedBarcode) {
          this.consecutiveMatches++;
        } else {
          this.consecutiveMatches = 1;
          this.lastMatchedBarcode = decodedText;
        }

        // Temporal stability: require 2 consecutive matches
        if (this.consecutiveMatches >= 2) {
          this.stop();
          onDetected(decodedText);
        }
      } else {
         // reset
         this.consecutiveMatches = 0;
      }

    } catch (err: any) {
       this.updateDebug({ lastError: err.message || "Unknown error" });
    } finally {
      this.isProcessingFrame = false;
    }
  }

  private async attemptDecode(canvas: HTMLCanvasElement): Promise<string | null> {
    try {
      const result = await this.codeReader.decodeFromCanvas(canvas);
      if (result) {
        // Validate result
        let text = result.getText().trim();
        if (text) {
           this.updateDebug({ format: result.getBarcodeFormat().toString() });
           return text;
        }
      }
    } catch (err) {
      if (!(err instanceof NotFoundException)) {
        this.updateDebug({ lastError: err.toString() });
      }
    }
    return null;
  }

  private applyContrast(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const contrast = 1.5; // contrast factor
    const intercept = 128 * (1 - contrast);
    
    for (let i = 0; i < data.length; i += 4) {
      // Grayscale
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      // Contrast
      let val = gray * contrast + intercept;
      if (val > 255) val = 255;
      if (val < 0) val = 0;
      data[i] = data[i + 1] = data[i + 2] = val;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  private updateDebug(info: Partial<DebugInfo>) {
     this.debugStats = { ...this.debugStats, ...info };
     if (this.onDebugUpdate) {
        this.onDebugUpdate(this.debugStats);
     }
  }

  getCapabilities(): MediaTrackCapabilities | null {
    if (this.stream && this.stream.getVideoTracks().length > 0) {
      const track = this.stream.getVideoTracks()[0];
      return track.getCapabilities ? track.getCapabilities() : null;
    }
    return null;
  }

  async setTorch(enabled: boolean): Promise<boolean> {
     if (this.stream && this.stream.getVideoTracks().length > 0) {
        const track = this.stream.getVideoTracks()[0];
        try {
           await track.applyConstraints({
              advanced: [{ torch: enabled } as any]
           });
           return true;
        } catch (e) {
           return false;
        }
     }
     return false;
  }

  async setZoom(zoomValue: number): Promise<boolean> {
     if (this.stream && this.stream.getVideoTracks().length > 0) {
        const track = this.stream.getVideoTracks()[0];
        try {
           await track.applyConstraints({
              advanced: [{ zoom: zoomValue } as any]
           });
           return true;
        } catch (e) {
           return false;
        }
     }
     return false;
  }

  stop(): void {
    this.isScanning = false;
    this.isProcessingFrame = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    try {
      this.codeReader.reset();
    } catch (e) {}
  }

  async decodeFromImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = async () => {
          try {
            // Re-use the exact same decoding logic for images
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.drawImage(img, 0, 0);
            
            let result = await this.attemptDecode(canvas);
            if (result) {
               resolve(result);
            } else {
               // Try with contrast
               if(ctx) this.applyContrast(ctx, img.width, img.height);
               result = await this.attemptDecode(canvas);
               if(result) resolve(result);
               else reject(new Error('No barcode detected in the image.'));
            }
          } catch (err) {
            reject(new Error('No barcode detected in the image.'));
          }
        };
        img.onerror = () => reject(new Error('Unable to load this image.'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsDataURL(file);
    });
  }
}

export const scannerService = new BarcodeScannerService();

export function playSuccessBeep() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.15);
  } catch (e) {
  }
}

export function triggerVibration() {
  try {
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
  } catch (e) {
  }
}
