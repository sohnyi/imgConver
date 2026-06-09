import React, { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface ImageSliderProps {
  originalSrc: string;
  processedSrc: string;
  originalLabel?: string;
  processedLabel?: string;
}

export default function ImageSlider({
  originalSrc,
  processedSrc,
  originalLabel = '原图 (Original)',
  processedLabel = '无元数据压缩版 (Optimized)',
}: ImageSliderProps) {
  const [sliderPosition, setSliderPosition] = useState<number>(50); // percentage 0-100
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  const [differenceSrc, setDifferenceSrc] = useState<string | null>(null);

  // Drag handlers
  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches[0]) {
      handleMove(e.touches[0].clientX);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (e.buttons === 1 || isResizing) {
      handleMove(e.clientX);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    handleMove(e.clientX);
  };

  useEffect(() => {
    const handleMouseUp = () => setIsResizing(false);
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Generate difference heatmap to prove "visually lossless" mathematically
  useEffect(() => {
    if (!originalSrc || !processedSrc) return;

    const img1 = new Image();
    const img2 = new Image();
    let loadedCount = 0;

    const generateHeatmap = () => {
      loadedCount++;
      if (loadedCount < 2) return;

      const canvas = document.createElement('canvas');
      const w = Math.min(img1.naturalWidth, 800);
      const h = Math.min(img1.naturalHeight, Math.round(800 * (img1.naturalHeight / img1.naturalWidth)));
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw original
      ctx.drawImage(img1, 0, 0, w, h);
      const data1 = ctx.getImageData(0, 0, w, h);

      // Draw processed onto temporary canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = w;
      tempCanvas.height = h;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;
      tempCtx.drawImage(img2, 0, 0, w, h);
      const data2 = tempCtx.getImageData(0, 0, w, h);

      // Create difference high-contrast map
      const diffData = ctx.createImageData(w, h);
      for (let i = 0; i < data1.data.length; i += 4) {
        // Calculate raw differences per channel
        const rDiff = Math.abs(data1.data[i] - data2.data[i]);
        const gDiff = Math.abs(data1.data[i + 1] - data2.data[i + 1]);
        const bDiff = Math.abs(data1.data[i + 2] - data2.data[i + 2]);
        
        // Exaggerate differences for visual mapping (multiply by 10x so subtle changes appear bright red)
        const totalDiff = Math.min(255, (rDiff + gDiff + bDiff) * 12);

        if (totalDiff > 2) {
          // Heat color scale: bright neon orange/red for diff
          diffData.data[i] = 239;     // R
          diffData.data[i+1] = 68;    // G
          diffData.data[i+2] = 68;    // B
          diffData.data[i+3] = totalDiff + 50; // alpha correlates to difference size
        } else {
          // Black or transparent for identical pixels
          diffData.data[i] = 30;
          diffData.data[i+1] = 41;
          diffData.data[i+2] = 59;
          diffData.data[i+3] = 180; // Keep dark backdrop
        }
      }

      ctx.putImageData(diffData, 0, 0);
      setDifferenceSrc(canvas.toDataURL());
    };

    img1.onload = generateHeatmap;
    img2.onload = generateHeatmap;
    img1.src = originalSrc;
    img2.src = processedSrc;
  }, [originalSrc, processedSrc]);

  return (
    <div className="relative flex flex-col space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
          对比效果 (Comparison Workspace)
        </span>
        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          className={`flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-full border transition-all duration-200 ${
            showHeatmap
              ? 'bg-black border-black text-white'
              : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300'
          }`}
          title="像素级差异高亮展示"
        >
          {showHeatmap ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          <span className="font-medium text-[11px]">{showHeatmap ? '正常对比' : '查看像素级差异热图'}</span>
        </button>
      </div>

      {showHeatmap ? (
        <div id="difference-map-view" className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 aspect-video flex items-center justify-center p-2">
          {differenceSrc ? (
            <div className="relative max-h-full max-w-full flex flex-col items-center justify-center">
              <img
                src={differenceSrc}
                alt="Difference Heatmap"
                className="rounded max-h-96 object-contain pointer-events-none"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-3 left-3 bg-white/95 border border-zinc-200 shadow-sm text-zinc-800 font-mono text-[10px] px-2.5 py-1 rounded-md backdrop-blur-md flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block animate-pulse" />
                <span>像素差异：高亮表示轻微压缩算法微调区 (已放大 12 倍显示差异)</span>
              </div>
            </div>
          ) : (
            <span className="text-zinc-400 text-sm">生成热图中...</span>
          )}
        </div>
      ) : (
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onTouchMove={handleTouchMove}
          className="relative select-none overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 aspect-video cursor-ew-resize flex items-center justify-center"
          id="interactive-comparison-slider"
        >
          {/* Left Side (Original) */}
          <div className="absolute inset-0 w-full h-full pointer-events-none flex items-center justify-center">
            <img
              src={originalSrc}
              alt="Original"
              className="max-h-full max-w-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="absolute top-3 left-3 z-10 bg-white/95 text-zinc-805 text-xs px-2.5 py-1 rounded-full border border-zinc-200 backdrop-blur-sm pointer-events-none shadow-sm font-medium">
            {originalLabel}
          </div>

          {/* Right Side (Compressed + Masked) */}
          <div
            className="absolute inset-y-0 right-0 overflow-hidden pointer-events-none flex items-center justify-center"
            style={{ left: `${sliderPosition}%` }}
          >
            <div
              className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none"
              style={{
                width: containerRef.current?.getBoundingClientRect().width || '100%',
                transform: `translateX(-${sliderPosition}%)`,
              }}
            >
              <img
                src={processedSrc}
                alt="Processed"
                className="max-h-full max-w-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          <div
            className="absolute top-3 right-3 z-10 bg-zinc-900/95 text-white text-xs px-2.5 py-1 rounded-full border border-zinc-800 backdrop-blur-sm pointer-events-none shadow-sm font-medium"
            style={{ opacity: sliderPosition < 85 ? 1 : (100 - sliderPosition) / 15 }}
          >
            {processedLabel}
          </div>

          {/* Sliding Bar Divider */}
          <div
            className="absolute inset-y-0 w-[2px] bg-zinc-400 pointer-events-none shadow-sm"
            style={{ left: `${sliderPosition}%` }}
          >
            {/* Grab Handle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border border-zinc-300 flex items-center justify-center shadow-md cursor-grab active:cursor-grabbing">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-3.5 h-3.5 text-zinc-500"
              >
                <path d="m15 18-6-6 6-6" />
                <path d="m9 18 6-6-6-6" />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
