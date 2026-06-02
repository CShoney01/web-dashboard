import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 3000,
    proxy: {
      // 백엔드 API (Express :4000) 프록시 — 프로덕션에서는 Nginx가 담당
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/naver-news': {
        target: 'https://openapi.naver.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/naver-news/, '/v1/search/news.json'),
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
