import { BrowserMultiFormatReader, NotFoundException, DecodeHintType, BarcodeFormat } from '@zxing/library';

export interface DebugInfo {
  videoWidth: number;
  videoHeight: number;
  roiWidth: number;
  roiHeight: number;
  format: string;
  variant: string;
  lastError: string;
}

export class BarcodeScannerService {
  private codeReader: BrowserMultiFormatReader;
  private stream: MediaStream | null = null;
  
  public onDebugUpdate: ((info: Partial<DebugInfo>) => void) | null = null;
  private debugStats: Partial<DebugInfo> = {};

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

  async startCamera(
    videoElement: HTMLVideoElement,
    preferredCameraId?: string | null
  ): Promise<void> {
    this.stop();

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
    
    try {
       const track = this.stream.getVideoTracks()[0];
       const capabilities = track.getCapabilities?.();
       if (capabilities && (capabilities as any).focusMode) {
           await track.applyConstraints({
               advanced: [{ focusMode: 'continuous' } as any]
           });
       }
    } catch (e) {}
    
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
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    try {
      this.codeReader.reset();
    } catch (e) {}
  }

  // Refactored shared decoding function
  async decodeFromSource(source: HTMLImageElement | HTMLCanvasElement): Promise<string> {
    const attempt = async (canvas: HTMLCanvasElement): Promise<string | null> => {
      try {
        const result = await this.codeReader.decodeFromCanvas(canvas);
        if (result) {
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
    };

    // Ensure we are working with a canvas
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Could not create canvas context');
    ctx.drawImage(source, 0, 0);

    // Variant A: Original
    this.updateDebug({ variant: 'Original' });
    let result = await attempt(canvas);
    if (result) return result;

    // Variant B: Grayscale & Contrast
    this.updateDebug({ variant: 'Grayscale & Contrast' });
    this.applyContrast(ctx, canvas.width, canvas.height);
    result = await attempt(canvas);
    if (result) return result;
    
    // Variant C: Upscaled (1.5x)
    this.updateDebug({ variant: 'Upscaled (1.5x)' });
    const scaleCanvas = document.createElement('canvas');
    scaleCanvas.width = source.width * 1.5;
    scaleCanvas.height = source.height * 1.5;
    const scaleCtx = scaleCanvas.getContext('2d');
    if (scaleCtx) {
       scaleCtx.drawImage(source, 0, 0, source.width, source.height, 0, 0, scaleCanvas.width, scaleCanvas.height);
       result = await attempt(scaleCanvas);
       if (result) return result;
    }

    throw new Error('No barcode detected in the image.');
  }

  private applyContrast(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const contrast = 1.5;
    const intercept = 128 * (1 - contrast);
    
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      let val = gray * contrast + intercept;
      if (val > 255) val = 255;
      if (val < 0) val = 0;
      data[i] = data[i + 1] = data[i + 2] = val;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  async decodeFromImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = async () => {
          try {
            const result = await this.decodeFromSource(img);
            resolve(result);
          } catch (err) {
            reject(err);
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
