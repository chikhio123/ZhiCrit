import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import fs from 'fs'

// Copy prompts to dist during build so electron-builder can bundle them
function copyPrompts() {
  return {
    name: 'copy-prompts',
    closeBundle() {
      const src = path.resolve(__dirname, 'src', 'prompts')
      const dest = path.resolve(__dirname, 'dist', 'prompts')
      fs.mkdirSync(dest, { recursive: true })
      for (const file of fs.readdirSync(src)) {
        fs.copyFileSync(path.join(src, file), path.join(dest, file))
      }
    }
  }
}

export default defineConfig({
  plugins: [vue(), copyPrompts()],
  base: './',
  root: '.',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  server: {
    port: parseInt(process.env.VITE_PORT || '5173'),
    strictPort: true
  }
})
