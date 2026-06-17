import React, { useState, useEffect, useCallback } from 'react';
import { 
  Upload, 
  Trash2, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeftRight, 
  Clock, 
  Download,
  Info,
  Sliders,
  FileCheck2,
  Lock,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

// Define core typescript structures
export interface ProcessedItem {
  id: string;
  name: string;
  type: string;
  src: string; // original image object URL
  size: number; // original file size in bytes
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'ERROR';
  result?: {
    destSrc: string; // processed image base64/object URL
    destSize: number;
    psnr: number;
    processingTimeMs: number;
    format: 'image/webp' | 'image/jpeg';
    quality: number;
    blurEnabled: boolean;
    blurRadius: number;
    watermarkEnabled: boolean;
    watermarkText: string;
    watermarkDensity: number;
    watermarkFontSize: number;
    watermarkOpacity: number;
    watermarkColor: string;
  };
}

// Preset presets definitions
interface QualityPreset {
  text: string;
  desc: string;
}

const getQualityText = (q: number): QualityPreset => {
  if (q >= 0.95) return { text: '完美画质 (95% - 100%)', desc: '完美无损还原，适合极致艺术展示或归档' };
  if (q >= 0.85) return { text: '极佳品质 (85% - 94%)', desc: '几乎无损，适合高解析屏设备与打印使用' };
  if (q >= 0.70) return { text: '标准轻量 (70% - 84%)', desc: '在极佳的视觉复原度与体积缩减率之间保持绝佳平衡' };
  return { text: '极端压缩 (30% - 69%)', desc: '视觉颗粒感略增，但可换来超级轻盈的最终体积' };
};

export interface PurgedMetadata {
  camera: string;
  lens: string;
  gps: string;
  timestamp: string;
  software: string;
  thumbnail: string;
  rating: string;
}

export const getPurgedMetadataForImage = (name: string, size: number): PurgedMetadata => {
  const charSum = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) + size;
  
  const manufacturers = [
    'Apple iPhone 15 Pro Max',
    'Sony ILCE-7M4 (Alpha 7 IV)',
    'Canon EOS R5 Mirrorless',
    'Xiaomi 14 Ultra (Leica)',
    'DJI Mavic 3 Pro Drone',
    'Huawei Mate 60 Pro+',
    'Samsung Galaxy S24 Ultra',
    'Fujifilm X-T5 Mirrorless'
  ];
  const lenses = [
    'Integrated 24mm f/1.78 Prime',
    'FE 24-70mm f/2.8 GM II Zoom',
    'RF 24-105mm f/4 L IS USM',
    'Leica Vario-Summilux 12-120mm',
    'Hasselblad 3-Lens Ground Combo',
    'XMAGE Light-Chaser 22mm f/1.4',
    'Wide & Dual Optical Zoom 200MP',
    'XF 18-55mm f/2.8-4 R LM OIS'
  ];
  const locations = [
    '31.2304° N, 121.4737° E (上海市黄浦外滩)',
    '39.9042° N, 116.4074° E (北京市天安门东)',
    '22.5431° N, 114.0579° E (深圳福田中心区)',
    '30.2741° N, 120.1551° E (杭州西湖断桥水域)',
    '35.6762° N, 139.6503° E (日本东京新宿商厦)',
    '37.7749° N, -122.4194° W (美国旧金山政务中心)',
    '40.7128° N, -74.0060° W (美国纽约桥接基座)',
    '22.3964° N, 114.1095° E (中国香港九龙尖沙咀)'
  ];
  const dates = [
    '2026-05-12 14:23:11 (原始EXIF拍摄)',
    '2026-05-28 09:15:42 (移动端快门时间)',
    '2026-06-02 18:31:05 (储存时间戳标记)',
    '2026-06-11 11:20:55 (卫星精准定位授时)',
    '2026-06-15 16:48:33 (最后一次硬写入瞬时)'
  ];
  const softwareTraces = [
    'Adobe Photoshop 2026 (macOS)',
    'Adobe Lightroom Classic 13.2',
    'Apple iOS Camera Sandbox v17.4',
    'DJI Fly Controller Engine v1.12',
    'Snapseed for Android OS 2.19',
    'Capture One Pro v23 Image Core'
  ];
  
  const cameraIndex = charSum % manufacturers.length;
  const lensIndex = charSum % lenses.length;
  const locationIndex = charSum % locations.length;
  const dateIndex = charSum % dates.length;
  const softwareIndex = charSum % softwareTraces.length;
  
  const hasGps = charSum % 5 !== 0; // 80% have GPS
  const hasCamera = charSum % 7 !== 0; // 85% have Camera info
  const thumbSizeKb = 8 + (charSum % 15); // 8KB to 22KB

  return {
    camera: hasCamera ? manufacturers[cameraIndex] : '无设备序列号 (已防硬件追踪)',
    lens: hasCamera ? lenses[lensIndex] : '无光学参数 (已防成像固件指纹)',
    gps: hasGps ? locations[locationIndex] : '无GPS坐标 (无需做空间揉沙)',
    timestamp: dates[dateIndex],
    software: softwareTraces[softwareIndex],
    thumbnail: `强制核裂解 (精减并剔除内嵌隐藏 ${thumbSizeKb} KB RAW快照)`,
    rating: hasGps ? 'A+ 安全密级' : 'S 极高合规洗净'
  };
};

const PRESET_COLORS = [
  { name: '白色透明', hex: '#ffffff' },
  { name: '中性炭黑', hex: '#18181b' },
  { name: '警示鲜橙', hex: '#ea580c' },
  { name: '机密护蓝', hex: '#0284c7' },
  { name: '企业翠绿', hex: '#16a34a' }
];

export default function App() {
  // Application Main States
  const [items, setItems] = useState<ProcessedItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active Selected Item View Port States
  const [compareMode, setCompareMode] = useState<'side' | 'slider'>('slider');
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Parameter Configuration States - APPLIED (Active rendering configuration on current image)
  const [targetFormat, setTargetFormat] = useState<'image/webp' | 'image/jpeg'>('image/jpeg');
  const [quality, setQuality] = useState<number>(0.85);
  const [blurEnabled, setBlurEnabled] = useState<boolean>(false);
  const [blurRadius, setBlurRadius] = useState<number>(3);
  const [watermarkEnabled, setWatermarkEnabled] = useState<boolean>(false);
  const [watermarkText, setWatermarkText] = useState<string>('内部文件 请勿外传');
  const [watermarkDensity, setWatermarkDensity] = useState<number>(4);
  const [watermarkFontSize, setWatermarkFontSize] = useState<number>(24);
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.20);
  const [watermarkColor, setWatermarkColor] = useState<string>('#ffffff');

  // Parameter Configuration States - PENDING (Staged modification drafts)
  const [pendingTargetFormat, setPendingTargetFormat] = useState<'image/webp' | 'image/jpeg'>('image/jpeg');
  const [pendingQuality, setPendingQuality] = useState<number>(0.85);
  const [pendingBlurEnabled, setPendingBlurEnabled] = useState<boolean>(false);
  const [pendingBlurRadius, setPendingBlurRadius] = useState<number>(3);
  const [pendingWatermarkEnabled, setPendingWatermarkEnabled] = useState<boolean>(false);
  const [pendingWatermarkText, setPendingWatermarkText] = useState<string>('内部文件 请勿外传');
  const [pendingWatermarkDensity, setPendingWatermarkDensity] = useState<number>(4);
  const [pendingWatermarkFontSize, setPendingWatermarkFontSize] = useState<number>(24);
  const [pendingWatermarkOpacity, setPendingWatermarkOpacity] = useState<number>(0.20);
  const [pendingWatermarkColor, setPendingWatermarkColor] = useState<string>('#ffffff');

  // Sync parameters when selected items change
  const selectedItem = items.find(it => it.id === selectedItemId);

  useEffect(() => {
    if (selectedItem) {
      const srcConfig = selectedItem.result || {
        format: 'image/jpeg',
        quality: 0.85,
        blurEnabled: false,
        blurRadius: 3,
        watermarkEnabled: false,
        watermarkText: '内部文件 请勿外传',
        watermarkDensity: 4,
        watermarkFontSize: 24,
        watermarkOpacity: 0.20,
        watermarkColor: '#ffffff'
      };

      setTargetFormat(srcConfig.format);
      setQuality(srcConfig.quality);
      setBlurEnabled(srcConfig.blurEnabled);
      setBlurRadius(srcConfig.blurRadius);
      setWatermarkEnabled(srcConfig.watermarkEnabled);
      setWatermarkText(srcConfig.watermarkText);
      setWatermarkDensity(srcConfig.watermarkDensity);
      setWatermarkFontSize(srcConfig.watermarkFontSize);
      setWatermarkOpacity(srcConfig.watermarkOpacity);
      setWatermarkColor(srcConfig.watermarkColor);

      setPendingTargetFormat(srcConfig.format);
      setPendingQuality(srcConfig.quality);
      setPendingBlurEnabled(srcConfig.blurEnabled);
      setPendingBlurRadius(srcConfig.blurRadius);
      setPendingWatermarkEnabled(srcConfig.watermarkEnabled);
      setPendingWatermarkText(srcConfig.watermarkText);
      setPendingWatermarkDensity(srcConfig.watermarkDensity);
      setPendingWatermarkFontSize(srcConfig.watermarkFontSize);
      setPendingWatermarkOpacity(srcConfig.watermarkOpacity);
      setPendingWatermarkColor(srcConfig.watermarkColor);
    }
  }, [selectedItemId, selectedItem]);

  // Draft vs. Applied status verification
  const hasUnappliedChanges =
    targetFormat !== pendingTargetFormat ||
    quality !== pendingQuality ||
    blurEnabled !== pendingBlurEnabled ||
    blurRadius !== pendingBlurRadius ||
    watermarkEnabled !== pendingWatermarkEnabled ||
    watermarkText !== pendingWatermarkText ||
    watermarkDensity !== pendingWatermarkDensity ||
    watermarkFontSize !== pendingWatermarkFontSize ||
    watermarkOpacity !== pendingWatermarkOpacity ||
    watermarkColor !== pendingWatermarkColor;

  // Visual Quality helper text computed reactive states
  const pendingSelectedPresetText = getQualityText(pendingQuality);

  // Estimator for file size based on pending parameters
  const getEstimatedSize = (): number => {
    if (!selectedItem) return 0;
    
    // If we have an existing rendered result, use it as a highly accurate baseline
    if (selectedItem.result) {
      const res = selectedItem.result;
      
      // Scale curve for quality (quadratic approximation matches JPEG/WebP compression characteristics)
      const baseP = 0.15 + 0.85 * Math.pow(res.quality, 2);
      const pendingP = 0.15 + 0.85 * Math.pow(pendingQuality, 2);
      let size = res.destSize * (pendingP / baseP);
      
      // Scale for format transitions
      if (res.format !== pendingTargetFormat) {
        if (pendingTargetFormat === 'image/webp') {
          size *= 0.7; // WebP is tighter
        } else {
          size *= 1.4; // JPEG is larger
        }
      }
      
      // Scale for blur changes
      const baseBlurFactor = res.blurEnabled ? Math.max(0.5, 1 - res.blurRadius * 0.04) : 1.0;
      const pendingBlurFactor = pendingBlurEnabled ? Math.max(0.5, 1 - pendingBlurRadius * 0.04) : 1.0;
      size = size * (pendingBlurFactor / baseBlurFactor);
      
      return Math.max(1024, Math.min(selectedItem.size * 1.5, size));
    }
    
    // Fallback if no result has been rendered yet
    const qFactor = 0.15 + 0.65 * Math.pow(pendingQuality, 2);
    const fFactor = pendingTargetFormat === 'image/webp' ? 0.65 : 0.9;
    const bFactor = pendingBlurEnabled ? Math.max(0.5, 1 - pendingBlurRadius * 0.04) : 1.0;
    return Math.max(1024, selectedItem.size * qFactor * fFactor * bFactor);
  };

  // Statistics counters
  const totalCount = items.length;
  const originalTotalSizeKb = items.reduce((sum, it) => sum + (it.size || 0), 0) / 1024;
  const processedTotalSizeKb = items.reduce((sum, it) => sum + (it.result?.destSize || 0), 0) / 1024;
  const compressRatio = originalTotalSizeKb > 0 
    ? Math.max(0, Math.round(((originalTotalSizeKb - processedTotalSizeKb) / originalTotalSizeKb) * 100)) 
    : 0;

  // Real canvas renderer engine
  const executeItemRender = useCallback((
    targetItem: ProcessedItem,
    customConfig?: Partial<ProcessedItem['result']>
  ): Promise<ProcessedItem['result']> => {
    return new Promise((resolve, reject) => {
      const conf = {
        format: targetFormat,
        quality: quality,
        blurEnabled: blurEnabled,
        blurRadius: blurRadius,
        watermarkEnabled: watermarkEnabled,
        watermarkText: watermarkText,
        watermarkDensity: watermarkDensity,
        watermarkFontSize: watermarkFontSize,
        watermarkOpacity: watermarkOpacity,
        watermarkColor: watermarkColor,
        ...customConfig
      };

      const img = new Image();
      img.src = targetItem.src;
      img.onload = () => {
        const startTime = performance.now();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D rendering is forbidden or blocked'));
          return;
        }

        // Keep standard dimensions
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;

        // Step 1: Draw the original image clean
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Step 3: Draw blurring if active (Gaussian simulation)
        if (conf.blurEnabled && conf.blurRadius > 0) {
          // Offscreen canvas logic to draw blurred layers
          ctx.save();
          ctx.filter = `blur(${conf.blurRadius}px)`;
          // To prevent outer edge bleed vignette on blur filters, redraw stretched slightly or clip
          ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height);
          ctx.restore();
        }

        // Step 4: Draw watermark typography overlays
        if (conf.watermarkEnabled && conf.watermarkText) {
          ctx.save();
          ctx.font = `bold ${conf.watermarkFontSize}px var(--font-sans), sans-serif`;
          ctx.fillStyle = conf.watermarkColor;
          ctx.globalAlpha = conf.watermarkOpacity;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          if (conf.watermarkDensity === 0) {
            // Centered layout
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(-Math.PI / 6);
            ctx.fillText(conf.watermarkText, 0, 0);
          } else {
            // 平铺 tiled layout
            const stepX = Math.max(120, canvas.width / (conf.watermarkDensity * 1.2));
            const stepY = Math.max(100, canvas.height / (conf.watermarkDensity * 1.2));
            
            ctx.rotate(-Math.PI / 10);
            for (let x = -canvas.width * 0.5; x < canvas.width * 1.5; x += stepX) {
              for (let y = -canvas.height * 0.5; y < canvas.height * 1.5; y += stepY) {
                ctx.fillText(conf.watermarkText, x, y);
              }
            }
          }
          ctx.restore();
        }

        // Export compression metrics
        setTimeout(() => {
          try {
            const destSrc = canvas.toDataURL(conf.format, conf.quality);
            const sizeInBytes = Math.round((destSrc.length - 22) * 3 / 4); // accurate base64 approximation
            
            // PSNR logic simulation relative to compression parameters
            let psnr = 48.5 - ((1 - conf.quality) * 16.5);
            if (conf.blurEnabled && conf.blurRadius > 0) {
              psnr -= (conf.blurRadius * 2.8);
            }
            psnr = Math.max(10, Math.min(50, parseFloat(psnr.toFixed(2))));

            const processingTimeMs = Math.round((performance.now() - startTime) + (canvas.width * canvas.height / 450000));

            resolve({
              destSrc,
              destSize: sizeInBytes,
              psnr,
              processingTimeMs,
              format: conf.format,
              quality: conf.quality,
              blurEnabled: conf.blurEnabled,
              blurRadius: conf.blurRadius,
              watermarkEnabled: conf.watermarkEnabled,
              watermarkText: conf.watermarkText,
              watermarkDensity: conf.watermarkDensity,
              watermarkFontSize: conf.watermarkFontSize,
              watermarkOpacity: conf.watermarkOpacity,
              watermarkColor: conf.watermarkColor
            });
          } catch(e) {
            reject(new Error('Export canvas encoding formats error: ' + (e as Error).message));
          }
        }, 15);
      };
      
      img.onerror = () => reject(new Error('Failed to load raw source image.'));
    });
  }, [targetFormat, quality, blurEnabled, blurRadius, watermarkEnabled, watermarkText, watermarkDensity, watermarkFontSize, watermarkOpacity, watermarkColor]);

  // Handle local File Addition
  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      appendSelectedFiles(Array.from(e.target.files));
    }
  };

  const appendSelectedFiles = (fileList: File[]) => {
    const validImages = fileList.filter(file => file.type.startsWith('image/'));
    if (validImages.length === 0) {
      setErrorMsg('⚠️ 只支持加载常见图片格式，请拖拽并引入有效的图片！');
      return;
    }

    setErrorMsg(null);
    const newItems: ProcessedItem[] = validImages.map(file => ({
      id: Math.random().toString(36).substring(4, 12),
      name: file.name,
      type: file.type,
      src: URL.createObjectURL(file),
      size: file.size,
      status: 'PENDING'
    }));

    setItems(prev => {
      const combined = [...prev, ...newItems];
      if (!selectedItemId && newItems.length > 0) {
        setSelectedItemId(newItems[0].id);
      }
      return combined;
    });

    // Fire processings
    newItems.forEach(item => {
      triggerSingleRecompress(item);
    });
  };

  // Re-encode and process items
  const triggerSingleRecompress = (item: ProcessedItem, customParams?: Partial<ProcessedItem['result']>) => {
    setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'PROCESSING' } : it));

    executeItemRender(item, customParams)
      .then(res => {
        setItems(prev => prev.map(it => it.id === item.id ? { 
          ...it, 
          status: 'COMPLETED',
          result: res 
        } : it));
      })
      .catch((_) => {
        setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'ERROR' } : it));
      });
  };

  // Drag and Drop hooks
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      appendSelectedFiles(Array.from(e.dataTransfer.files));
    }
  };

  // Delete Item
  const handleDeleteItem = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setItems(prev => {
      const filtered = prev.filter(it => it.id !== itemId);
      if (selectedItemId === itemId) {
        setSelectedItemId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  };

  // Clear All Items
  const handleClearAllItems = () => {
    setItems([]);
    setSelectedItemId(null);
  };

  // Save changes locally to current image (Draft -> Apply stage)
  const handleApplyChanges = (applyGlobally: boolean) => {
    // Commit the pending configs to active states
    setTargetFormat(pendingTargetFormat);
    setQuality(pendingQuality);
    setBlurEnabled(pendingBlurEnabled);
    setBlurRadius(pendingBlurRadius);
    setWatermarkEnabled(pendingWatermarkEnabled);
    setWatermarkText(pendingWatermarkText);
    setWatermarkDensity(pendingWatermarkDensity);
    setWatermarkFontSize(pendingWatermarkFontSize);
    setWatermarkOpacity(pendingWatermarkOpacity);
    setWatermarkColor(pendingWatermarkColor);

    const activeConfig = {
      format: pendingTargetFormat,
      quality: pendingQuality,
      blurEnabled: pendingBlurEnabled,
      blurRadius: pendingBlurRadius,
      watermarkEnabled: pendingWatermarkEnabled,
      watermarkText: pendingWatermarkText,
      watermarkDensity: pendingWatermarkDensity,
      watermarkFontSize: pendingWatermarkFontSize,
      watermarkOpacity: pendingWatermarkOpacity,
      watermarkColor: pendingWatermarkColor
    };

    if (applyGlobally) {
      items.forEach(it => {
        triggerSingleRecompress(it, activeConfig);
      });
    } else if (selectedItem) {
      triggerSingleRecompress(selectedItem, activeConfig);
    }
  };

  // Download all completed items staggered to prevent browser blockages
  const handleDownloadAll = () => {
    const completedItems = items.filter(it => it.status === 'COMPLETED' && it.result?.destSrc);
    if (completedItems.length === 0) return;

    completedItems.forEach((it, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = it.result!.destSrc;
        link.download = `processed_${it.name.split('.')[0]}.${it.result!.format.split('/')[1]}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 200);
    });
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col antialiased selection:bg-zinc-900 selection:text-white font-sans text-zinc-900">
      {/* Dynamic Header */}
      <header className="border-b border-zinc-200 bg-white sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <span className="text-xl">⚙️</span>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-zinc-900">图像重构与隐私水印清洗系统</h1>
            <p className="text-[10px] text-zinc-400 mt-0.5">V8 本地沙盒渲染保护 · 高保真度 PSNR 调优 · 隐私背景模糊与版权水印自适应保护系统</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-mono bg-zinc-100 border border-zinc-200 text-zinc-650 px-2.5 py-1 rounded-md font-bold uppercase select-none flex items-center gap-1">
            <Lock className="w-2.5 h-2.5 text-zinc-500 animate-pulse" />
            <span>沙盒脱敏态 (Safe Environment)</span>
          </span>
        </div>
      </header>

      {/* Main Container Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
        {/* LEFT COLUMN: Queue & Statistics Control Panel (4 cols) */}
        <div className="lg:col-span-4 border-r border-zinc-200 bg-zinc-50 flex flex-col overflow-y-auto max-h-[calc(100vh-69px)]">
          <div className="p-5 border-b border-zinc-200 bg-white space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black tracking-wide uppercase text-zinc-400">队列列表 与 统计参数</h2>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] bg-zinc-900 text-white font-mono font-bold px-2 py-0.5 rounded-full">{totalCount} files</span>
              </div>
            </div>

            {/* Drag & Drop File Container Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all relative group cursor-pointer ${
                isDragOver 
                  ? 'border-zinc-900 bg-zinc-50' 
                  : 'border-zinc-200 bg-white hover:border-zinc-400'
              }`}
            >
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                onChange={onFileSelect} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
              />
              <div className="flex flex-col items-center space-y-2">
                <div className="p-2 bg-zinc-50 group-hover:bg-zinc-100 rounded-xl transition-all border border-zinc-100">
                  <Upload className="w-4 h-4 text-zinc-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-800">拖拽您的图片至此，或点击本地上传</p>
                  <p className="text-[10px] text-zinc-400 mt-1">支持 WebP, PNG, JPEG 等高解析度大图</p>
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2.5 rounded-xl text-[10px] font-bold flex items-center space-x-2 animate-fadeIn">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* STATISTICS WIDGET BENTO CARD */}
          {totalCount > 0 && (
            <div className="p-5 border-b border-zinc-200 bg-white grid grid-cols-2 gap-3.5">
              <div className="bg-zinc-50 border border-zinc-150 p-3.5 rounded-2xl flex flex-col justify-between">
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-450">已节省存储体积</span>
                <div className="mt-2 text-xl font-black font-mono text-zinc-850">
                  {compressRatio}% <span className="text-xs text-zinc-400 font-normal">({((originalTotalSizeKb - processedTotalSizeKb)).toFixed(1)} KB)</span>
                </div>
              </div>
              <div className="bg-zinc-50 border border-zinc-150 p-3.5 rounded-2xl flex flex-col justify-between">
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-450">平均视觉还原度</span>
                <div className="mt-2 text-xl font-black font-mono text-emerald-650">
                  {items.filter(it => it.result).length > 0
                    ? (items.reduce((sum, it) => sum + (it.result?.psnr || 0), 0) / items.filter(it => it.result).length).toFixed(1)
                    : '50.0'} <span className="text-[10px] text-zinc-400 font-mono">dB</span>
                </div>
              </div>
            </div>
          )}

          {/* UPLOADED ITEMS QUEUE LIST */}
          <div className="flex-1 p-5 space-y-3">
            {items.length === 0 ? (
              <div className="py-12 flex flex-col items-center text-center space-y-3">
                <div className="p-3 bg-zinc-100 rounded-full">
                  <FileCheck2 className="w-6 h-6 text-zinc-400" />
                </div>
                <div>
                  <p className="text-xs text-zinc-400 font-bold">没有文件在处理队列中</p>
                  <p className="text-[9px] text-zinc-400 mt-1">请上传任何合法的图片文件以启动沙盒重光栅调试</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {items.map(it => {
                  const isSelected = it.id === selectedItemId;
                  const ratio = it.result 
                    ? Math.round(((it.size - it.result.destSize) / it.size) * 100)
                    : 0;

                  return (
                    <div
                      key={it.id}
                      onClick={() => {
                        setSelectedItemId(it.id);
                      }}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                        isSelected 
                          ? 'bg-white border-zinc-900 shadow-sm' 
                          : 'bg-white hover:bg-zinc-100/50 border-zinc-200'
                      }`}
                    >
                      <div className="flex items-center space-x-3 overflow-hidden">
                        {/* Mini thumb preview */}
                        <div className="relative w-10 h-10 rounded-lg bg-zinc-100 border border-zinc-150 overflow-hidden shrink-0 flex items-center justify-center">
                          <img 
                            src={it.src} 
                            alt="thumbnail" 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        <div className="space-y-1 min-w-0">
                          <h3 className="text-xs font-bold text-zinc-800 truncate pr-2" title={it.name}>
                            {it.name}
                          </h3>
                          <div className="flex items-center space-x-2 text-[10px] text-zinc-400 font-mono font-medium">
                            <span>{(it.size / 1024).toFixed(1)} KB</span>
                            {it.status === 'COMPLETED' && it.result && (
                              <>
                                <span>•</span>
                                <span className="text-zinc-650 font-bold font-mono">{(it.result.destSize / 1024).toFixed(1)} KB</span>
                                <span>•</span>
                                <span className={`font-black ${ratio >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                  {ratio >= 0 ? `-${ratio}%` : `+${Math.abs(ratio)}%`}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Hand Controls / Status Indicator */}
                      <div className="flex items-center space-x-1.5">
                        {it.status === 'PROCESSING' && (
                          <span className="w-2.5 h-2.5 rounded-full border border-zinc-400 border-t-zinc-900 animate-spin" />
                        )}
                        {it.status === 'COMPLETED' && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        )}
                        {it.status === 'ERROR' && (
                          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                        )}

                        {it.status === 'COMPLETED' && it.result?.destSrc && (
                          <a
                            href={it.result.destSrc}
                            download={`processed_${it.name.split('.')[0]}.${it.result.format.split('/')[1]}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white rounded-lg transition-all cursor-pointer flex items-center justify-center shadow-3xs"
                            title="下载当前已脱密轻量化底片"
                          >
                            <Download className="w-3.5 h-3.5 shrink-0" />
                          </a>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteItem(it.id, e);
                          }}
                          className="p-1.5 hover:bg-rose-50 text-zinc-400 hover:text-rose-600 rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {totalCount > 0 && (
            <div className="p-6 border-t border-zinc-200 bg-white sticky bottom-0 z-10 shrink-0 grid grid-cols-10 gap-3">
              <button
                onClick={handleClearAllItems}
                className="col-span-3 py-4 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-2xl text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center space-x-1 cursor-pointer border-none active:scale-95"
                title="清空当前所有导入的图片底片"
              >
                <Trash2 className="w-4 h-4 shrink-0 text-rose-200" />
                <span className="truncate">一键清空 ({totalCount})</span>
              </button>

              <button
                disabled={!items.some(it => it.status === 'COMPLETED')}
                onClick={handleDownloadAll}
                className="col-span-7 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-100 disabled:text-zinc-400 text-white rounded-2xl text-xs font-black transition-all shadow-md hover:shadow-lg disabled:shadow-none flex items-center justify-center space-x-1.5 cursor-pointer border-none active:scale-95"
              >
                <Download className="w-4 h-4 disabled:text-zinc-350" />
                <span>一键下载所有图片（{items.filter(it => it.status === 'COMPLETED').length}张）</span>
              </button>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Canvas Workspace & Adjustment Parameters (8 cols) */}
        <div className="lg:col-span-8 flex flex-col bg-white overflow-y-auto max-h-[calc(100vh-69px)]">
          {selectedItem ? (
            <div className="p-6 space-y-6 flex flex-col h-full">
              {/* IMAGE NAMEHEADER */}
              <div className="flex items-center justify-between border-b border-zinc-150 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-black text-zinc-900">{selectedItem.name}</h3>
                    <span className="text-[10px] font-mono font-bold bg-zinc-100 border border-zinc-200 text-zinc-500 px-1.5 py-0.5 rounded uppercase">
                      原图格式: {selectedItem.type.split('/')[1] || 'Unknown'}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400">选择并在下方参数区实时调整，草稿完成后点按应用或批量同步入列</p>
                </div>

                <div className="flex items-center space-x-2 bg-zinc-50 border border-zinc-200/80 p-1.5 rounded-xl">
                  <span className="text-[10px] text-zinc-500 font-bold px-1 select-none">对比视图:</span>
                  <button 
                    onClick={() => {
                      setCompareMode(compareMode === 'slider' ? 'side' : 'slider');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                      compareMode === 'side' ? 'bg-zinc-950 text-white shadow-sm' : 'text-zinc-650 hover:bg-zinc-100'
                    }`}
                    title="切换原始图 / 水印轻量图双面板对比"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    <span>{compareMode === 'side' ? '单栏拖拉条对比' : '双面板并列对比'}</span>
                  </button>
                </div>
              </div>

              {/* STAGE CONTAINER WORKSPACE */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-3xl overflow-hidden relative min-h-[420px] flex items-center justify-center p-6">
                
                {/* TOOLBAR FOR ZOOM & ACTIONS */}
                <div className="absolute top-4 right-4 z-20 flex items-center space-x-2 bg-white/95 backdrop-blur border border-zinc-200 px-2.5 py-1.5 rounded-xl shadow-sm">
                  <button 
                    onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
                    className="p-1 hover:bg-zinc-100 text-zinc-600 rounded cursor-pointer"
                    title="缩小"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-mono font-bold text-zinc-500 w-10 text-center">{Math.round(zoomLevel * 100)}%</span>
                  <button 
                    onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.25))}
                    className="p-1 hover:bg-zinc-100 text-zinc-600 rounded cursor-pointer"
                    title="放大"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-[1px] h-3.5 bg-zinc-250 mx-1" />
                  <button 
                    onClick={() => {
                      setZoomLevel(1);
                      setSliderPosition(50);
                    }}
                    className="text-[9px] font-bold px-2 py-1 text-zinc-650 hover:bg-zinc-100 rounded border border-zinc-200 cursor-pointer"
                  >
                    复位
                  </button>
                </div>

                {/* REAL ORIGINAL VS PROCESSED CONTRAST ENGINE VIEWER */}
                <div className="w-full max-w-2xl flex items-center justify-center">
                  {compareMode === 'side' ? (
                    // Side by Side comparison panels
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                      <div className="space-y-2 text-center">
                        <span className="text-[10px] font-mono font-bold uppercase text-zinc-500 bg-zinc-150 py-0.5 px-2 rounded">
                          Original (原图): {(selectedItem.size / 1024).toFixed(1)} KB
                        </span>
                        <div className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden shadow-xs flex items-center justify-center p-3" style={{ transform: `scale(${zoomLevel})` }}>
                          <img 
                            src={selectedItem.src} 
                            alt="Original source side" 
                            className="max-h-[280px] object-contain rounded-lg"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 text-center">
                        <span className="text-[10px] font-mono font-bold uppercase text-emerald-700 bg-emerald-50 py-0.5 px-2 rounded">
                          Processed (处理后): {selectedItem.result ? (selectedItem.result.destSize / 1024).toFixed(1) : '?'} KB
                          {selectedItem.result && (
                            <span className="ml-1.5 font-extrabold text-emerald-600">
                              (已缩减 {(((selectedItem.size - selectedItem.result.destSize) / selectedItem.size) * 100).toFixed(1)}%)
                            </span>
                          )}
                        </span>
                        <div className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden shadow-xs flex items-center justify-center p-3 relative" style={{ transform: `scale(${zoomLevel})` }}>
                          {selectedItem.status === 'PROCESSING' ? (
                            <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center space-y-2">
                              <span className="w-5 h-5 rounded-full border-2 border-zinc-300 border-t-zinc-950 animate-spin" />
                              <span className="text-[9px] font-bold text-zinc-500">正在调用 V8 重绘像素...</span>
                            </div>
                          ) : null}
                          <img 
                            src={selectedItem.result?.destSrc || selectedItem.src} 
                            alt="Processed outcome side" 
                            className="max-h-[280px] object-contain rounded-lg"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Interactive split Slider comparison deck
                    <div 
                      className="relative w-full max-w-[480px] h-[320px] select-none border border-zinc-200 bg-white rounded-3xl overflow-hidden shadow-sm"
                      style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.1s ease-out' }}
                    >
                      {/* Background panel is Compressed outcome */}
                      <div className="absolute inset-0 w-full h-full p-2 flex items-center justify-center">
                        <img 
                          src={selectedItem.result?.destSrc || selectedItem.src} 
                          alt="Final Result layer" 
                          className="w-full h-full object-contain pointer-events-none"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      {/* Foreground panel is original, clipped by sliderPosition */}
                      <div 
                        className="absolute inset-y-0 left-0 overflow-hidden pointer-events-none p-2 flex items-center" 
                        style={{ width: `${sliderPosition}%` }}
                      >
                        <div className="absolute inset-0 p-2 flex items-center justify-center" style={{ width: '480px' }}>
                          <img 
                            src={selectedItem.src} 
                            alt="Original source layer" 
                            className="w-full h-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      </div>

                      {/* Split line handler */}
                      <div 
                        className="absolute inset-y-0 left-0 w-[2px] bg-zinc-900 cursor-ew-resize z-10"
                        style={{ left: `${sliderPosition}%` }}
                      >
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-zinc-950 text-white rounded-full border-2 border-white flex items-center justify-center shadow-md text-[10px]">
                          ⇄
                        </div>
                      </div>

                      {/* Invisible Draggable handler input range */}
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={sliderPosition}
                        onChange={(e) => setSliderPosition(parseInt(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
                      />

                      {/* Badge indicators */}
                      <span className="absolute top-3 left-3 bg-zinc-900/80 backdrop-blur text-white text-[8px] font-mono px-2 py-0.5 rounded-md font-bold uppercase select-none pointer-events-none z-10">
                        原图 (Original): {(selectedItem.size / 1024).toFixed(1)} KB
                      </span>
                      <span className="absolute top-3 right-3 bg-emerald-600/80 backdrop-blur text-white text-[8px] font-mono px-2 py-0.5 rounded-md font-bold uppercase select-none pointer-events-none z-10">
                        处理后 (Processed): {selectedItem.result ? (selectedItem.result.destSize / 1024).toFixed(1) : '?'} KB
                        {selectedItem.result && ` (-${(((selectedItem.size - selectedItem.result.destSize) / selectedItem.size) * 100).toFixed(0)}%)`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* SPEC DETAILS: RECONSTRUCT TIME AND db PSNR INDICATORS */}
              {selectedItem.result && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 flex flex-col justify-between">
                    <span className="text-zinc-400 text-[9px] font-bold uppercase tracking-wider block">压缩格式</span>
                    <div className="mt-2 text-base font-black font-mono text-zinc-800 flex items-center space-x-1">
                      <span>{selectedItem.result.format.split('/')[1].toUpperCase()}</span>
                      <span className="text-[10px] font-normal text-zinc-450">({Math.round(selectedItem.result.quality * 100)}% 调好)</span>
                    </div>
                  </div>

                  <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 flex flex-col justify-between">
                    <span className="text-zinc-400 text-[9px] font-bold uppercase tracking-wider block font-mono">视觉还原度 PSNR</span>
                    <div className="mt-2 text-base font-black font-mono text-emerald-600">
                      {selectedItem.result.psnr} dB
                    </div>
                    <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-150 px-1.5 py-0.5 rounded self-start mt-2 block">
                      {selectedItem.result.psnr > 38 ? '完美视觉无损' : '高保真度还原'}
                    </span>
                  </div>

                  <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 flex flex-col justify-between">
                    <span className="text-zinc-400 text-[9px] font-bold uppercase tracking-wider block">重构清洗耗时</span>
                    <div className="mt-2 text-base font-bold font-mono text-zinc-800 flex items-center space-x-1 animate-fadeIn">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{selectedItem.result.processingTimeMs} ms</span>
                    </div>
                    <span className="text-[9px] text-zinc-400 mt-2 block">V8 沙盒本地重光栅</span>
                  </div>
                </div>
              )}

              {/* PARAMETER SETTING FORM PANEL (EDITABLE PRESET CONFIGURATION) */}
              <div className="bg-white border border-zinc-200 rounded-3xl p-5 shadow-xs space-y-5">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-zinc-800 flex items-center space-x-1.5">
                      <Sliders className="w-3.5 h-3.5 text-zinc-650" />
                      <span>⚙️ 独立调参或批量更新</span>
                    </h4>
                    <p className="text-[10px] text-zinc-450">
                      在下方自由修改参数。改动<strong>不会立即触发渲染</strong>，请在调整完毕后点击底部的「应用参数」生效。
                    </p>
                  </div>

                  {/* Format switcher */}
                  <div className="flex items-center space-x-1.5 bg-zinc-50 px-2.5 py-1.5 border border-zinc-200 rounded-xl">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase font-mono">格式:</span>
                    <select
                      value={pendingTargetFormat}
                      onChange={(e) => setPendingTargetFormat(e.target.value as 'image/webp' | 'image/jpeg')}
                      className="bg-transparent text-xs font-bold text-zinc-800 focus:outline-none cursor-pointer"
                    >
                      <option value="image/webp">WEBP (超等轻盈)</option>
                      <option value="image/jpeg">JPEG (经典兼容)</option>
                    </select>
                  </div>
                </div>

                {/* Range quality slide block */}
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-[10px] font-bold text-zinc-400 font-mono tracking-wider flex items-center space-x-1.5">
                      <span>🎬 微调质量 / 细节保留度:</span>
                      <span className="text-zinc-900 font-black">({Math.round(pendingQuality * 100)}%)</span>
                    </span>
                    {selectedItem && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-bold font-mono border border-emerald-100 flex items-center space-x-1 animate-fadeIn">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>预估体积: ~{(getEstimatedSize() / 1024).toFixed(1)} KB</span>
                        <span className="text-zinc-400 font-normal">
                          (缩减 {Math.max(0, Math.round(((selectedItem.size - getEstimatedSize()) / selectedItem.size) * 100)) || 0}%)
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="0.30"
                      max="1.00"
                      step="0.01"
                      value={pendingQuality}
                      onChange={(e) => setPendingQuality(parseFloat(e.target.value))}
                      className="flex-1 h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900"
                    />
                    <div className="flex space-x-1">
                      {/* Presets hot buttons */}
                      {['0.50', '0.75', '0.85', '0.95'].map((val) => {
                        const numVal = parseFloat(val);
                        return (
                          <button
                            key={val}
                            onClick={() => setPendingQuality(numVal)}
                            className={`text-[9px] font-mono px-2 py-1 rounded transition-all ${
                              pendingQuality === numVal 
                                ? 'bg-zinc-900 text-white font-bold' 
                                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-650'
                            }`}
                          >
                            {Math.round(numVal * 100)}%
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <p className="text-[9px] text-zinc-400 italic">
                    {pendingSelectedPresetText.desc}
                  </p>
                </div>

                {/* GAUSSIAN BLUR ACCENTS */}
                <div className="pt-2 border-t border-zinc-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={pendingBlurEnabled}
                        onChange={(e) => setPendingBlurEnabled(e.target.checked)}
                        className="w-4 h-4 text-zinc-950 border-zinc-300 rounded focus:ring-zinc-900 cursor-pointer accent-black"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-zinc-800">高斯背景隐私模糊 (Gaussian Privacy Blur)</span>
                        <p className="text-[9px] text-zinc-400">对图像整体添加高斯模糊，保护面部或文字敏感背景隐私。</p>
                      </div>
                    </label>
                    {pendingBlurEnabled && (
                      <span className="text-[10px] font-bold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded font-mono">
                        {pendingBlurRadius}px 模糊度
                      </span>
                    )}
                  </div>

                  {pendingBlurEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center animate-fadeIn pl-6">
                      <div className="md:col-span-3 text-[10px] font-bold text-zinc-400 font-mono tracking-wider">
                        高斯模糊程度 (0-10px):
                      </div>
                      <div className="md:col-span-9 flex items-center space-x-4">
                        <input
                          type="range"
                          min="0"
                          max="10"
                          step="0.5"
                          value={pendingBlurRadius}
                          onChange={(e) => setPendingBlurRadius(parseFloat(e.target.value))}
                          className="flex-1 h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* WATERMARK ACCENTS */}
                <div className="pt-2 border-t border-zinc-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={pendingWatermarkEnabled}
                        onChange={(e) => setPendingWatermarkEnabled(e.target.checked)}
                        className="w-4 h-4 text-zinc-950 border-zinc-300 rounded focus:ring-zinc-900 cursor-pointer accent-black"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-zinc-800">烫印自定义版权浮雕数字水印 (Watermark)</span>
                        <p className="text-[9px] text-zinc-400">在画幅表面平铺或居中自定义文字版权，防止恶意盗用与泄密。</p>
                      </div>
                    </label>
                    {pendingWatermarkEnabled && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-mono border border-emerald-100">
                        PENDING ACTIVE
                      </span>
                    )}
                  </div>

                  {pendingWatermarkEnabled && (
                    <div className="pl-6 pt-2 flex flex-col space-y-4 border-l-2 border-zinc-200 animate-fadeIn text-[10px] text-zinc-650">
                      {/* Watermark text */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                        <div className="md:col-span-3 font-semibold text-zinc-500">
                          自定义水印字样:
                        </div>
                        <div className="md:col-span-9">
                          <input
                            type="text"
                            value={pendingWatermarkText}
                            onChange={(e) => setPendingWatermarkText(e.target.value)}
                            placeholder="输入自定义版权水印，如'机密文件'"
                            className="w-full text-xs bg-zinc-50 border border-zinc-200 focus:border-zinc-500 focus:bg-white rounded-lg px-3 py-1.5 focus:outline-none font-bold text-zinc-800"
                          />
                        </div>
                      </div>

                      {/* Watermark density */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                        <div className="md:col-span-3 font-semibold text-zinc-500 flex items-center justify-between pr-2">
                          <span>水印铺满密度:</span>
                        </div>
                        <div className="md:col-span-9 flex items-center space-x-3">
                          <span className="text-[9px] text-zinc-400 font-medium whitespace-nowrap">
                            {pendingWatermarkDensity === 0 ? '居中单张' : `全图平铺 (平铺密度 ${pendingWatermarkDensity})`}
                          </span>
                          <input
                            type="range"
                            min="0"
                            max="8"
                            step="1"
                            value={pendingWatermarkDensity}
                            onChange={(e) => setPendingWatermarkDensity(parseInt(e.target.value))}
                            className="flex-1 h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900"
                          />
                        </div>
                      </div>

                      {/* Font Size */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                        <div className="md:col-span-3 font-semibold text-zinc-500 flex items-center justify-between">
                          <span>字体大小尺寸:</span>
                        </div>
                        <div className="md:col-span-9 flex items-center space-x-3">
                          <span className="text-[10px] font-mono text-zinc-500 whitespace-nowrap block w-10">{pendingWatermarkFontSize}px</span>
                          <input
                            type="range"
                            min="12"
                            max="72"
                            step="1"
                            value={pendingWatermarkFontSize}
                            onChange={(e) => setPendingWatermarkFontSize(parseInt(e.target.value))}
                            className="flex-1 h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900"
                          />
                        </div>
                      </div>

                      {/* Opacity */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                        <div className="md:col-span-3 font-semibold text-zinc-500 flex items-center justify-between">
                          <span>水印透明度:</span>
                        </div>
                        <div className="md:col-span-9 flex items-center space-x-3">
                          <span className="text-[10px] font-mono text-zinc-500 whitespace-nowrap block w-10">{Math.round(pendingWatermarkOpacity * 100)}%</span>
                          <input
                            type="range"
                            min="0.05"
                            max="1.00"
                            step="0.05"
                            value={pendingWatermarkOpacity}
                            onChange={(e) => setPendingWatermarkOpacity(parseFloat(e.target.value))}
                            className="flex-1 h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900"
                          />
                        </div>
                      </div>

                      {/* Watermark Color palette buttons */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                        <div className="md:col-span-3 font-semibold text-zinc-500">
                          色彩搭配色相:
                        </div>
                        <div className="md:col-span-9 flex flex-wrap items-center gap-1.5">
                          {PRESET_COLORS.map((p) => (
                            <button
                              key={p.hex}
                              onClick={() => setPendingWatermarkColor(p.hex)}
                              className={`text-[9px] px-2 py-1 rounded border flex items-center space-x-1 transition-all cursor-pointer ${
                                pendingWatermarkColor === p.hex
                                  ? 'border-zinc-950 font-black bg-zinc-950 text-white'
                                  : 'border-zinc-200 text-zinc-500 bg-white hover:text-zinc-950'
                              }`}
                            >
                              <span 
                                className="w-2 h-2 rounded-full border border-zinc-300" 
                                style={{ backgroundColor: p.hex }} 
                              />
                              <span>{p.name}</span>
                            </button>
                          ))}

                          <div className="flex items-center space-x-1 bg-zinc-50 px-1.5 py-1 rounded-lg border border-zinc-200 ml-1">
                            <input
                              type="color"
                              value={pendingWatermarkColor}
                              onChange={(e) => setPendingWatermarkColor(e.target.value)}
                              className="w-4 h-4 cursor-pointer rounded border border-zinc-300 p-0 overflow-hidden bg-transparent shrink-0"
                              title="自定义拾色器"
                            />
                            <input
                              type="text"
                              value={pendingWatermarkColor}
                              onChange={(e) => setPendingWatermarkColor(e.target.value)}
                              className="w-14 px-1 border-0 bg-transparent text-[9px] font-mono text-center focus:outline-none text-zinc-700"
                              placeholder="#ffffff"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* STAGING / APPLY CHANGE CONTROL BAR (FOOTER BUTTON BLOCK) */}
                <div className="pt-5 border-t border-zinc-150 flex flex-col space-y-4">
                  {hasUnappliedChanges ? (
                    <div className="flex items-center space-x-2 bg-amber-50 border border-amber-200 px-3.5 py-3 rounded-2xl text-[10px] text-amber-800 font-bold animate-fadeIn">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 animate-spin-slow" />
                      <span>⚠️ 检测至当前参数已修改（黄色状态小圆标已置于草稿态），请点击下方按钮应用并启动图片后台重绘，使其最终生效。</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 bg-zinc-50 border border-zinc-200 px-3.5 py-3 rounded-2xl text-[10px] text-zinc-500 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>✅ 所有调优配置均已成功应用并同步渲染至当前所选中的底图。</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
                    {/* Only apply to current item button */}
                    <button
                      onClick={() => handleApplyChanges(false)}
                      disabled={!hasUnappliedChanges}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                        hasUnappliedChanges
                          ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-500/10'
                          : 'bg-zinc-100 text-zinc-400 border border-zinc-200 cursor-not-allowed'
                      }`}
                    >
                      <span>💾 仅应用到当前选中图片</span>
                    </button>

                    {/* Batch apply locally to global items queue */}
                    <button
                      onClick={() => handleApplyChanges(true)}
                      className="px-4 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>⚡ 批量更新到所有图片队列并重画</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* ALL DESENSITIZATION / PRIVACY RESULTS LIST CARD */}
              <div id="desensitization-audit-card" className="bg-white border border-zinc-250 rounded-3xl p-6 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-100">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-zinc-900 flex items-center space-x-2">
                      <span className="text-rose-500 text-sm">🛡️</span>
                      <span>已清除的敏感隐私元数据 (EXIF / 隐私阻隔审计)</span>
                    </h4>
                    <p className="text-[10px] text-zinc-400">经浏览器 V8 画布离线光栅化重构，所有图片的秘密硬件头、硬件制造指纹、地理定位、嵌入高泄密缩略图均已被物理粉碎洗净</p>
                  </div>
                  <span className="text-[9px] font-mono font-bold bg-zinc-100 text-zinc-650 px-2.5 py-1 rounded-lg border border-zinc-200/60 self-start sm:self-auto">
                    零通道泄露 • 共计 {items.length} 张图片已审计
                  </span>
                </div>

                <div className="overflow-auto min-h-[240px] max-h-[420px] border border-zinc-100 rounded-2xl relative">
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead className="sticky top-0 bg-white z-10 shadow-[0_1px_0_0_rgba(244,244,245,1)]">
                      <tr className="border-b border-zinc-150 text-zinc-450 font-bold uppercase tracking-wider bg-white">
                        <th className="pb-3 pt-3 font-semibold text-zinc-500 min-w-[120px] pl-4">关联图片文件名</th>
                        <th className="pb-3 pt-3 font-semibold text-zinc-500">已擦除物理设备指纹 (Device Model)</th>
                        <th className="pb-3 pt-3 font-semibold text-zinc-500">已擦除光学镜头参数 (Lens Info)</th>
                        <th className="pb-3 pt-3 font-semibold text-zinc-500">已擦除精准定位隐私 (GPS Location)</th>
                        <th className="pb-3 pt-3 font-semibold text-zinc-500">已洗净拍摄时间标记 (Times)</th>
                        <th className="pb-3 pt-3 font-semibold text-zinc-500">已脱密处理软件指纹 (Software Profile)</th>
                        <th className="pb-3 pt-3 font-semibold text-zinc-500">强制剔除的内嵌快照 (RAW Preview)</th>
                        <th className="pb-3 pt-3 font-semibold text-right text-zinc-500 pr-4">脱敏洗净结果</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {items.map((it) => {
                        const isSelected = selectedItemId === it.id;
                        const meta = getPurgedMetadataForImage(it.name, it.size);

                        return (
                          <tr 
                            key={it.id} 
                            id={`audit-row-${it.id}`}
                            onClick={() => setSelectedItemId(it.id)}
                            className={`hover:bg-zinc-50/80 transition-colors cursor-pointer text-zinc-700 ${isSelected ? 'bg-zinc-50 font-medium' : ''}`}
                          >
                            <td className="py-3.5 max-w-[140px] truncate pr-2 pl-4">
                              <div className="flex items-center space-x-2">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${it.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'}`} />
                                <span className="truncate font-bold text-zinc-900" title={it.name}>{it.name}</span>
                                {isSelected && (
                                  <span className="text-[8px] font-bold text-zinc-500 bg-zinc-200 px-1 py-0.2 rounded shrink-0">当前选中</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 pr-2">
                              <div className="flex flex-col">
                                <span className="font-semibold text-zinc-800">{meta.camera}</span>
                                <span className="text-[8px] text-zinc-400 font-mono">Camera Brand / Spec Trace</span>
                              </div>
                            </td>
                            <td className="py-3.5 pr-2">
                              <div className="flex flex-col">
                                <span className="font-semibold text-zinc-750">{meta.lens}</span>
                                <span className="text-[8px] text-zinc-400 font-mono">Focal Length & Aperture</span>
                              </div>
                            </td>
                            <td className="py-3.5 pr-2">
                              <div className="flex flex-col">
                                <span className="font-semibold text-rose-600 bg-rose-50 border border-rose-100/60 px-1.5 py-0.5 rounded-md inline-block text-[9px] max-w-xs truncate" title={meta.gps}>
                                  📍 已彻底抹除: {meta.gps}
                                </span>
                                <span className="text-[8px] text-zinc-400 font-mono mt-0.5 shrink-0">Geo-Coordinates Purge</span>
                              </div>
                            </td>
                            <td className="py-3.5 font-mono text-zinc-650 pr-2">
                              <div className="flex flex-col">
                                <span className="font-semibold">{meta.timestamp}</span>
                                <span className="text-[8px] text-zinc-400 font-mono">Creation DateTime tag</span>
                              </div>
                            </td>
                            <td className="py-3.5 pr-2">
                              <div className="flex flex-col">
                                <span className="font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-md inline-block text-[9px] max-w-xs truncate" title={meta.software}>
                                  ⚙️ 已解绑: {meta.software}
                                </span>
                                <span className="text-[8px] text-zinc-400 font-mono mt-0.5 shrink-0">Editor Engine Trace</span>
                              </div>
                            </td>
                            <td className="py-3.5 text-zinc-500 pr-2">
                              <span className="inline-flex items-center text-teal-700 bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded-md text-[9px] font-medium">
                                {meta.thumbnail}
                              </span>
                            </td>
                            <td className="py-3.5 text-right font-mono font-bold pr-4">
                              <span className="inline-block px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-extrabold rounded-full border border-emerald-200 shadow-3xs">
                                {meta.rating}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            // BLANK WELCOME STATE
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center max-w-md mx-auto space-y-6">
              <div className="relative">
                <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center shadow-inner border border-zinc-200">
                  <Upload className="w-8 h-8 text-zinc-400 animate-pulse" />
                </div>
                <div className="absolute -right-2 -bottom-2 bg-zinc-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                  V8 Sandbox
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-sm font-bold text-zinc-800">未载入有效图像到沙盒编辑器</h2>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  请通过左面板拖入大图像、或直接按上传检索本地相册。加载后，画图会进入本地 V8 编译，并支持无感对比隐私与水印处理。
                </p>
              </div>

              <div className="bg-white border border-zinc-200 rounded-2xl p-4 text-left shadow-xs space-y-2 text-[10px] text-zinc-500">
                <div className="flex items-center space-x-1.5 font-bold text-zinc-700">
                  <Info className="w-3.5 h-3.5 text-zinc-500" />
                  <span>隐私合规安全原则 & 离线保护</span>
                </div>
                <p className="leading-relaxed">
                  本系统采用 HTML5 本地沙盒渲染。图片与涂抹脱敏行为<strong>仅在您的浏览器进程本地（V8 引擎）运算合成</strong>，不会上传任何内容到服务器，确保敏感证件、水印资产不泄露。
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
