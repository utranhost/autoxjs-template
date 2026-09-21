import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import { transformSync } from '@babel/core'

// AutoX.js 使用 Rhino 引擎，对 ES6 语法（如扩展运算符）支持不完整，统一降级到 es5。
// 打包器最低只支持 es2015，所以 es5 的降级交给打包后的 Babel 处理。
function toEs5() {
  return {
    name: 'to-es5',
    renderChunk(code) {
      const { code: out } = transformSync(code, {
        babelrc: false,
        configFile: false,
        presets: [['@babel/preset-env', { targets: { ie: '11' }, modules: false }]],
        compact: false,
      })
      return { code: out, map: null }
    },
  }
}

export default defineConfig({
  build: {
    target: 'es2015',
    // 压缩会重新引入模板字符串等 ES6 语法，这里关闭压缩，产物保持可读
    minify: false,
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.js'),
      name: 'VivoY3',
      formats: ['es'],
      fileName: 'vivo-y3',
    },
    rollupOptions: {
      // 由使用方自行提供、不打进产物的依赖写在这里
      external: [],
      plugins: [toEs5()],
    },
  },
})