import React, { useState, useRef, useEffect } from 'react';
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat, HTMLCanvasElementLuminanceSource, HybridBinarizer, BinaryBitmap } from '@zxing/library';
import { decodeCapturedBarcode } from '../lib/cameraBarcodeDecoder';

export function ZxingDiagnostic() {
  const [logs, setLogs] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const log = (msg: string) => {
    console.log(msg);
    setLogs((prev) => [...prev, msg]);
  };

  const runBasicCanvasTest = async () => {
    log('==================================================');
    log('STEP 1 — CREATE A TEMPORARY BROWSER DIAGNOSTIC');
    log('==================================================');
    
    const canvas = document.createElement('canvas');
    log(`[ZXING_BROWSER_TEST]`);
    log(`environment: browser`);
    log(`document: available`);
    log(`canvas: ${canvas instanceof HTMLCanvasElement ? 'available' : 'UNAVAILABLE'}`);
    log(`2d context: ${canvas.getContext('2d') !== null ? 'available' : 'UNAVAILABLE'}`);
    log(`ZXing version: @zxing/library@0.23.0`);
  };

  const runKnownBarcodeTest = async () => {
    log('==================================================');
    log('STEP 2 & 3 & 4 — USE A REAL KNOWN BARCODE IMAGE & VERIFY & CALL ZXING');
    log('==================================================');
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Create a known barcode image (using a simple data URI for a QR code or Barcode)
    // Here we use a generic placeholder or draw something, but it's better to load a real barcode
    // Let's generate a basic barcode using canvas directly to ensure it has data, or we can load a public URL
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = 'https://upload.wikimedia.org/wikipedia/commons/8/8f/Ean-13-5901234123457.png'; // EAN-13: 5901234123457
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      log(`canvas.width: ${canvas.width}`);
      log(`canvas.height: ${canvas.height}`);
      
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        // Verify pixels
        const imageData = ctx.getImageData(0, 0, 10, 10);
        const hasPixels = imageData.data.some(val => val > 0);
        log(`Canvas contains image pixels: ${hasPixels ? 'YES' : 'NO'}`);
        
        try {
          const supportedFormats = [BarcodeFormat.EAN_13, BarcodeFormat.CODE_128, BarcodeFormat.QR_CODE];
          const reader = new BrowserMultiFormatReader(new Map([
            [DecodeHintType.POSSIBLE_FORMATS, supportedFormats]
          ]));
          
          log(`[ZXING_BROWSER_TEST]`);
          log(`decode called: YES`);
          const luminanceSource = new HTMLCanvasElementLuminanceSource(canvas);
          const bitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
          const result = reader.decodeBitmap(bitmap);
          log(`result: ${result ? 'FOUND' : 'null'}`);
          if (result) {
            log(`decoded text: ${result.getText()}`);
            log(`format: ${result.getBarcodeFormat()}`);
          }
        } catch (err: any) {
          log(`error: ${err.message || err.toString()}`);
        }
      } else {
        log(`Failed to get 2d context for known barcode test.`);
      }
    };
    img.onerror = () => {
      log('Failed to load known barcode image from wikimedia.');
    };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    log('==================================================');
    log('STEP 5 — TEST THE REAL UPLOAD IMAGE');
    log('==================================================');
    
    log(`[REAL_UPLOAD_TEST]`);
    log(`file type: ${file.type}`);
    log(`file size: ${file.size}`);

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      log(`image width: ${img.width}`);
      log(`image height: ${img.height}`);
      
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      log(`canvas width: ${canvas.width}`);
      log(`canvas height: ${canvas.height}`);
      
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        
        try {
          const reader = new BrowserMultiFormatReader();
          log(`decode called: YES`);
          const luminanceSource = new HTMLCanvasElementLuminanceSource(canvas);
          const bitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
          const result = reader.decodeBitmap(bitmap);
          log(`result: ${result ? 'FOUND' : 'null'}`);
          if (result) {
            log(`decoded text: ${result.getText()}`);
            log(`format: ${result.getBarcodeFormat()}`);
          }
        } catch (err: any) {
          log(`error: ${err.message || err.toString()}`);
        }
      }
    };
    img.src = url;
  };

  const runCameraTest = async () => {
    log('==================================================');
    log('STEP 6 — TEST CAMERA ROI');
    log('==================================================');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        
        // Wait a bit for video to start playing
        setTimeout(() => {
          if (!videoRef.current) return;
          const video = videoRef.current;
          
          log(`[REAL_CAMERA_TEST]`);
          log(`camera dimensions: ${video.videoWidth}x${video.videoHeight}`);
          
          // Mimic ROI crop (e.g., center 70% width, 30% height)
          const roiWidth = video.videoWidth * 0.7;
          const roiHeight = video.videoHeight * 0.3;
          const roiX = (video.videoWidth - roiWidth) / 2;
          const roiY = (video.videoHeight - roiHeight) / 2;
          
          log(`ROI dimensions: ${roiWidth}x${roiHeight}`);
          
          const roiCanvas = document.createElement('canvas');
          roiCanvas.width = roiWidth;
          roiCanvas.height = roiHeight;
          const ctx = roiCanvas.getContext('2d');
          
          log(`canvas dimensions: ${roiCanvas.width}x${roiCanvas.height}`);
          log(`canvas.getContext available: ${ctx ? 'YES' : 'NO'}`);
          
          if (ctx) {
            ctx.drawImage(video, roiX, roiY, roiWidth, roiHeight, 0, 0, roiWidth, roiHeight);
            
            log(`barcode visible in ROI: YES (assumption)`);
            
            try {
              const reader = new BrowserMultiFormatReader();
              log(`decode called: YES`);
              const luminanceSource = new HTMLCanvasElementLuminanceSource(roiCanvas);
              const bitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
              const result = reader.decodeBitmap(bitmap);
              log(`result: ${result ? 'FOUND' : 'null'}`);
              if (result) {
                log(`decoded text: ${result.getText()}`);
                log(`format: ${result.getBarcodeFormat()}`);
              }
            } catch (err: any) {
              log(`error: ${err.message || err.toString()}`);
            }
          }
          
          // stop stream
          stream.getTracks().forEach(t => t.stop());
        }, 1500);
      }
    } catch (err: any) {
      log(`Camera test error: ${err.message || err.toString()}`);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', zIndex: 9999, overflow: 'auto', padding: '20px', color: '#0f0', fontFamily: 'monospace' }}>
      <h2>ZXing Browser Diagnostic</h2>
      <button onClick={() => setLogs([])} style={{ margin: '5px' }}>Clear Logs</button>
      <button onClick={runBasicCanvasTest} style={{ margin: '5px' }}>1. Basic Canvas Test</button>
      <button onClick={runKnownBarcodeTest} style={{ margin: '5px' }}>2. Known Barcode Test</button>
      <input type="file" accept="image/*" onChange={handleFileUpload} style={{ margin: '5px' }} />
      <button onClick={runCameraTest} style={{ margin: '5px' }}>4. Camera ROI Test</button>
      
      <div style={{ display: 'none' }}>
        <video ref={videoRef} playsInline muted />
      </div>

      <div style={{ marginTop: '20px', whiteSpace: 'pre-wrap' }}>
        {logs.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
}
