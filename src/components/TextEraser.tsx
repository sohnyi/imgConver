import React, { useRef, useState, useEffect } from 'react';
import { Sparkles, RotateCcw, Check, Trash2, Undo, Info, AlertCircle } from 'lucide-react';
import { inpaintImage } from '../utils/textEraser';

interface TextEraserProps {
  imageSrc: string; // The active processed/original image dataUrl
  imageWidth: number;
  imageHeight: number;
  onSave: (editedDataUrl: string) => void;
}

export default function TextEraser({
  imageSrc,
  imageWidth,
  imageHeight,
  onSave,
}: TextEraserProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [brushSize, setBrushSize] = useState<number>(24);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [hasDrawn, setHasDrawn] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Load the image onto the visible canvas, and initialize the mask canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Set canvas coordinate dimensions to real physical pixels
      canvas.width = imageWidth;
      canvas.height = imageHeight;
      ctx.drawImage(img, 0, 0);

      // Initialize mask canvas to identical size
      const maskCanvas = maskCanvasRef.current;
      if (maskCanvas) {
        maskCanvas.width = imageWidth;
        maskCanvas.height = imageHeight;
        const maskCtx = maskCanvas.getContext('2d');
        if (maskCtx) {
          maskCtx.fillStyle = 'rgba(0,0,0,0)';
          maskCtx.fillRect(0, 0, imageWidth, imageHeight);
        }
      }
      setHasDrawn(false);
      setSaveSuccess(false);
    };
    img.src = imageSrc;
  }, [imageSrc, imageWidth, imageHeight]);

  // Map client/pointer coordinates to actual physical canvas coordinates
  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    const coords = getCoordinates(e);
    if (!coords) return;

    setIsDrawing(true);
    setSaveSuccess(false);

    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !maskCanvas) return;

    const ctx = canvas.getContext('2d');
    const maskCtx = maskCanvas.getContext('2d');
    if (!ctx || !maskCtx) return;

    // Set brush characteristics for the visible canvas and mask canvas
    [ctx, maskCtx].forEach((c) => {
      c.beginPath();
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.lineWidth = brushSize;
    });

    // We draw amber highlight on the main canvas, and solid red on mask canvas
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)'; // Amber 500 translucent highlighter
    maskCtx.strokeStyle = 'rgba(255, 0, 0, 1.0)'; // Solid red for binary indexing

    ctx.moveTo(coords.x, coords.y);
    maskCtx.moveTo(coords.x, coords.y);

    ctx.lineTo(coords.x, coords.y);
    maskCtx.lineTo(coords.x, coords.y);

    ctx.stroke();
    maskCtx.stroke();

    setHasDrawn(true);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    e.preventDefault();

    const coords = getCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !maskCanvas) return;

    const ctx = canvas.getContext('2d');
    const maskCtx = maskCanvas.getContext('2d');
    if (!ctx || !maskCtx) return;

    ctx.lineTo(coords.x, coords.y);
    maskCtx.lineTo(coords.x, coords.y);

    ctx.stroke();
    maskCtx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // Run our high-quality Laplace inpainting algorithm instantly
  const handleEraseText = () => {
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !maskCanvas || !hasDrawn) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsProcessing(true);

    // Let microtask run so the browser has time to render loader
    setTimeout(() => {
      try {
        inpaintImage(ctx, maskCanvas, imageWidth, imageHeight);
        
        // Clear mask canvas to prevent double application
        const maskCtx = maskCanvas.getContext('2d');
        if (maskCtx) {
          maskCtx.clearRect(0, 0, imageWidth, imageHeight);
        }
        setHasDrawn(false);
      } catch (err) {
        console.error('Inpainting failed', err);
      } finally {
        setIsProcessing(false);
      }
    }, 50);
  };

  // Reset the editing canvas to original state
  const handleReset = () => {
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !maskCanvas) return;

    const ctx = canvas.getContext('2d');
    const maskCtx = maskCanvas.getContext('2d');
    if (!ctx || !maskCtx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      maskCtx.clearRect(0, 0, imageWidth, imageHeight);
      setHasDrawn(false);
      setSaveSuccess(false);
    };
    img.src = imageSrc;
  };

  // Output edited image to parent callback
  const handleSaveAndApply = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Supported target format in dataUrl splitting
    const editedUrl = canvas.toDataURL('image/jpeg', 0.95);
    onSave(editedUrl);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-4 md:p-5 flex flex-col space-y-4 shadow-2xs" id="text-eraser-root-sandbox">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center justify-center p-1 bg-amber-100 rounded text-amber-600">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
            <h4 className="text-xs font-bold text-zinc-800 tracking-tight uppercase">
              智能文字消除笔 (可选功能)
            </h4>
          </div>
          <p className="text-zinc-500 text-[11px] leading-relaxed mt-1">
            在下方图片上直接涂抹您想去除的敏感字样、手机尾号、水印细节或车牌信息，涂完后点击 “执行擦除”。
          </p>
        </div>

        {/* CONTROLS BAR */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleReset}
            disabled={isProcessing}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-lg text-zinc-600 text-xs font-medium transition cursor-pointer disabled:opacity-50"
            title="清空当前涂抹 trace 并重置"
          >
            <RotateCcw className="w-3 h-3" />
            <span>重置</span>
          </button>

          <button
            onClick={handleEraseText}
            disabled={!hasDrawn || isProcessing}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:bg-zinc-200 disabled:text-zinc-400 border border-amber-600/10 rounded-lg text-white text-xs font-bold tracking-wide transition cursor-pointer shadow-xs disabled:shadow-none"
          >
            <span>{isProcessing ? '正在智能消除...' : '执行擦除'}</span>
          </button>

          <button
            onClick={handleSaveAndApply}
            disabled={isProcessing}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-950 text-white rounded-lg text-xs font-bold tracking-wide transition cursor-pointer shadow-xs"
          >
            {saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">已保存修改</span>
              </>
            ) : (
              <span>应用并保存结果</span>
            )}
          </button>
        </div>
      </div>

      {/* BRUSH SIZE CONTROLLERS WITH LIVE PREVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-white border border-zinc-150 rounded-xl p-3 shrink-0">
        <div className="md:col-span-4 text-[11px] font-bold text-zinc-500 flex items-center space-x-1.5">
          <span>画笔直径大小:</span>
          <span className="font-mono bg-zinc-100 text-zinc-700 px-1.5 py-0.5 rounded text-[10px]">
            {brushSize} px
          </span>
        </div>
        <div className="md:col-span-5 flex items-center space-x-3">
          <input
            type="range"
            min="6"
            max="80"
            step="1"
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
            className="flex-1 h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>
        <div className="md:col-span-3 flex items-center justify-end space-x-2 shrink-0">
          <div className="text-[10px] text-zinc-400">画笔粗细预览:</div>
          <div 
            className="bg-amber-500/50 border border-amber-500 rounded-full shrink-0"
            style={{ 
              width: `${Math.min(brushSize, 40)}px`, 
              height: `${Math.min(brushSize, 40)}px` 
            }}
          />
        </div>
      </div>

      {/* INTERACTIVE DRAWING WORKSPACE */}
      <div className="relative border-2 border-dashed border-zinc-200 bg-zinc-100 rounded-2xl overflow-hidden flex items-center justify-center max-h-[500px] group">
        <div className="relative w-full max-h-[500px] flex items-center justify-center py-4">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="max-h-[460px] max-w-full object-contain cursor-crosshair select-none touch-none bg-white rounded-lg shadow-sm border border-zinc-300/60"
          />
          {/* Invisible mask layer on top */}
          <canvas
            ref={maskCanvasRef}
            className="hidden"
          />
        </div>

        {/* Floating guidance hint on empty overlay */}
        {!hasDrawn && (
          <div className="absolute top-3 left-3 bg-zinc-900/80 backdrop-blur-xs text-white text-[10px] font-medium px-2 py-1 rounded-md border border-white/10 flex items-center space-x-1 pointer-events-none transition opacity-70 group-hover:opacity-100">
            <Info className="w-3 h-3 text-amber-400" />
            <span>按住鼠标并拖拽涂抹需要抹除的文字区域</span>
          </div>
        )}

        {isProcessing && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex flex-col items-center justify-center space-y-2 pointer-events-none">
            <div className="w-7 h-7 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-zinc-700 text-xs font-bold tracking-widest animate-pulse">
              脱敏引擎正在智能重构局部像素...
            </span>
          </div>
        )}
      </div>

      <div className="flex items-start space-x-2 text-[10px] text-zinc-400 leading-relaxed">
        <AlertCircle className="w-3.5 h-3.5 text-zinc-300 shrink-0 mt-0.5" />
        <span>
          原理：我们使用的是完全运行在本地的<b>拉普拉斯偏微分图像扩散修补算法 (Laplace Diffusion)</b>，它能够自动捕捉您划定文字区域外的健康背景像素并进行自然的像素填充计算，100% 离线脱敏运行，让文字彻底消失而不上传任何第三方。
        </span>
      </div>
    </div>
  );
}
