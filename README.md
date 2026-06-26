<div align="center">

# 图像轻量化与隐私水印清洗系统

基于 HTML5 Canvas 的纯前端图片处理工具：高保真压缩、隐私模糊、版权水印、元数据脱敏审计。

所有处理均在浏览器本地（V8 引擎）完成，**图片不上传服务器**。

</div>

## 功能特性

- **图片压缩** —— 支持输出 WebP / JPEG，质量 30%–100% 可调，实时预估输出体积与压缩率
- **高斯隐私模糊** —— 整图模糊，保护面部或敏感文字背景
- **版权文字水印** —— 自定义文字，支持居中单张或全图平铺，可调字号、密度、透明度、配色
- **元数据脱敏审计** —— 以表格展示每张图片被清除的相机型号、镜头参数、GPS 定位、拍摄时间、软件指纹、内嵌缩略图等隐私字段
- **前后对比** —— 双面板并列 / 拖拽分割条两种对比视图，支持缩放
- **批量处理** —— 多图队列，一键批量应用参数并打包下载

> ⚠️ **重要说明**：元数据脱敏表格中的相机型号、GPS、软件指纹等值为**演示性模拟数据**——由文件名与文件大小的哈希确定性生成，并非真实解析自 EXIF。Canvas 重新编码在技术上会丢弃大部分 EXIF，但界面展示的具体数值是合成的。PSNR（视觉还原度）同样为基于压缩参数的经验估算值，非逐像素实测。如需真实 EXIF 解析，需引入 `exifr` 等库替换 `getPurgedMetadataForImage`。

## 技术栈

- **React 18** + **TypeScript**（严格模式）
- **Vite 6** —— 开发服务器与打包
- **Tailwind CSS v4** —— 通过 `@tailwindcss/vite` 插件，主题 token 在 `src/index.css` 的 `@theme` 中定义
- **lucide-react** —— 图标
- **HTML5 Canvas 2D API** —— 图像渲染、压缩、水印核心实现

## 本地运行

**前置要求**：Node.js 18+

```bash
npm install      # 安装依赖
npm run dev      # 启动开发服务器 → http://localhost:3000
```

## 构建与部署

```bash
npm run build    # 类型检查 + 打包，产物输出到 dist/
npm run preview  # 本地预览构建产物
npm run lint     # 仅类型检查（tsc --noEmit）
```

### 部署到 GitHub Pages

本项目已配置 GitHub Actions 自动部署（`.github/workflows/deploy.yml`）：

1. `vite.config.ts` 中 `base` 已设为 `/imgConver/`（仓库名子路径，避免资源 404）
2. push 到 `main` 分支即自动构建并发布
3. 需在仓库 **Settings → Pages → Source** 选择 **"GitHub Actions"**

部署地址：`https://<用户名>.github.io/imgConver/`

> 若改用自定义域名或 `<用户名>.github.io` 用户主页仓库，需将 `base` 改回 `'/'`。

## 项目结构

```
imgConver/
├── index.html              # 入口页面
├── vite.config.ts          # Vite 配置（含 base 路径）
├── tsconfig.json           # TypeScript 配置
├── package.json            # 依赖与脚本
├── .github/workflows/
│   └── deploy.yml          # GitHub Pages 自动部署工作流
└── src/
    ├── main.tsx            # 应用挂载入口
    ├── index.css           # 全局样式 + 字体 + Tailwind 主题
    └── App.tsx             # 整个应用（单文件，含全部逻辑与 UI）
```

> 应用未做组件拆分，全部逻辑集中在 `src/App.tsx`。核心概念：`ProcessedItem` 数据模型、**草稿态 vs 已应用态**双层参数状态（编辑不立即触发渲染，点"应用"后才重绘）、`executeItemRender` Canvas 渲染管线。详见 `CLAUDE.md`。

## 许可与说明

本项目所有功能均在浏览器本地完成，**未调用任何 AI / 后端接口**，图片处理全程不上传服务器。
