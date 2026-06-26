import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // GitHub Pages 项目页地址：https://sohnyi.github.io/imgConver/
  // base 设为仓库名，避免打包后绝对路径资源 404。
  base: '/imgConver/',
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 3000,
  }
});
