import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.js'),
      name: 'VivoY3',
      formats: ['es'],
      fileName: 'vivo-y3',
    },
    rollupOptions: {
      // 由使用方自行提供、不打进产物的依赖写在这里
      external: [],
    },
  },
})