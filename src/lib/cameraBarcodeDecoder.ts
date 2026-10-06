import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat, HTMLCanvasElementLuminanceSource, HybridBinarizer, BinaryBitmap } from '@zxing/library';

export interface BarcodeResult {
  value: string;
  format: string;
}

export interface DecoderResponse {
  success: boolean;
  results: BarcodeResult[];
  error?: string;
  debugLog: string[];
}

const supportedFormats = [
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.ITF,
  BarcodeFormat.QR_CODE,
  BarcodeFormat.DATA_MATRIX,
  BarcodeFormat.PDF_417,
  BarcodeFormat.AZTEC
];

// Ensure the new decoder is completely isolated
const zxingReader = new BrowserMultiFormatReader(
  new Map([
    [DecodeHintType.POSSIBLE_FORMATS, supportedFormats],
    [DecodeHintType.TRY_HARDER, true],
    [DecodeHintType.RETURN_CODABAR_START_END, false]
  ])
);

/**
 * Main exposed function for decoding the captured camera ROI.
 * It will attempt the native BarcodeDetector first, then fallback to an extensive
 * ZXing preprocessing pipeline, finding multiple barcodes.
 */
export async function decodeCapturedBarcode(imageSource: Blob | File | HTMLCanvasElement): Promise<DecoderResponse> {
  const debugLog: string[] = [];
  const log = (msg: string) => {
    console.log(`[SheetScan][CameraDecoder] ${msg}`);
    debugLog.push(msg);
  };

  log('Starting isolated camera barcode decoder');

  let sizeStr = 'N/A';
  let mimeStr = 'N/A';
  let sourceType = imageSource instanceof Blob ? (imageSource instanceof File ? 'File' : 'Blob') : 'HTMLCanvasElement';

  if (imageSource instanceof Blob) {
    mimeStr = imageSource.type;
    sizeStr = `${imageSource.size} bytes`;
  } else if (imageSource instanceof HTMLCanvasElement) {
    const blob = await new Promise<Blob | null>(resolve => imageSource.toBlob(resolve, 'image/png'));
    if (blob) {
      mimeStr = blob.type;
      sizeStr = `${blob.size} bytes`;
    }
  }

  log(`source type: ${sourceType}`);
  log(`Image MIME: ${mimeStr}`);
  log(`Image size: ${sizeStr}`);

  // Convert input to an HTMLImageElement to standardise processing
  const img = await sourceToImage(imageSource);
  log(`ROI width: ${img.naturalWidth}`);
  log(`ROI height: ${img.naturalHeight}`);

  let results: BarcodeResult[] = [];

  // Attempt 1: Native BarcodeDetector API (Extremely fast, natively supports multiple barcodes)
  if ('BarcodeDetector' in window) {
    try {
      let nativeFormats: string[] = [];
      try {
        nativeFormats = await (window as any).BarcodeDetector.getSupportedFormats();
      } catch(e) {}
      
      const formatsToUse = nativeFormats.length > 0 ? nativeFormats : ['code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'itf', 'qr_code', 'data_matrix', 'pdf417', 'aztec'];
      const barcodeDetector = new (window as any).BarcodeDetector({ formats: formatsToUse });
      log(`Native BarcodeDetector available, attempting decode with formats: ${formatsToUse.join(', ')}...`);
      const detected = await barcodeDetector.detect(img);
      
      if (detected && detected.length > 0) {
        log(`Native BarcodeDetector found ${detected.length} barcodes!`);
        results = detected.map((d: any) => ({
          value: String(d.rawValue),
          format: d.format.toUpperCase()
        }));
        
        return { success: true, results, debugLog };
      } else {
        log('Native BarcodeDetector found nothing. Falling back to ZXing pipeline.');
      }
    } catch (e: any) {
      log(`Native BarcodeDetector error: ${e.message}`);
    }
  } else {
    log('Native BarcodeDetector not supported in this browser. Proceeding directly to ZXing pipeline.');
  }

  // Attempt 2: ZXing Pipeline with Image Preprocessing and Multiple Barcode Extraction
  // We use the "blackout" trick to find multiple barcodes using a single-barcode reader.
  const variants = [
    { name: 'Original ROI', processor: (ctx: CanvasRenderingContext2D, w: number, h: number) => {} },
    { name: 'Upscaled ROI', processor: (ctx: CanvasRenderingContext2D, w: number, h: number) => {}, scale: 2 },
    { name: 'Grayscale ROI', processor: applyGrayscale },
    { name: 'High-contrast ROI', processor: (ctx: CanvasRenderingContext2D, w: number, h: number) => { applyGrayscale(ctx, w, h); applyContrast(ctx, w, h); } },
    { name: 'Sharpened ROI', processor: (ctx: CanvasRenderingContext2D, w: number, h: number) => { applyGrayscale(ctx, w, h); applySharpen(ctx, w, h); } },
    { name: 'Appropriate threshold/binarized ROI', processor: applyThreshold }
  ];

  const foundValues = new Set<string>();

  for (const variant of variants) {
    log(`--- Testing Variant: ${variant.name} ---`);
    let scale = variant.scale || 1;
    let keepScanningVariant = true;
    
    // We create a fresh canvas for each variant
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth * scale;
    canvas.height = img.naturalHeight * scale;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) continue;
    
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    variant.processor(ctx, canvas.width, canvas.height);

    // Loop to find multiple barcodes in the same image variant
    let passes = 0;
    while (keepScanningVariant && passes < 3) {
      passes++;
      try {
        log(`Decoder: ZXing BrowserMultiFormatReader`);
        log(`Attempt: ${passes}`);
        log(`Formats: multiple generic`);
        const luminanceSource = new HTMLCanvasElementLuminanceSource(canvas);
        const hybridBinarizer = new HybridBinarizer(luminanceSource);
        const bitmap = new BinaryBitmap(hybridBinarizer);
        const result = zxingReader.decodeBitmap(bitmap);
        if (result) {
          const val = String(result.getText());
          const fmt = result.getBarcodeFormat().toString();
          if (!foundValues.has(val)) {
            foundValues.add(val);
            results.push({ value: val, format: fmt });
            log(`Success! Result: ${val} Format: ${fmt}`);
          } else {
             log(`Found duplicate barcode: ${val}`);
          }
          
          // Blackout the found barcode so ZXing can find the next one
          const points = result.getResultPoints();
          if (points && points.length >= 2) {
             const minX = Math.min(...points.map(p => p.getX()));
             const maxX = Math.max(...points.map(p => p.getX()));
             const minY = Math.min(...points.map(p => p.getY()));
             const maxY = Math.max(...points.map(p => p.getY()));
             
             const padding = 20;
             ctx.fillStyle = 'black';
             ctx.fillRect(minX - padding, minY - padding, (maxX - minX) + padding * 2, (maxY - minY) + padding * 2);
             log('Blacked out detected region to search for more barcodes.');
          } else {
             keepScanningVariant = false; // Cannot blackout accurately, break loop
          }
        }
      } catch (err: any) {
        // NotFoundException is expected when no more barcodes exist
        if (err && err.name === 'NotFoundException') {
           keepScanningVariant = false;
           log(`Variant ${variant.name} pass ${passes} ended: No barcode found.`);
        } else {
           keepScanningVariant = false;
           log(`[SheetScan][BarcodeDecoder] ZXing error: ${err.message || err.toString()}`);
           console.error('[SheetScan][BarcodeDecoder] ZXing error:', err);
        }
      }
    }

    if (results.length > 0) {
       // Stop executing expensive variants if we already found at least one barcode
       log(`Stopping pipeline early because ${results.length} barcode(s) were successfully decoded.`);
       break;
    }
  }

  if (results.length > 0) {
    return { success: true, results, debugLog };
  }

  log('All decoder variants failed.');
  return { success: false, results: [], error: 'Barcode not detected in any variant.', debugLog };
}

// --- Image Loading Utilities ---

function sourceToImage(source: Blob | File | HTMLCanvasElement): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (source instanceof HTMLCanvasElement) {
      source.toBlob((blob) => {
        if (!blob) return reject(new Error('Canvas to Blob failed'));
        loadImageFromBlob(blob).then(resolve).catch(reject);
      }, 'image/png');
    } else {
      loadImageFromBlob(source).then(resolve).catch(reject);
    }
  });
}

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image from source'));
    };
    img.src = url;
  });
}

// --- Preprocessing Functions ---

function applyGrayscale(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    data[i] = data[i + 1] = data[i + 2] = gray;
  }
  ctx.putImageData(imageData, 0, 0);
}

function applyContrast(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const contrast = 2.0; // Strong contrast for barcode edges
  const intercept = 128 * (1 - contrast);
  
  for (let i = 0; i < data.length; i += 4) {
    let val = data[i] * contrast + intercept;
    if (val > 255) val = 255;
    if (val < 0) val = 0;
    data[i] = data[i + 1] = data[i + 2] = val;
  }
  ctx.putImageData(imageData, 0, 0);
}

function applySharpen(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const copy = new Uint8ClampedArray(data);
  
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

function applyThreshold(ctx: CanvasRenderingContext2D, width: number, height: number) {
  applyGrayscale(ctx, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  // Calculate average luminance
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    sum += data[i];
  }
  const avg = sum / (data.length / 4);
  const threshold = avg * 0.9; // Slightly lower than average to favor black bars

  for (let i = 0; i < data.length; i += 4) {
    const val = data[i] > threshold ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = val;
  }
  ctx.putImageData(imageData, 0, 0);
}
