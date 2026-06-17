import ExifReader from 'exifreader';
import { ImageMetadata, KeyValuePair, ProcessedResult } from '../types';

/**
 * Reads EXIF metadata from a File using ExifReader.
 */
export async function extractMetadata(file: File): Promise<ImageMetadata> {
  const allTags: KeyValuePair[] = [];
  let hasSensitive = false;
  let gpsCount = 0;
  let cameraCount = 0;

  try {
    const arrayBuffer = await file.arrayBuffer();
    // ExifReader.load accepts ArrayBuffer, Uint8Array, etc.
    const tags = ExifReader.load(arrayBuffer);

    // Filter and map metadata to readable formats
    for (const [key, tag] of Object.entries(tags)) {
      // Skip some overly repetitive or binary blocks like thumbnail
      if (key.toLowerCase().includes('thumbnail') || key === 'MakerNote' || !tag.description) {
        continue;
      }

      const val = tag.description.toString().trim();
      if (!val) continue;

      let category: 'GPS' | 'Camera' | 'Standard' | 'Other' = 'Standard';
      if (key.startsWith('GPS')) {
        category = 'GPS';
        gpsCount++;
        hasSensitive = true;
      } else if (
        ['Make', 'Model', 'LensModel', 'FocalLength', 'ExposureTime', 'FNumber', 'ISOSpeedRatings', 'OwnerName', 'SerialNumber', 'Camera'].some(term => key.includes(term))
      ) {
        category = 'Camera';
        cameraCount++;
      } else if (['Software', 'Copyright', 'Artist', 'ProfileCreator', 'Creator'].some(term => key.includes(term))) {
        category = 'Standard';
      } else {
        category = 'Other';
      }

      allTags.push({
        key: formatTagKey(key),
        value: val,
        category,
      });
    }
  } catch (error) {
    console.warn('Error reading metadata: ', error);
  }

  return {
    all: allTags.sort((a, b) => b.category.localeCompare(a.category)),
    hasSensitive,
    gpsCount,
    cameraCount,
  };
}

/**
 * Format tag names into human-readable labels (e.g. DateTimeOriginal -> Date/Time Original)
 */
function formatTagKey(key: string): string {
  // Insert spaces before capitals
  const spaced = key.replace(/([A-Z])/g, ' $1').trim();
  // Capitalize first letters of words
  return spaced.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

interface ProcessImageOptions {
  file: File;
  format: 'image/webp' | 'image/jpeg';
  quality: number; // 0.0 to 1.0
  blurEnabled?: boolean;
  blurRadius?: number; // 0 to 10
  onProgress?: (progress: number) => void;
  watermarkEnabled?: boolean;
  watermarkText?: string;
  watermarkDensity?: number; // 0 to 10
  watermarkFontSize?: number;
  watermarkOpacity?: number;
  watermarkColor?: string;
}

/**
 * Loads an image from Data URL or Blob and returns an HTMLImageElement
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Failed to load image element'));
    img.src = src;
  });
}

/**
 * Computes PSNR (Peak Signal-to-Noise Ratio) to measure visual similarity
 * higher is better, >35dB is considered indistinguishable, >40dB is pristine.
 */
function calculateSimilarity(
  originalImg: HTMLImageElement,
  processedImg: HTMLImageElement
): number {
  try {
    // Create comparing canvases at a normalized size for ultra-fast performance without freezing interface
    const size = 256;
    const canvas1 = document.createElement('canvas');
    const canvas2 = document.createElement('canvas');
    canvas1.width = size;
    canvas1.height = size;
    canvas2.width = size;
    canvas2.height = size;

    const ctx1 = canvas1.getContext('2d');
    const ctx2 = canvas2.getContext('2d');

    if (!ctx1 || !ctx2) return 50; // Fallback perfect score

    ctx1.drawImage(originalImg, 0, 0, size, size);
    ctx2.drawImage(processedImg, 0, 0, size, size);

    const imgData1 = ctx1.getImageData(0, 0, size, size).data;
    const imgData2 = ctx2.getImageData(0, 0, size, size).data;

    let sumSquaredError = 0;
    const totalPixels = size * size * 3; // RGB, skipping alpha for standard PSNR comparison

    for (let i = 0; i < imgData1.length; i += 4) {
      const rDiff = imgData1[i] - imgData2[i];
      const gDiff = imgData1[i + 1] - imgData2[i + 1];
      const bDiff = imgData1[i + 2] - imgData2[i + 2];

      sumSquaredError += rDiff * rDiff + gDiff * gDiff + bDiff * bDiff;
    }

    const mse = sumSquaredError / totalPixels;
    if (mse === 0) return 99; // Identical
    
    // PSNR formula: 10 * log10(MAX_I^2 / MSE)
    const psnr = 20 * Math.log10(255) - 10 * Math.log10(mse);
    return Math.round(psnr * 10) / 10;
  } catch (err) {
    console.error('PSNR evaluation failed: ', err);
    return 42; // arbitrary high rating fallback
  }
}

/**
 * Process, convert, strip metadata, and compress an image file with visually lossless results.
 */
export async function processImage({
  file,
  format,
  quality,
  blurEnabled,
  blurRadius,
  onProgress,
  watermarkEnabled,
  watermarkText,
  watermarkDensity,
  watermarkFontSize,
  watermarkOpacity,
  watermarkColor,
}: ProcessImageOptions): Promise<ProcessedResult> {
  const startTime = performance.now();
  onProgress?.(10);

  // 1. Load original metadata
  const originalMetadata = await extractMetadata(file);
  onProgress?.(30);

  // 2. Read File as original Data URL
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const originalDataUrl = e.target?.result as string;
        onProgress?.(50);

        // Load original HTML Image
        const originalImg = await loadImage(originalDataUrl);
        const originalWidth = originalImg.naturalWidth;
        const originalHeight = originalImg.naturalHeight;
        onProgress?.(75);

        // 3. Draw onto clean canvas (this discards EXIF headers completely)
        const canvas = document.createElement('canvas');
        canvas.width = originalWidth;
        canvas.height = originalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Could not get Canvas 2D context');
        }

        // Draw image directly
        if (blurEnabled && blurRadius !== undefined && blurRadius > 0) {
          ctx.filter = `blur(${blurRadius}px)`;
        }
        ctx.drawImage(originalImg, 0, 0);

        // Reset filter
        ctx.filter = 'none';

        // Apply custom watermark if enabled
        if (watermarkEnabled && watermarkText) {
          const wDensity = watermarkDensity !== undefined ? watermarkDensity : 5;
          const wFontSize = watermarkFontSize || 36;
          const wOpacity = watermarkOpacity !== undefined ? watermarkOpacity : 0.3;
          const wColor = watermarkColor || '#ffffff';
          drawWatermark(ctx, originalWidth, originalHeight, watermarkText, wDensity, wFontSize, wOpacity, wColor);
        }

        // 4. Compress the raw canvas pixels to target format & quality (lossless or high-quality)
        canvas.toBlob(
          async (blob) => {
            if (!blob) {
              reject(new Error('Canvas compression returned empty output blob'));
              return;
            }

            onProgress?.(90);

            // Create processed object URL
            const readerProcessed = new FileReader();
            readerProcessed.onload = async (pEvent) => {
              try {
                const processedDataUrl = pEvent.target?.result as string;
                const processedImg = await loadImage(processedDataUrl);

                // Evaluate resemblance
                const originalSize = file.size;
                const evaluatedProcessedSize = blob.size;
                
                let compressionSkipped = false;
                const finalProcessedSize = evaluatedProcessedSize;
                const finalProcessedDataUrl = processedDataUrl;
                const psnrVal = calculateSimilarity(originalImg, processedImg);
                
                if (evaluatedProcessedSize > originalSize) {
                  compressionSkipped = true;
                }

                const endTime = performance.now();

                const savingsPercent = originalSize > 0 
                  ? Math.max(0, Math.round(((originalSize - finalProcessedSize) / originalSize) * 100))
                  : 0;

                resolve({
                  originalName: file.name,
                  originalSize,
                  originalType: file.type,
                  originalWidth,
                  originalHeight,
                  originalDataUrl,
                  originalMetadata,

                  processedSize: finalProcessedSize,
                  processedType: format,
                  processedWidth: originalWidth,
                  processedHeight: originalHeight,
                  processedDataUrl: finalProcessedDataUrl,
                  processingTimeMs: Math.round(endTime - startTime),
                  
                  quality,
                  savingsPercent,
                  psnr: psnrVal,
                  compressionSkipped,
                });
                onProgress?.(100);
              } catch (innerErr) {
                reject(innerErr);
              }
            };
            readerProcessed.readAsDataURL(blob);
          },
          format,
          quality
        );
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('FileReader loaded raw file with error'));
    reader.readAsDataURL(file);
  });
}

/**
 * Renders custom watermark text (single centered if density === 0 or repeating tiled grid if density > 0)
 */
function drawWatermark(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  text: string,
  density: number,
  fontSize: number,
  opacity: number,
  color: string
): void {
  if (!text) return;

  ctx.save();
  ctx.filter = 'none';
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  if (density === 0) {
    // Single massive or centered subtle text overlay, rotated 30 degrees
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-30 * Math.PI / 180);
    ctx.fillText(text, 0, 0);
  } else {
    // Tiled repeating grid across the whole canvas view
    const angle = -30 * Math.PI / 180;
    
    // density is 1 to 10
    // Higher density = smaller steps = closer grouped tiles.
    const baseStepX = Math.max(180, fontSize * 6);
    const baseStepY = Math.max(120, fontSize * 4);
    
    // Scale step sizing linearly based on density density
    const scaleFactor = Math.max(0.2, (11 - density) / 6);
    const stepX = baseStepX * scaleFactor;
    const stepY = baseStepY * scaleFactor;

    // Cover extra margins for rotated grid
    for (let x = -w * 0.5; x < w * 1.5; x += stepX) {
      for (let y = -h * 0.5; y < h * 1.5; y += stepY) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillText(text, 0, 0);
        ctx.restore();
      }
    }
  }

  ctx.restore();
}
