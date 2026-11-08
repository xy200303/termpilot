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
      minify: 'esbuild',
      rollupOptions: {
        output: {
          // 第三方按使用面拆开：首屏只等它需要的几块，升级时也更容易命中缓存。
          // 懒加载的库必须留给 Rollup 自己分块，不能被并进首屏 vendor。
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return undefined
            if (
              id.includes('monaco-editor') ||
              id.includes('@monaco-editor') ||
              id.includes('ironrdp-wasm') ||
              id.includes('@novnc') ||
              id.includes('material-icon-theme/dist/material-icons.json')
            ) {
              return undefined
            }
            if (id.includes('@xterm')) return 'xterm'
            if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) return 'react'
            if (id.includes('@radix-ui') || id.includes('/radix-ui/')) return 'radix'
            if (id.includes('i18next') || id.includes('react-i18next')) return 'i18n'
            if (id.includes('lucide-react') || id.includes('material-icon-theme')) return 'icons'
            return 'vendor'
          }
        }
      }
    },
    plugins: [react(), tailwindcss()]
  }
})
