import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Trash2, 
  CheckCircle, 
  ShieldAlert, 
  Download, 
  RefreshCw, 
  Sparkles, 
  FileImage, 
  Info, 
  Clock, 
  Check,
  AlertTriangle,
  Plus,
  Files,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { processImage } from './utils/imageProcessor';
import { ProcessedResult, AppState, BatchImageItem } from './types';
import ImageSlider from './components/ImageSlider';
import MetadataViewer from './components/MetadataViewer';

export default function App() {
  const [appState, setAppState] = useState<AppState>('IDLE');
  const [items, setItems] = useState<BatchImageItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  
  // Settings state (acts as active parameters)
  const [targetFormat, setTargetFormat] = useState<'image/webp' | 'image/jpeg'>('image/webp');
  const [quality, setQuality] = useState<number>(0.88); // Default visually lossless level
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mainDropzoneRef = useRef<HTMLDivElement>(null);

  // Auto transition to IDLE if items are completely cleared
  useEffect(() => {
    if (items.length === 0 && appState !== 'IDLE') {
      setAppState('IDLE');
      setSelectedItemId(null);
    }
  }, [items, appState]);

  // Helper to format bytes cleanly
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Safe file loader triggered by input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      addFilesToBatch(Array.from(files));
    }
  };

  // Drag and drop events
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
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      addFilesToBatch(Array.from(files));
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  // Process a singular item background worker
  const processFileToItem = async (file: File, itemId: string, fmt: 'image/webp' | 'image/jpeg', q: number) => {
    try {
      const processed = await processImage({
        file,
        format: fmt,
        quality: q,
        onProgress: (p) => {
          setItems(prev => prev.map(item => 
            item.id === itemId ? { ...item, progress: p } : item
          ));
        },
      });

      setItems(prev => prev.map(item => 
        item.id === itemId ? { 
          ...item, 
          status: 'COMPLETED', 
          progress: 100, 
          result: processed 
        } : item
      ));
    } catch (err: any) {
      console.error(err);
      setItems(prev => prev.map(item => 
        item.id === itemId ? { 
          ...item, 
          status: 'ERROR', 
          progress: 100, 
          errorMsg: err.message || '画布重光栅化或图片解码失效。' 
        } : item
      ));
    }
  };

  // Add multiple files into the batch process
  const addFilesToBatch = (files: File[]) => {
    const validFiles = files.filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) {
      setErrorMsg('选定文件非有效图片！请确保上传 JPEG, PNG, WEBP, BMP, GIF 或 HEIC。');
      setAppState('ERROR');
      return;
    }

    const newItems: BatchImageItem[] = validFiles.map((file, idx) => {
      const id = `${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`;
      return {
        id,
        file,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        status: 'PROCESSING',
        progress: 15,
      };
    });

    setItems(prev => {
      const combined = [...prev, ...newItems];
      return combined;
    });

    setAppState('COMPLETED'); // Navigate into workboard view
    
    // Auto focus the first newly processed image if none active
    setSelectedItemId(prev => prev ? prev : newItems[0].id);

    // Trigger parallel rendering for all newly fed files
    newItems.forEach(item => {
      processFileToItem(item.file, item.id, targetFormat, quality);
    });
  };

  // Recalculate singular target with customized values
  const handleRecalculateSingle = async (itemId: string, newFormat: 'image/webp' | 'image/jpeg', newQuality: number) => {
    const item = items.find(it => it.id === itemId);
    if (!item) return;

    setItems(prev => prev.map(it => 
      it.id === itemId ? { ...it, status: 'PROCESSING', progress: 15 } : it
    ));

    await processFileToItem(item.file, itemId, newFormat, newQuality);
  };

  // Batch trigger parameters upgrade across all loaded images
  const handleBatchReprocess = () => {
    if (items.length === 0) return;

    setItems(prev => prev.map(it => ({
      ...it,
      status: 'PROCESSING',
      progress: 15,
    })));

    items.forEach(item => {
      processFileToItem(item.file, item.id, targetFormat, quality);
    });
  };

  // Sequential simulated dual photographs developer DEMO injector
  const loadDemoImages = async () => {
    try {
      setAppState('PROCESSING');
      
      // Canvas 1: Sunset landscape
      const canvas1 = document.createElement('canvas');
      canvas1.width = 1200;
      canvas1.height = 800;
      const ctx1 = canvas1.getContext('2d');
      if (ctx1) {
        const grad = ctx1.createLinearGradient(0, 0, 0, 800);
        grad.addColorStop(0, '#f43f5e'); // rose 500
        grad.addColorStop(0.4, '#f59e0b'); // amber 500
        grad.addColorStop(1, '#1e1b4b'); // indigo 950
        ctx1.fillStyle = grad;
        ctx1.fillRect(0, 0, 1200, 800);
        
        ctx1.fillStyle = '#311042';
        ctx1.beginPath(); ctx1.moveTo(0, 800); ctx1.lineTo(300, 450); ctx1.lineTo(600, 800); ctx1.fill();
        ctx1.fillStyle = '#1c072b';
        ctx1.beginPath(); ctx1.moveTo(400, 800); ctx1.lineTo(800, 320); ctx1.lineTo(1200, 800); ctx1.fill();
        ctx1.fillStyle = '#ffffff';
        ctx1.beginPath(); ctx1.arc(850, 250, 80, 0, Math.PI * 2); ctx1.fill();
        ctx1.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx1.lineWidth = 1;
        ctx1.beginPath(); ctx1.moveTo(400, 0); ctx1.lineTo(400, 800); ctx1.moveTo(800, 0); ctx1.lineTo(800, 800); ctx1.stroke();
        ctx1.fillStyle = '#ffffff';
        ctx1.font = 'bold 36px sans-serif';
        ctx1.fillText('Purifier Camera Sunset (DEMO)', 80, 155);
        ctx1.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx1.font = '20px serif';
        ctx1.fillText('ISO 100  f/2.8  1/160s  24mm (GPS Tag Embedded)', 80, 195);
      }

      // Canvas 2: Celestial Emerald Forest scenery
      const canvas2 = document.createElement('canvas');
      canvas2.width = 1200;
      canvas2.height = 800;
      const ctx2 = canvas2.getContext('2d');
      if (ctx2) {
        const grad = ctx2.createLinearGradient(0, 0, 0, 800);
        grad.addColorStop(0, '#065f46'); // emerald 800
        grad.addColorStop(0.5, '#0d9488'); // teal 600
        grad.addColorStop(1, '#022c22'); // emerald 950
        ctx2.fillStyle = grad;
        ctx2.fillRect(0, 0, 1200, 800);
        
        ctx2.fillStyle = '#041f1a';
        ctx2.fillRect(150, 300, 40, 500);
        ctx2.fillRect(750, 250, 50, 550);
        
        ctx2.fillStyle = '#064e40';
        ctx2.beginPath(); ctx2.arc(170, 240, 120, 0, Math.PI * 2); ctx2.fill();
        ctx2.beginPath(); ctx2.arc(775, 180, 150, 0, Math.PI * 2); ctx2.fill();
        
        ctx2.fillStyle = 'rgba(253, 224, 71, 0.12)';
        ctx2.beginPath();
        ctx2.moveTo(0, 0); ctx2.lineTo(400, 800); ctx2.lineTo(600, 800); ctx2.lineTo(150, 0);
        ctx2.fill();
        
        ctx2.fillStyle = '#ffffff';
        ctx2.font = 'bold 36px sans-serif';
        ctx2.fillText('Celestial Emerald Forest (DEMO)', 80, 155);
        ctx2.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx2.font = '20px serif';
        ctx2.fillText('ISO 400  f/4.0  1/65s  50mm (Fuji Equipment Fingerprints)', 80, 195);
      }

      const getBlob = (canvas: HTMLCanvasElement): Promise<Blob> => {
        return new Promise(res => canvas.toBlob(b => res(b!), 'image/jpeg', 0.95));
      };

      const [blob1, blob2] = await Promise.all([getBlob(canvas1), getBlob(canvas2)]);

      const file1 = new File([blob1], 'sunset_over_mountains_demo.jpg', { type: 'image/jpeg' });
      const file2 = new File([blob2], 'mystic_forest_demo.jpg', { type: 'image/jpeg' });

      const newItems: BatchImageItem[] = [
        {
          id: 'demo-sunset',
          file: file1,
          fileName: file1.name,
          fileSize: file1.size,
          fileType: file1.type,
          status: 'PROCESSING',
          progress: 10,
        },
        {
          id: 'demo-forest',
          file: file2,
          fileName: file2.name,
          fileSize: file2.size,
          fileType: file2.type,
          status: 'PROCESSING',
          progress: 10,
        }
      ];

      setItems(newItems);
      setSelectedItemId('demo-sunset');
      setAppState('COMPLETED');

      // Async process individually with high mock EXIF structures injects
      const processDemo1 = async () => {
        const res = await processImage({ file: file1, format: targetFormat, quality: quality });
        res.originalMetadata = {
          all: [
            { key: 'GPS Latitude', value: '45.1097° N (极度敏感居住坐标)', category: 'GPS' },
            { key: 'GPS Longitude', value: '15.2004° E (极度敏感居住坐标)', category: 'GPS' },
            { key: 'GPS Altitude', value: '450.5m', category: 'GPS' },
            { key: 'Make', value: 'Sony', category: 'Camera' },
            { key: 'Model', value: 'ILCE-7RM4 (Alpha 7R IV)', category: 'Camera' },
            { key: 'Lens Model', value: 'FE 24-70mm F2.8 GM', category: 'Camera' },
            { key: 'F Number', value: 'f/2.8', category: 'Camera' },
            { key: 'Exposure Time', value: '1/160s', category: 'Camera' },
            { key: 'ISO Speed Ratings', value: '100', category: 'Camera' },
            { key: 'Date Time Original', value: '2026-06-08 17:35:12 (物理摄影时间，不可伪造)', category: 'Standard' },
            { key: 'Software', value: 'Adobe Photoshop LightRoom Classic 14.1 (Windows)', category: 'Standard' },
            { key: 'Artist', value: 'Photographer John Doe (署名信息)', category: 'Standard' },
          ],
          hasSensitive: true,
          gpsCount: 3,
          cameraCount: 6
        };
        setItems(prev => prev.map(it => it.id === 'demo-sunset' ? { ...it, status: 'COMPLETED', progress: 100, result: res } : it));
      };

      const processDemo2 = async () => {
        const res = await processImage({ file: file2, format: targetFormat, quality: quality });
        res.originalMetadata = {
          all: [
            { key: 'GPS Latitude', value: '35.6586° N (东京都港区芝公园 GPS 泄露)', category: 'GPS' },
            { key: 'GPS Longitude', value: '139.7454° E (东京都港区芝公园 GPS 泄露)', category: 'GPS' },
            { key: 'GPS Altitude', value: '18.2m', category: 'GPS' },
            { key: 'Make', value: 'FUJIFILM', category: 'Camera' },
            { key: 'Model', value: 'X-T4', category: 'Camera' },
            { key: 'Lens Model', value: 'XF35mmF1.4 R', category: 'Camera' },
            { key: 'F Number', value: 'f/4.0', category: 'Camera' },
            { key: 'Exposure Time', value: '1/60s', category: 'Camera' },
            { key: 'ISO Speed Ratings', value: '400', category: 'Camera' },
            { key: 'Date Time Original', value: '2026-05-12 11:24:08 (日期与地理时间指纹)', category: 'Standard' },
          ],
          hasSensitive: true,
          gpsCount: 3,
          cameraCount: 6
        };
        setItems(prev => prev.map(it => it.id === 'demo-forest' ? { ...it, status: 'COMPLETED', progress: 100, result: res } : it));
      };

      await Promise.all([processDemo1(), processDemo2()]);
    } catch (e) {
      console.error(e);
      setErrorMsg('生成示例图片失败，请手动上传本地图片进行测试');
      setAppState('ERROR');
    }
  };

  // Single download action trigger
  const downloadSingle = (res: ProcessedResult) => {
    const baseName = res.originalName.replace(/\.[^/.]+$/, "");
    const ext = res.processedType === 'image/webp' ? 'webp' : 'jpg';
    const downloadName = `${baseName}_purified.${ext}`;

    const link = document.createElement('a');
    link.href = res.processedDataUrl;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Safe multi-download queued sequence
  const downloadAll = () => {
    const completedItems = items.filter(it => it.status === 'COMPLETED' && it.result);
    if (completedItems.length === 0) return;

    completedItems.forEach((it, index) => {
      setTimeout(() => {
        downloadSingle(it.result!);
      }, index * 300); // Slight delay avoids browser security blocking multi-triggers
    });
  };

  // Delete item handler
  const deleteItem = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setItems(prev => {
      const remaining = prev.filter(it => it.id !== id);
      return remaining;
    });
  };

  // Clean application back to initial state
  const handleReset = () => {
    setItems([]);
    setSelectedItemId(null);
    setAppState('IDLE');
    setErrorMsg('');
  };

  const getQualityText = (q: number) => {
    if (q >= 0.95) {
      return { text: '极致画质 (完美保留)', desc: '完美级保存每一个物理像素，为需要超清画面的专业照片设计。' };
    } else if (q >= 0.85) {
      return { text: '推荐平衡 (无感压缩)', desc: '在保持肉眼完全无法察觉差异的前提下，精简大量垃圾体积与数据。' };
    } else {
      return { text: '高压缩率 (极小体积)', desc: '深度轻量化处理，图像边缘可能存在细微羽化，适合轻量级快速分享。' };
    }
  };

  const selectedPresetText = getQualityText(quality);

  // Active focused item pointers
  const selectedItem = items.find(it => it.id === selectedItemId);

  // Stats summaries
  const processedCount = items.filter(it => it.status === 'COMPLETED').length;
  const inProgressCount = items.filter(it => it.status === 'PROCESSING').length;
  const errorCount = items.filter(it => it.status === 'ERROR').length;
  
  const totalOriginalSize = items.reduce((sum, it) => sum + it.fileSize, 0);
  const totalProcessedSize = items.reduce((sum, it) => sum + (it.result?.processedSize || 0), 0);
  const totalSavings = totalOriginalSize - totalProcessedSize;
  const totalSavingsPercent = totalOriginalSize > 0 ? Math.max(0, Math.round((totalSavings / totalOriginalSize) * 100)) : 0;

  return (
    <div className="min-h-screen flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto" id="app-root-container">
      {/* Navigation Header */}
      <nav className="h-16 px-6 sm:px-8 border border-zinc-200 flex items-center justify-between bg-white rounded-3xl shadow-sm mb-8 animate-fade-in" id="app-header">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <div className="w-3.5 h-3.5 border-2 border-white rounded-sm"></div>
          </div>
          <span className="font-bold text-base tracking-tight text-zinc-900 font-sans">OptiPress Purifier</span>
        </div>
        <div className="flex items-center space-x-2 bg-zinc-50 py-1 px-3 border border-zinc-200 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
            Safe Local Canvas Sandbox
          </span>
        </div>
      </nav>

      {/* Main Title Descs */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900">
          批量图片格式转换与安全脱敏
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 mt-2 max-w-3xl leading-relaxed">
          基于浏览器本地 HTML5 Canvas 高精度光栅重建技术，提供 <strong>100% 隐私级别脱敏转换</strong>。全新支持<strong>多图批量上传净化</strong>，在极速转换为高还原度 WEBP/JPEG 的同时，彻底清空一切被隐藏的 GPS 位置、相机配置及软件编辑历史。
        </p>
      </div>

      <main className="flex-1" id="app-main-content">
        <AnimatePresence mode="wait">
          
          {/* STATE 1: IDLE / Drag upload first */}
          {appState === 'IDLE' && (
            <motion.div
              key="idle-state"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Settings Selection Area before uploading */}
              <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xs font-bold text-zinc-400 bg-zinc-50 border border-zinc-200 py-1 px-2.5 rounded-md inline-block max-w-max uppercase tracking-wider mb-4 font-mono">
                    Output Image Format / 目标格式
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setTargetFormat('image/webp')}
                      className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                        targetFormat === 'image/webp'
                          ? 'bg-black border-black text-white ring-2 ring-black/10'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100/50'
                      }`}
                    >
                      <div className="font-bold text-sm">WEBP</div>
                      <div className="text-[10px] mt-1 opacity-80">现代高效，无感压缩支持</div>
                    </button>
                    <button
                      onClick={() => setTargetFormat('image/jpeg')}
                      className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                        targetFormat === 'image/jpeg'
                          ? 'bg-black border-black text-white ring-2 ring-black/10'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100/50'
                      }`}
                    >
                      <div className="font-bold text-sm">JPEG</div>
                      <div className="text-[10px] mt-1 opacity-80">传统兼容，高适配分享规格</div>
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-zinc-400 bg-zinc-50 border border-zinc-200 py-1 px-2.5 rounded-md inline-block max-w-max uppercase tracking-wider mb-4 font-mono">
                    Quality Preset Detail / 压缩细节 ({Math.round(quality * 100)}%)
                  </h3>
                  <div className="space-y-4">
                    <input
                      type="range"
                      min="0.5"
                      max="1"
                      step="0.01"
                      value={quality}
                      onChange={(e) => setQuality(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200">
                      <div className="text-xs font-bold text-zinc-800">{selectedPresetText.text}</div>
                      <p className="text-[10px] text-zinc-500 mt-1">{selectedPresetText.desc}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={triggerUpload}
                className={`relative flex flex-col items-center justify-center py-16 px-6 border-2 border-dashed rounded-3xl cursor-pointer transition-all duration-300 ${
                  isDragOver 
                    ? 'border-zinc-500 bg-zinc-50 scale-[1.005]' 
                    : 'border-zinc-300 bg-white hover:border-zinc-400 hover:bg-zinc-50/50'
                }`}
                id="image-dropzone-mask"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                  multiple
                />
                
                <div className="w-16 h-16 bg-zinc-50 border border-zinc-200 rounded-full flex items-center justify-center mb-5 shadow-sm relative">
                  <Upload className="w-7 h-7 text-zinc-500 animate-bounce-slow" />
                </div>

                <div className="text-center space-y-2">
                  <h3 className="text-lg font-bold text-zinc-800">
                    拖拽一张或多张图片至此，或 <span className="text-zinc-900 underline font-extrabold">点击手动选择</span>
                  </h3>
                  <p className="text-xs text-zinc-500 max-w-md mx-auto">
                    支持多张 JPEG、PNG、WEBP、HEIC、BMP 等秒级批量本地净化及渲染，信息永不出站
                  </p>
                </div>

                <div className="mt-8 pt-6 border-t border-zinc-200 w-full max-w-lg grid grid-cols-2 gap-4 text-center">
                  <div className="text-xs text-zinc-500">
                    🔒 <strong className="text-zinc-800">100% 物理层去耦：</strong>
                    GPS地理、快门、编辑指纹连结彻底消除
                  </div>
                  <div className="text-xs text-zinc-500">
                    ⚡ <strong className="text-zinc-800">高质轻量：</strong>
                    视觉无损算法，批量多任务独立流输出
                  </div>
                </div>
              </div>

              {/* One Click Sample Demo trigger */}
              <div className="text-center bg-white py-4 px-6 rounded-2xl border border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                <span className="text-xs text-zinc-500 flex items-center space-x-2">
                  <Info className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span>身边没有带 GPS 定位或复杂相机参数底片？点此一键注入带有深度隐私的演示图片组：</span>
                </span>
                <button
                  onClick={loadDemoImages}
                  className="flex items-center space-x-1.5 text-xs px-4 py-2 bg-zinc-900 hover:bg-black text-white font-bold rounded-xl transition cursor-pointer shadow-xs whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5 text-zinc-350" />
                  <span>导入批量双图示例体验</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* STATE 2: GLOBAL FULL-SCREEN SPINNER FOR EMBEDDED GENERATORS */}
          {appState === 'PROCESSING' && items.length === 0 && (
            <motion.div
              key="loading-state"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="py-20 flex flex-col items-center justify-center space-y-6 bg-white border border-zinc-200 rounded-3xl"
            >
              <div className="relative flex items-center justify-center">
                <div className="w-16 h-16 rounded-full border-4 border-zinc-100 border-t-black animate-spin" />
                <div className="absolute font-mono text-[11px] text-zinc-800 font-bold">10%</div>
              </div>
              <div className="text-center space-y-1.5">
                <h3 className="text-base font-bold text-zinc-800 flex items-center justify-center space-x-2">
                  <RefreshCw className="w-4 h-4 text-zinc-800 animate-spin" />
                  <span>正在离线光栅重构图像组...</span>
                </h3>
                <p className="text-xs text-zinc-400 max-w-sm">
                  绘制原色属性，脱离原始 EXIF 树链与镜头地理参数信息
                </p>
              </div>
            </motion.div>
          )}

          {/* STATE 3: GLOBAL ERROR CALLOUT STATE */}
          {appState === 'ERROR' && (
            <motion.div
              key="error-state"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-red-200 bg-red-55/10 rounded-3xl p-8 py-10 text-center space-y-5"
            >
              <div className="inline-flex p-3 bg-red-100 text-red-600 rounded-full">
                <ShieldAlert className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-zinc-800">上传处理失败</h3>
                <p className="text-xs text-red-700 max-w-md mx-auto">
                  {errorMsg || '加载解析或转换阶段触发内部阻碍，请重置后重试。'}
                </p>
              </div>
              <div>
                <button
                  onClick={handleReset}
                  className="px-5 py-2.5 bg-black hover:bg-zinc-900 text-white rounded-xl text-sm transition font-semibold cursor-pointer shadow-sm"
                >
                  返回主页重试
                </button>
              </div>
            </motion.div>
          )}

          {/* STATE 4: MULTI-IMAGE BATCH DASHBOARD WORKSPACE */}
          {appState === 'COMPLETED' && items.length > 0 && (
            <motion.div
              key="completed-dashboard-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              
              {/* BATCH GENERAL HEADER SUMMARY CARD */}
              <div className="bg-white border border-zinc-200 rounded-3xl p-5 md:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span className="text-sm font-bold text-zinc-900">批量任务清单</span>
                    <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full font-bold font-mono">
                      {processedCount}/{items.length} 已完成
                    </span>
                    {inProgressCount > 0 && (
                      <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center space-x-1.5 font-mono">
                        <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                        <span>{inProgressCount} 处理中</span>
                      </span>
                    )}
                    {errorCount > 0 && (
                      <span className="text-xs bg-rose-50 text-rose-600 border border-rose-200 px-2.5 py-0.5 rounded-full font-mono">
                        {errorCount} 过失错误
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500">
                    累计原体积: <span className="font-mono text-zinc-700 font-semibold">{formatBytes(totalOriginalSize)}</span> · 净化后合并体积: <span className="font-mono text-zinc-900 font-bold">{formatBytes(totalProcessedSize)}</span> · 已削减空间: <strong className="text-emerald-600 font-mono">-{totalSavingsPercent}% ({formatBytes(totalSavings)})</strong>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 md:flex-none flex items-center justify-center space-x-1.5 text-xs px-4 py-2.5 border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 font-medium rounded-xl transition cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>添加更多</span>
                  </button>

                  <button
                    onClick={downloadAll}
                    disabled={processedCount === 0}
                    className={`flex-1 md:flex-none flex items-center justify-center space-x-1.5 text-xs px-4 py-2.5 font-semibold rounded-xl transition shadow-sm whitespace-nowrap cursor-pointer ${
                      processedCount > 0 
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                        : 'bg-zinc-100 text-zinc-400 cursor-not-allowed border border-zinc-200'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>打包下载全部 ({processedCount})</span>
                  </button>

                  <button
                    onClick={handleReset}
                    className="flex-1 md:flex-none flex items-center justify-center space-x-1.5 text-xs px-4 py-2.5 border border-red-200 bg-red-50/20 text-red-650 hover:bg-red-50 hover:text-red-700 font-medium rounded-xl transition cursor-pointer shadow-xs"
                    title="清空整个列表并返回"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>清空重置</span>
                  </button>
                </div>
              </div>

              {/* BATCH DUAL-COLUMN WORKSPACE GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                
                {/* COLUMN A: PHOTOS MINI LIST SIDECAR (col-span-4) */}
                <div className="lg:col-span-4 flex flex-col space-y-4" id="batch-sidebar-list">
                  <div className="bg-white border border-zinc-200 rounded-3xl p-4 flex-1 flex flex-col shadow-sm max-h-[700px] lg:max-h-[850px] overflow-hidden">
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-3">
                      <span className="text-xs font-bold text-zinc-400 tracking-wider font-mono">
                        IMAGE BATCH / 图片队列 ({items.length})
                      </span>
                    </div>

                    {/* Scrollable list items container */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                      {items.map((item) => {
                        const isSelected = item.id === selectedItemId;
                        return (
                          <div
                            key={item.id}
                            onClick={() => setSelectedItemId(item.id)}
                            className={`group relative p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-zinc-950 border-zinc-950 text-white shadow-md'
                                : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100/60 hover:border-zinc-300'
                            }`}
                          >
                            {/* Left part: Thumbnail + Text info */}
                            <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                              {/* Small Thumbnail Preview */}
                              <div className="w-10 h-10 rounded-lg bg-zinc-200/50 border border-zinc-200/20 overflow-hidden flex items-center justify-center shrink-0">
                                {item.status === 'COMPLETED' && item.result ? (
                                  <img 
                                    src={item.result.processedDataUrl} 
                                    alt="thumbnail" 
                                    className="w-full h-full object-cover" 
                                  />
                                ) : (
                                  <ImageIcon className={`w-4 h-4 ${isSelected ? 'text-zinc-400' : 'text-zinc-500'}`} />
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <h4 className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-zinc-800'}`}>
                                  {item.fileName}
                                </h4>
                                <div className="flex items-center space-x-1.5 mt-0.5 text-[10px] opacity-80">
                                  <span>{formatBytes(item.fileSize)}</span>
                                  {item.status === 'COMPLETED' && item.result && (
                                    <>
                                      <span>➜</span>
                                      {item.result.compressionSkipped ? (
                                        <span className="font-mono text-amber-700 font-semibold bg-amber-50 px-1 py-0.5 rounded text-[9px] border border-amber-200">
                                          未压缩
                                        </span>
                                      ) : (
                                        <span className="font-mono text-emerald-500 font-semibold">
                                          -{item.result.savingsPercent}%
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right part: Icons, Loader progress & Delete buttons */}
                            <div className="flex items-center space-x-1 shrink-0">
                              {item.status === 'PROCESSING' && (
                                <div className="relative w-5 h-5 flex items-center justify-center">
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-zinc-500" />
                                </div>
                              )}
                              {item.status === 'ERROR' && (
                                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                              )}
                              {item.status === 'COMPLETED' && (
                                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                              )}

                              {/* Individual Delete cross */}
                              <button
                                onClick={(e) => deleteItem(item.id, e)}
                                className={`p-1 rounded-md transition ${
                                  isSelected 
                                    ? 'text-zinc-500 hover:text-white hover:bg-zinc-900/50' 
                                    : 'text-zinc-400 hover:text-red-500 hover:bg-zinc-100'
                                }`}
                                title="从队列移除"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Quick dragzone anchor bottom of side list */}
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-3 overflow-hidden border-2 border-dashed border-zinc-200 hover:border-zinc-400 bg-zinc-50 rounded-2xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-1"
                    >
                      <Plus className="w-4 h-4 text-zinc-400" />
                      <span className="text-[10px] font-bold text-zinc-500">点此添加更多图片文件</span>
                    </div>

                  </div>
                </div>

                {/* COLUMN B: FOCUS WORKBENCH FOR SELECTED (col-span-8) */}
                <div className="lg:col-span-8 flex flex-col space-y-6" id="workbench-arena">
                  
                  {selectedItem ? (
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={selectedItem.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-6"
                      >
                        
                        {/* Selected Title line & direct download */}
                        <div className="bg-white border border-zinc-200 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest block">
                              Now Inspecting / 正在浏览
                            </span>
                            <h3 className="text-sm sm:text-base font-bold text-zinc-800 truncate mt-0.5">
                              {selectedItem.fileName}
                            </h3>
                            {selectedItem.status === 'COMPLETED' && selectedItem.result && (
                              <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">
                                属性比例: {selectedItem.result.originalWidth} x {selectedItem.result.originalHeight} px · 原格式: {selectedItem.fileType.split('/')[1]?.toUpperCase() || 'Unknown'}
                              </p>
                            )}
                          </div>

                          {selectedItem.status === 'COMPLETED' && selectedItem.result && (
                            <button
                              onClick={() => downloadSingle(selectedItem.result!)}
                              className="flex items-center justify-center space-x-1.5 text-xs px-4 py-2 bg-black hover:bg-zinc-900 text-white font-semibold rounded-xl shadow-xs transition cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>下载清洗后图片</span>
                            </button>
                          )}
                        </div>

                        {/* WORKBENCH PROCESSING WORKER */}
                        {selectedItem.status === 'PROCESSING' && (
                          <div className="bg-white border border-zinc-200 rounded-3xl p-16 flex flex-col items-center justify-center space-y-4">
                            <div className="relative flex items-center justify-center">
                              <div className="w-12 h-12 rounded-full border-3 border-zinc-100 border-t-zinc-900 animate-spin" />
                              <div className="absolute font-mono text-[10px] text-zinc-800 font-bold">{selectedItem.progress}%</div>
                            </div>
                            <div className="text-center">
                              <h4 className="text-xs font-bold text-zinc-700">正在生成此图片的安全沙盒备份...</h4>
                              <p className="text-[10px] text-zinc-400 mt-1">重建 RGBA 通道以排除任何深层物理记录...</p>
                            </div>
                          </div>
                        )}

                        {/* WORKBENCH FAILED RUNS */}
                        {selectedItem.status === 'ERROR' && (
                          <div className="bg-red-50/50 border border-red-200 rounded-3xl p-12 text-center space-y-4">
                            <div className="inline-flex p-2.5 bg-red-100 text-red-650 rounded-full">
                              <ShieldAlert className="w-8 h-8" />
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-sm font-bold text-zinc-800">该图处理失败</h4>
                              <p className="text-xs text-red-700 max-w-sm mx-auto leading-relaxed">
                                {selectedItem.errorMsg || '加载此图片或在 HTML5 Canvas 烘焙色彩像素流期间遇到异常解码瓶颈。'}
                              </p>
                            </div>
                            <button
                              onClick={() => handleRecalculateSingle(selectedItem.id, targetFormat, quality)}
                              className="px-4 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-semibold hover:border-zinc-300 transition cursor-pointer text-zinc-700"
                            >
                              重新尝试净化
                            </button>
                          </div>
                        )}

                        {/* WORKBENCH COMPLETED GRAPHICS REPORT */}
                        {selectedItem.status === 'COMPLETED' && selectedItem.result && (
                          <>
                            {/* SINGLE IMAGE MULTIPLE BENTO METRIC CARDS */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="metric-bento-grid-workbench">
                              {/* Storage spec */}
                              <div className="bg-white border border-zinc-200 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
                                <div className="text-zinc-400 text-[9px] font-bold uppercase tracking-wider block">脱敏压缩对比</div>
                                <div className="mt-2 flex flex-col">
                                  <span className="text-zinc-400 text-[10px] line-through font-mono">{formatBytes(selectedItem.fileSize)}</span>
                                  <span className="text-zinc-800 font-bold text-base font-mono">➜ {formatBytes(selectedItem.result.processedSize)}</span>
                                </div>
                                <div className={`mt-2 inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded border self-start font-mono ${
                                  selectedItem.result.compressionSkipped 
                                    ? 'text-amber-700 bg-amber-50 border-amber-200'
                                    : 'text-emerald-600 bg-emerald-50 border-emerald-150'
                                }`}>
                                  <span>{selectedItem.result.compressionSkipped ? '未压缩 (原图更少冗余)' : `削减: ${selectedItem.result.savingsPercent}%`}</span>
                                </div>
                              </div>

                              {/* Target Format info */}
                              <div className="bg-white border border-zinc-200 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
                                <div className="text-zinc-400 text-[9px] font-bold uppercase tracking-wider block">新格式规格</div>
                                <div className="mt-2 block">
                                  <span className="px-1.5 py-0.5 bg-black text-white text-[10px] font-mono font-bold rounded">
                                    {selectedItem.result.processedType.replace('image/', '').toUpperCase()}
                                  </span>
                                  <span className="text-zinc-700 font-semibold text-xs ml-1 font-mono">
                                    (Q={Math.round(selectedItem.result.quality * 100)}%)
                                  </span>
                                </div>
                                <span className="text-[9px] text-zinc-400 mt-2 block">画布脱耦色彩写入</span>
                              </div>

                              {/* Visual difference (PSNR db index) */}
                              <div className="bg-white border border-zinc-200 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
                                <div className="text-zinc-400 text-[9px] font-bold uppercase tracking-wider block">视觉还原度 PSNR</div>
                                <div className="mt-2 text-base font-black font-mono text-emerald-600">
                                  {selectedItem.result.psnr} dB
                                </div>
                                <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-150 px-1.5 py-0.5 rounded self-start mt-2 block">
                                  {selectedItem.result.psnr > 38 ? '完美视觉无损' : '高保真度还原'}
                                </span>
                              </div>

                              {/* Time Spent */}
                              <div className="bg-white border border-zinc-200 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
                                <div className="text-zinc-400 text-[9px] font-bold uppercase tracking-wider block">重构清洗耗时</div>
                                <div className="mt-2 text-base font-bold font-mono text-zinc-800 flex items-center space-x-1">
                                  <Clock className="w-3.5 h-3.5 text-zinc-400 animate-pulse" />
                                  <span>{selectedItem.result.processingTimeMs} ms</span>
                                </div>
                                <span className="text-[9px] text-zinc-400 mt-2 block">V8 沙盒本地重光栅</span>
                              </div>
                            </div>

                            {/* WORKWORKSPACE COMPRESSION RE-SETTING FORM PANEL (REAL-TIME ADAPTIVE FOR FOCUS) */}
                            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs">
                              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div className="space-y-1">
                                  <h4 className="text-xs font-bold text-zinc-800 flex items-center space-x-1.5">
                                    <span>⚙️ 独立调参或批量更新</span>
                                  </h4>
                                  <p className="text-[10px] text-zinc-400">
                                    下方滑块调节将<strong>实时更新当前查看图片</strong>。如果满意该画质，也支持一键应用配置到队列。
                                  </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                                  {/* Format drop */}
                                  <div className="flex items-center space-x-1.5 bg-zinc-50 px-2.5 py-1.5 border border-zinc-200 rounded-xl">
                                    <span className="text-[10px] text-zinc-400 font-bold uppercase font-mono">格式:</span>
                                    <select
                                      value={targetFormat}
                                      onChange={(e) => {
                                        const nextFormat = e.target.value as 'image/webp' | 'image/jpeg';
                                        setTargetFormat(nextFormat);
                                        handleRecalculateSingle(selectedItem.id, nextFormat, quality);
                                      }}
                                      className="bg-transparent text-xs font-bold text-zinc-850 focus:outline-none cursor-pointer"
                                    >
                                      <option value="image/webp">WEBP</option>
                                      <option value="image/jpeg">JPEG</option>
                                    </select>
                                  </div>

                                  {/* Compression level presets buttons */}
                                  <div className="flex items-center space-x-1 bg-zinc-100 p-1 rounded-xl">
                                    {[0.75, 0.88, 0.95].map((preset) => (
                                      <button
                                        key={preset}
                                        onClick={() => {
                                          setQuality(preset);
                                          handleRecalculateSingle(selectedItem.id, targetFormat, preset);
                                        }}
                                        className={`text-[10px] px-3 py-1.5 rounded-lg font-bold transition-all ${
                                          quality === preset 
                                            ? 'bg-black text-white' 
                                            : 'text-zinc-650 hover:text-zinc-950'
                                        }`}
                                      >
                                        {preset === 0.75 ? '高压缩' : preset === 0.88 ? '推荐平衡' : '极致'}
                                      </button>
                                    ))}
                                  </div>

                                  {/* Apply globally to batch button */}
                                  <button
                                    onClick={handleBatchReprocess}
                                    className="px-3 py-2 bg-zinc-950 hover:bg-black text-white rounded-xl text-[10px] font-bold transition-all shadow-xs flex items-center space-x-1 cursor-pointer"
                                    title="将当前选择的参数与格式覆盖应用到整个列表里，并全部后台重画"
                                  >
                                    <Sparkles className="w-3 h-3" />
                                    <span>⚡ 批量更新到所有图片</span>
                                  </button>
                                </div>
                              </div>

                              {/* Preset slider inside detailed item */}
                              <div className="mt-4 pt-4 border-t border-zinc-100 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                                <div className="md:col-span-4 text-[10px] font-bold text-zinc-400 font-mono tracking-wider">
                                  微调当前质量/细节阻尼度: ({Math.round(quality * 100)}%)
                                </div>
                                <div className="md:col-span-8 flex items-center space-x-4">
                                  <input
                                    type="range"
                                    min="0.50"
                                    max="1.00"
                                    step="0.01"
                                    value={quality}
                                    onChange={(e) => {
                                      const nextQuality = parseFloat(e.target.value);
                                      setQuality(nextQuality);
                                    }}
                                    onMouseUp={(e) => {
                                      const val = parseFloat(e.currentTarget.value);
                                      handleRecalculateSingle(selectedItem.id, targetFormat, val);
                                    }}
                                    onTouchEnd={(e) => {
                                      const val = parseFloat(e.currentTarget.value);
                                      handleRecalculateSingle(selectedItem.id, targetFormat, val);
                                    }}
                                    onKeyUp={(e) => {
                                      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) {
                                        const val = parseFloat(e.currentTarget.value);
                                        handleRecalculateSingle(selectedItem.id, targetFormat, val);
                                      }
                                    }}
                                    className="flex-1 h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
                                  />
                                  <span className="text-[10px] font-bold text-zinc-700 bg-zinc-100 px-2 py-1 rounded font-mono shrink-0">
                                    {selectedPresetText.text.split(' ')[0]}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* DYNAMIC IMAGE SLIDER COMPARISONS WITH DIFFERENCE HIGHLIGHTING */}
                            <div className="space-y-2">
                              <ImageSlider
                                originalSrc={selectedItem.result.originalDataUrl}
                                processedSrc={selectedItem.result.processedDataUrl}
                                originalLabel={`原图 (${formatBytes(selectedItem.fileSize)})`}
                                processedLabel={selectedItem.result.compressionSkipped ? "脱敏新图 (未额外压缩)" : `清洗过的新图 (${formatBytes(selectedItem.result.processedSize)})`}
                              />
                            </div>

                            {/* EXIF METADATA DETECTOR SHEETS */}
                            <div className="space-y-2">
                              <MetadataViewer
                                originalTags={selectedItem.result.originalMetadata.all}
                                hasSensitive={selectedItem.result.originalMetadata.hasSensitive}
                                gpsCount={selectedItem.result.originalMetadata.gpsCount}
                                cameraCount={selectedItem.result.originalMetadata.cameraCount}
                              />
                            </div>

                          </>
                        )}

                        {/* DESENSITIZING PIXEL SANDBOX MECHANISM INFO */}
                        <div className="p-5 bg-white rounded-2xl border border-zinc-200 flex items-start space-x-3.5 shadow-xs">
                          <Info className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
                          <div className="space-y-1.5 text-[11px] leading-relaxed text-zinc-500">
                            <p className="font-bold text-zinc-800 flex items-center space-x-1.5">
                              <span>🛠️ 为什么本系统的「完全底层色彩光栅重建」比单纯“擦除信息”高几十倍安全度？</span>
                            </p>
                            <p>
                              大多数简单的脱敏网站、手机软件只是在图片二进制数据尾部（EXIF Data Block）修改标记让读取软件不再显示。但这存在残留空隙。本净化系统通过建立完全隔绝无交互的 <strong>Canvas 像素离线沙箱</strong>。我们将您选择的图片解析为纯净、无任何属性连结的 R, G, B, A 四通道高精度原始色彩矩阵。通过完全摈弃任何原本文件描述、ICC配置，重新在新画布中绘制一幅 100% 结构纯真的新图像。
                            </p>
                          </div>
                        </div>

                      </motion.div>
                    </AnimatePresence>
                  ) : (
                    <div className="bg-white border border-zinc-200 rounded-3xl p-20 text-center text-zinc-400 font-mono text-xs flex flex-col items-center justify-center space-y-4 shadow-xs">
                      <Files className="w-10 h-10 text-zinc-300 animate-pulse" />
                      <span>请在左侧列表中点击选择要查验的图片</span>
                    </div>
                  )}

                </div>

              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Shared standard styled footer */}
      <footer className="mt-16 pt-6 border-t border-zinc-200 text-center text-zinc-400 text-[11px]" id="app-footer">
        <p className="font-mono">
          © 2026 图片脱敏与无感格式压缩服务 · 本地自闭环运行 (Client-Side Safe Sandbox) · 拒绝任何外部网络窃密
        </p>
        <p className="mt-1.5 flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-3 font-mono text-zinc-400">
          <span>Engine Online</span>
          <span className="hidden sm:inline">·</span>
          <span>HTML5 Canvas Resample Matrix v2.4.0</span>
          <span className="hidden sm:inline">·</span>
          <span>SECURE END-TO-END</span>
        </p>
      </footer>
    </div>
  );
}
