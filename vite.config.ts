import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // 已配置自定义域名 www.sohnyi.com，Pages 从域名根提供服务，base 需为 '/'。
  // （若改回 sohnyi.github.io/imgConver/ 项目页，则需设为 '/imgConver/'）
  base: '/',
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 3000,
  }
});
