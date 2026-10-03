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

    const getCanvas = (src: HTMLImageElement | HTMLCanvasElement, cropY = 0, cropH = 1): HTMLCanvasElement => {
      const c = document.createElement('canvas');
      // If it's an Image, use natural dimensions. If Canvas, use width/height.
      const w = src instanceof HTMLImageElement ? src.naturalWidth : src.width;
      const h = src instanceof HTMLImageElement ? src.naturalHeight : src.height;
      
      c.width = w;
      c.height = h * cropH;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(src, 0, h * cropY, w, h * cropH, 0, 0, c.width, c.height);
      }
      return c;
    }
    
    const baseCanvas = getCanvas(source);
    
    // Create bands
    const canvases = [
       { name: 'Full', canvas: baseCanvas },
       { name: 'Center Band', canvas: getCanvas(source, 0.25, 0.5) },
       { name: 'Upper Band', canvas: getCanvas(source, 0, 0.5) },
       { name: 'Lower Band', canvas: getCanvas(source, 0.5, 0.5) }
    ];

    for (const region of canvases) {
      // Variant 1: Raw
      this.updateDebug({ variant: `${region.name} - Raw` });
      let result = await attempt(region.canvas);
      if (result) return result;

      // Variant 2: Grayscale
      this.updateDebug({ variant: `${region.name} - Grayscale` });
      const grayCtx = region.canvas.getContext('2d', { willReadFrequently: true });
      if (grayCtx) this.applyGrayscale(grayCtx, region.canvas.width, region.canvas.height);
      result = await attempt(region.canvas);
      if (result) return result;

      // Variant 3: Contrast Enhancement
      this.updateDebug({ variant: `${region.name} - Contrast` });
      if (grayCtx) this.applyContrast(grayCtx, region.canvas.width, region.canvas.height);
      result = await attempt(region.canvas);
      if (result) return result;
      
      // Variant 4: Mild Sharpening
      this.updateDebug({ variant: `${region.name} - Sharpened` });
      if (grayCtx) this.applySharpen(grayCtx, region.canvas.width, region.canvas.height);
      result = await attempt(region.canvas);
      if (result) return result;

      // Variant 5: 2x Upscaled
      this.updateDebug({ variant: `${region.name} - Upscaled 2x` });
      const scaleCanvas = document.createElement('canvas');
      scaleCanvas.width = region.canvas.width * 2;
      scaleCanvas.height = region.canvas.height * 2;
      const scaleCtx = scaleCanvas.getContext('2d');
      if (scaleCtx) {
         scaleCtx.drawImage(region.canvas, 0, 0, region.canvas.width, region.canvas.height, 0, 0, scaleCanvas.width, scaleCanvas.height);
         result = await attempt(scaleCanvas);
         if (result) return result;
         
         this.updateDebug({ variant: `${region.name} - Upscaled 2x + Contrast` });
         this.applyContrast(scaleCtx, scaleCanvas.width, scaleCanvas.height);
         result = await attempt(scaleCanvas);
         if (result) return result;
      }
    }

    throw new Error('No barcode detected in the image.');
  }

  private applyGrayscale(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      data[i] = data[i + 1] = data[i + 2] = gray;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  private applyContrast(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const contrast = 1.5;
    const intercept = 128 * (1 - contrast);
    
    for (let i = 0; i < data.length; i += 4) {
      let val = data[i] * contrast + intercept;
      if (val > 255) val = 255;
      if (val < 0) val = 0;
      data[i] = data[i + 1] = data[i + 2] = val;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  private applySharpen(ctx: CanvasRenderingContext2D, width: number, height: number) {
     // A very simple 3x3 convolution kernel for mild sharpening
     const imageData = ctx.getImageData(0, 0, width, height);
     const data = imageData.data;
     const copy = new Uint8ClampedArray(data);
     const w = width;
     
     const kernel = [
        0, -1,  0,
       -1,  5, -1,
        0, -1,  0
     ];

     for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
           const idx = (y * width + x) * 4;
           let r = 0, g = 0, b = 0;
           
           for (let ky = -1; ky <= 1; ky++) {
              for (let kx = -1; kx <= 1; kx++) {
                 const pIdx = ((y + ky) * width + (x + kx)) * 4;
                 const weight = kernel[(ky + 1) * 3 + (kx + 1)];
                 r += copy[pIdx] * weight;
                 g += copy[pIdx + 1] * weight;
                 b += copy[pIdx + 2] * weight;
              }
           }
           
           data[idx] = Math.min(255, Math.max(0, r));
           data[idx + 1] = Math.min(255, Math.max(0, g));
           data[idx + 2] = Math.min(255, Math.max(0, b));
        }
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
