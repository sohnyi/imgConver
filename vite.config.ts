import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // GitHub Pages 部署在 https://sohnyi.github.io/imgConver/ 子路径下，
  // 需将 base 设为仓库名，否则打包后的绝对路径资源会 404。
  base: '/imgConver/',
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 3000,
  }
});
