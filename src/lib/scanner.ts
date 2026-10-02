import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

export class BarcodeScannerService {
  private codeReader: BrowserMultiFormatReader;
  private isScanning = false;

  constructor() {
    this.codeReader = new BrowserMultiFormatReader();
  }

  async start(
    videoElement: HTMLVideoElement,
    onDetected: (resultText: string) => void,
    onError?: (err: any) => void
  ): Promise<void> {
    if (this.isScanning) {
      this.stop();
    }

    this.isScanning = true;
    try {
      let selectedDeviceId: string | null = null;
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d: MediaDeviceInfo) => d.kind === 'videoinput');
        const backCamera = videoDevices.find((d: MediaDeviceInfo) =>
          d.label.toLowerCase().includes('back') ||
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('environment')
        );
        selectedDeviceId = (backCamera || videoDevices[0])?.deviceId || null;
      } catch (e) {
        // Fallback if enumerateDevices fails or permission not yet granted
      }

      await this.codeReader.decodeFromVideoDevice(
        selectedDeviceId,
        videoElement,
        (result, err) => {
          if (result) {
            onDetected(result.getText());
          }
          if (err && !(err instanceof NotFoundException)) {
            // Ignore minor decoding frame misses
          }
        }
      );
    } catch (error) {
      this.isScanning = false;
      if (onError) onError(error);
      throw error;
    }
  }

  stop(): void {
    try {
      this.codeReader.reset();
    } catch (e) {
      console.error('Error stopping scanner:', e);
    }
    this.isScanning = false;
  }

  async decodeFromImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = async () => {
          try {
            const result = await this.codeReader.decodeFromImageElement(img);
            resolve(result.getText());
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
    // Audio context might be blocked if no user interaction yet
  }
}

export function triggerVibration() {
  try {
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
  } catch (e) {
    // Vibration not supported
  }
}
