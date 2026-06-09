export interface KeyValuePair {
  key: string;
  value: string;
  category: 'GPS' | 'Camera' | 'Standard' | 'Other';
}

export interface ImageMetadata {
  all: KeyValuePair[];
  hasSensitive: boolean;
  gpsCount: number;
  cameraCount: number;
}

export interface ProcessedResult {
  originalName: string;
  originalSize: number;
  originalType: string;
  originalWidth: number;
  originalHeight: number;
  originalDataUrl: string;
  originalMetadata: ImageMetadata;
  
  processedSize: number;
  processedType: 'image/webp' | 'image/jpeg';
  processedWidth: number;
  processedHeight: number;
  processedDataUrl: string;
  processingTimeMs: number;
  
  quality: number;
  savingsPercent: number;
  psnr: number; // Peak Signal-to-Noise Ratio to prove visual lossless structure
  compressionSkipped?: boolean; // 新增：是否由于压缩后更大而跳过了压缩
}

export type AppState = 'IDLE' | 'LOADING' | 'PROCESSING' | 'COMPLETED' | 'ERROR';

export interface BatchImageItem {
  id: string;
  file: File;
  fileName: string;
  fileSize: number;
  fileType: string;
  status: 'PROCESSING' | 'COMPLETED' | 'ERROR';
  progress: number;
  errorMsg?: string;
  result?: ProcessedResult;
}

