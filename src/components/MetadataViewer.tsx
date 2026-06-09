import { KeyValuePair } from '../types';
import { ShieldCheck, MapPin, Camera, FileText, Trash2, Eye } from 'lucide-react';

interface MetadataViewerProps {
  originalTags: KeyValuePair[];
  hasSensitive: boolean;
  gpsCount: number;
  cameraCount: number;
}

export default function MetadataViewer({
  originalTags,
  hasSensitive,
  gpsCount,
  cameraCount,
}: MetadataViewerProps) {
  return (
    <div className="flex flex-col space-y-5 bg-white border border-zinc-205 rounded-3xl p-6 shadow-sm" id="metadata-security-dashboard">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-100 gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-800 flex items-center space-x-2">
            <span>原图元数据透视 & 脱敏报告</span>
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            EXIF & GPS 信息包含相机型号、拍摄时间、地理定位等高敏感隐私
          </p>
        </div>
        <div className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-50 text-emerald-750 text-xs rounded-full font-mono border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="font-semibold text-[10px]">已深度清洗 (Stripped)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Metric 1 */}
        <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 flex items-center space-x-3.5">
          <div className={`p-2 rounded-xl ${gpsCount > 0 ? 'bg-rose-550/10 text-rose-600' : 'bg-zinc-200/80 text-zinc-500'}`}>
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">GPS 地理定位</div>
            <div className={`text-xs font-bold font-mono mt-0.5 ${gpsCount > 0 ? 'text-rose-600' : 'text-zinc-600'}`}>
              {gpsCount > 0 ? `发现 ${gpsCount} 处定位标记` : '未包含定位'}
            </div>
            <div className="text-[10px] text-emerald-600 mt-0.5 font-bold flex items-center space-x-1">
              <Trash2 className="w-2.5 h-2.5" />
              <span>净化后已移除</span>
            </div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 flex items-center space-x-3.5">
          <div className={`p-2 rounded-xl ${cameraCount > 0 ? 'bg-amber-600/10 text-amber-750' : 'bg-zinc-200/80 text-zinc-500'}`}>
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">相机与镜头参数</div>
            <div className="text-xs font-bold font-mono mt-0.5 text-zinc-650">
              {cameraCount > 0 ? `发现 ${cameraCount} 项摄影参数` : '未包含硬件参数'}
            </div>
            <div className="text-[10px] text-emerald-600 mt-0.5 font-bold flex items-center space-x-1">
              <Trash2 className="w-2.5 h-2.5" />
              <span>净化后已移除</span>
            </div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 flex items-center space-x-3.5">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-650">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">其他描述性元数据</div>
            <div className="text-xs font-bold font-mono mt-0.5 text-zinc-650">
              {originalTags.length - gpsCount - cameraCount > 0 
                ? `共 ${originalTags.length - gpsCount - cameraCount} 项系统标签` 
                : '无其他系统标记'}
            </div>
            <div className="text-[10px] text-emerald-600 mt-0.5 font-bold flex items-center space-x-1">
              <Trash2 className="w-2.5 h-2.5" />
              <span>净化后已移除</span>
            </div>
          </div>
        </div>
      </div>

      {originalTags.length > 0 ? (
        <div className="space-y-2 mt-2">
          <div className="text-xs font-bold text-zinc-600 flex items-center space-x-1.5 font-mono uppercase tracking-wider">
            <Eye className="w-3.5 h-3.5" />
            <span>检测到的原图关键元数据列表：</span>
          </div>
          <div className="max-h-48 overflow-y-auto border border-zinc-200 rounded-2xl divide-y divide-zinc-200 font-mono text-[11px] bg-zinc-50">
            {originalTags.map((tag, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-2 hover:bg-zinc-100/60">
                <div className="flex items-center space-x-2">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wider ${
                    tag.category === 'GPS' 
                      ? 'bg-rose-50 text-rose-600 border border-rose-200' 
                      : tag.category === 'Camera'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-zinc-200 text-zinc-700 border border-zinc-300'
                  }`}>
                    {tag.category === 'GPS' ? 'GPS' : tag.category === 'Camera' ? 'CAMERA' : 'EXIF'}
                  </span>
                  <span className="text-zinc-700 font-medium">{tag.key}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 max-w-xs sm:max-w-md md:max-w-xl">
                  <span className="text-zinc-400 truncate line-through decoration-rose-500/60 font-mono text-[10px]" title="原图元数据：即将净化">
                    {tag.value}
                  </span>
                  <span className="text-[9px] text-emerald-600 font-bold shrink-0 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                    [已擦除]
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 text-center text-zinc-400 text-xs font-mono">
          💡 该图无嵌入式摄影元数据或已被提前清理！
          <br />
          <span className="text-emerald-600 font-semibold mt-1 inline-block">
            不过别担心，程序仍使用画布二次重构法确保输出的最终文件格式绝对 100% 无元数据泄漏。
          </span>
        </div>
      )}
    </div>
  );
}
