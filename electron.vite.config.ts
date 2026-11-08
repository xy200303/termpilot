import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        external: ['node:sqlite']
      }
    }
  },
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer/src')
      }
    },
    build: {
      // 生产包默认不压缩，11 MB 的首屏脚本会拖慢启动
      minify: 'esbuild'
    },
    plugins: [react(), tailwindcss()]
  }
})
