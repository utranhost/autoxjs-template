import { relative, resolve } from 'node:path'
import { defineConfig } from 'vite'
import { transformSync } from '@babel/core'

const SRC_DIR = resolve(import.meta.dirname, 'src')

/**
 * 下划线/中划线命名转大驼峰，如 apps_op -> AppsOp
 * @param {string} text 原始名称
 * @returns {string} 大驼峰名称
 */
function toPascal(text) {
  return text
    .split(/[_-]/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join('')
}

/**
 * 计算模块名前缀，如 src/tools/recent_manager.js -> "Tools_RecentManager_"
 * @param {string} id 模块的绝对路径
 * @returns {string} 前缀；不属于 src 下的模块返回空字符串
 */
function modulePrefix(id) {
  const rel = relative(SRC_DIR, id).replace(/\\/g, '/')
  if (!rel || rel.startsWith('..')) return ''
  // 日志模块自身的函数名用于过滤调用栈帧（见 src/logger.js 的 INTERNAL_FRAMES），不参与重命名
  if (rel === 'logger.js') return ''

  return rel.replace(/\.js$/, '').split('/').map(toPascal).join('_') + '_'
}

/**
 * 用 Babel 把模块内所有函数声明改名为「前缀+原名」
 *
 * 借助 Babel 的作用域重命名，函数声明、递归调用、嵌套函数内的引用会一起改掉，
 * 不会留下找不到定义的短名。
 * @param {string} code 模块源码
 * @param {string} prefix 模块前缀
 * @returns {string} 改名后的源码
 */
function prefixFunctionNames(code, prefix) {
  const { code: out } = transformSync(code, {
    babelrc: false,
    configFile: false,
    plugins: [
      {
        visitor: {
          FunctionDeclaration(path) {
            const id = path.node.id
            if (!id || id.name.indexOf(prefix) === 0) return

            const binding = path.scope.getBinding(id.name)
            // 只改这个声明自己注册的绑定，同名变量不碰
            if (!binding || binding.path.node !== path.node) return

            binding.scope.rename(id.name, prefix + id.name)
          },
        },
      },
    ],
  })
  return out
}

/**
 * 给模块内每个函数名加上「目录_模块_」前缀，例如 src/tools/common.js 的 wakeAndUnlock
 * 在产物里叫 Tools_Common_wakeAndUnlock，日志前缀就能直接看出函数出处。
 * 导出名（模块命名空间上的属性名）保持不变，调用方写法不受影响。
 */
function renameFunctions() {
  return {
    name: 'rename-functions',
    enforce: 'pre',
    transform(code, id) {
      const prefix = modulePrefix(id)
      if (!prefix) return

      // 先摘掉 export 并记下导出名，改名后再用「新名 as 原名」导出，保住对外的接口名
      const exported = []
      const withoutExport = code.replace(/export\s+function\s+([A-Za-z_$][\w$]*)/g, (_, name) => {
        exported.push(name)
        return 'function ' + name
      })

      const renamed = prefixFunctionNames(withoutExport, prefix)
      if (exported.length === 0) return renamed

      const specifiers = exported.map((name) => prefix + name + ' as ' + name).join(', ')
      return renamed + '\nexport { ' + specifiers + ' }\n'
    },
  }
}

// AutoX.js 使用 Rhino 引擎，对 ES6 语法（如扩展运算符）支持不完整，统一降级到 es5。
// 打包器最低只支持 es2015，所以 es5 的降级交给打包后的 Babel 处理。
function toEs5() {
  return {
    name: 'to-es5',
    renderChunk(code) {
      const { code: out } = transformSync(code, {
        babelrc: false,
        configFile: false,
        comments: false,
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
    // 压缩会把字符串拼接重新优化成模板字符串等 ES6 语法，注释由 Babel 在降级时一并去掉
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
      plugins: [renameFunctions(), toEs5()],
    },
  },
})