// 日志模块：自动在每条日志前加上调用所在函数的名称

/**
 * 日志模块自身产生的调用栈帧，解析函数名时跳过
 */
const INTERNAL_FRAMES = ['log', 'warn', 'error', 'success' ,'getCallerName']

/**
 * 判断一段文本是文件位置（如 vivo-y3.js:12）而不是函数名
 * @param {string} text 待判断的文本
 * @returns {boolean} 是文件位置时返回 true
 */
function isFileLocation(text) {
  return /\.js|#|:\d|[\\/]/.test(text)
}

/**
 * 校验并清理函数名
 * @param {string} raw 原始文本
 * @returns {string} 函数名；不是有效函数名（空、文件位置、匿名帧）时返回空字符串
 */
function toFunctionName(raw) {
  const name = String(raw).trim().replace(/\(\)$/, '')
  if (!name || isFileLocation(name)) return ''
  if (name === 'anonymous' || name === 'global' || name === 'undefined' || name === 'null') return ''
  return name
}

/**
 * 解析调用栈中的一行，取出函数名
 * @param {string} line 调用栈的一行
 * @returns {string} 函数名；该帧没有函数名（全局作用域、文件位置帧）时返回空字符串
 */
function parseFrameName(line) {
  const text = String(line).trim().replace(/^at\s+/, '')

  // Firefox 风格：funcName()@file.js:1:1
  const mozilla = /^([^@]*)@/.exec(text)
  if (mozilla) return toFunctionName(mozilla[1])

  // Rhino（AutoX.js 引擎）风格：at file.js:12 (funcName)
  // V8 风格：at funcName (file.js:12:1)
  const parened = /\(([^()]*)\)\s*$/.exec(text)
  if (parened) {
    // 括号里是函数名即为 Rhino 风格，否则括号里是文件位置，函数名在括号外
    const inner = toFunctionName(parened[1])
    return inner || toFunctionName(text.slice(0, parened.index))
  }

  // 没有括号的帧（全局作用域的末尾帧）没有函数名
  return ''
}

/**
 * 获取当前所在函数的名称
 * @returns {string} 函数名；无法获取时返回空字符串
 */
function getCallerName() {
  try {
    const stack = new Error().stack
    if (!stack) return ''
    const lines = String(stack).split('\n')
    for (let i = 0; i < lines.length; i++) {
      const name = parseFrameName(lines[i])
      // 跳过无效帧和日志模块自身的帧，第一个命中的就是调用方
      if (!name || INTERNAL_FRAMES.indexOf(name) >= 0) continue
      return name
    }
  } catch (e) {
    // 解析调用栈失败时不加前缀，不影响日志本身
  }
  return ''
}

/**
 * 输出普通日志，自动加上调用所在函数名
 * @param {...any} args 日志内容
 */
export function log(...args) {
  const name = getCallerName()
  if (name) args.unshift('[' + name + ']')
  console.log(...args)
}

/**
 * 输出警告日志，自动加上调用所在函数名
 * @param {...any} args 日志内容
 */
export function warn(...args) {
  const name = getCallerName()
  if (name) args.unshift('[' + name + ']')
  console.warn("⚠️", ...args)
}

/**
 * 输出错误日志，自动加上调用所在函数名
 * @param {...any} args 日志内容
 */
export function error(...args) {
  const name = getCallerName()
  if (name) args.unshift('[' + name + ']')
  console.error("❌", ...args)
}

/**
 * 输出成功日志，自动加上调用所在函数名
 * @param {...any} args 日志内容
 */
export function success(...args) {
  const name = getCallerName()
  if (name) args.unshift('[' + name + ']')
  console.log("✅", ...args)
}