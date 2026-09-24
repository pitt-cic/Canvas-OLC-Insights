const DEBUG =
  typeof window !== 'undefined' &&
  (localStorage.getItem('QA_DEBUG') === 'true' ||
    window.location.hostname === 'localhost')

export const Log = {
  _t() {
    return new Date().toISOString().substring(11, 23)
  },

  info(cat: string, msg: string, data?: unknown) {
    if (!DEBUG) return
    console.log(`%c[${this._t()}] [${cat}]`, 'color:#0066cc;font-weight:bold', msg, data ?? '')
  },

  success(cat: string, msg: string, data?: unknown) {
    if (!DEBUG) return
    console.log(`%c[${this._t()}] [${cat}] ✓`, 'color:#00aa66;font-weight:bold', msg, data ?? '')
  },

  error(cat: string, msg: string, err?: unknown) {
    console.error(`%c[${this._t()}] [${cat}] ✗`, 'color:#cc3333;font-weight:bold', msg, err ?? '')
  },

  warn(cat: string, msg: string, data?: unknown) {
    if (!DEBUG) return
    console.warn(`%c[${this._t()}] [${cat}] ⚠`, 'color:#ff9900;font-weight:bold', msg, data ?? '')
  },

  api(method: string, endpoint: string, data?: unknown) {
    if (!DEBUG) return
    console.log(`%c[${this._t()}] [API]`, 'color:#9933ff;font-weight:bold', `${method} ${endpoint}`, data ?? '')
  },

  apiResponse(endpoint: string, status: number, data?: unknown) {
    if (!DEBUG) return
    const color = status >= 200 && status < 300 ? '#00aa66' : '#cc3333'
    console.log(`%c[${this._t()}] [API ←]`, `color:${color};font-weight:bold`, `${status} ${endpoint}`, data ?? '')
  },

  state(action: string, data?: unknown) {
    if (!DEBUG) return
    console.log(`%c[${this._t()}] [STATE]`, 'color:#cc6600;font-weight:bold', action, data ?? '')
  },

  ui(action: string, data?: unknown) {
    if (!DEBUG) return
    console.log(`%c[${this._t()}] [UI]`, 'color:#6600cc;font-weight:bold', action, data ?? '')
  },

  perf(label: string, ms: number) {
    if (!DEBUG) return
    console.log(`%c[${this._t()}] [PERF]`, 'color:#00cccc;font-weight:bold', `${label}: ${ms}ms`)
  },

  storage(action: string, key: string, val?: unknown) {
    if (!DEBUG) return
    console.log(`%c[${this._t()}] [STORAGE]`, 'color:#cc9900;font-weight:bold', `${action} ${key}`, val ?? '')
  },

  group(label: string) {
    if (!DEBUG) return
    console.group(`→ ${label}`)
  },

  groupEnd() {
    if (!DEBUG) return
    console.groupEnd()
  },
}

Log.info('ENV', 'App starting', {
  debug: DEBUG,
  viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'ssr',
})
